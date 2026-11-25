'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RiffAttachment, RiffAuthor, RiffRecord } from '@/lib/riffs/types'

export type SocialStats = { likes: number; comments: number; reposts: number; branches: number; liked: boolean; saved: boolean; reposted: boolean }
export type OriginalRiff = { post: RiffRecord; author?: RiffAuthor; attachments: RiffAttachment[] }
type SocialContextValue = {
    viewerId: string | null
    statsByRiff: Record<string, SocialStats>
    followingByAuthor: Record<string, boolean>
    originalById: Record<string, OriginalRiff>
    updateStats: (riffId: string, update: (value: SocialStats) => SocialStats) => void
    setFollowing: (authorId: string, value: boolean) => void
    loadError: string
    loading: boolean
}

const SocialContext = createContext<SocialContextValue | null>(null)
const zeroStats: SocialStats = { likes: 0, comments: 0, reposts: 0, branches: 0, liked: false, saved: false, reposted: false }

export function RiffSocialProvider({ riffIds, authorIds, parentIds = [], children }: { riffIds: string[]; authorIds: string[]; parentIds?: string[]; children: ReactNode }) {
    const [viewerId, setViewerId] = useState<string | null>(null)
    const [statsByRiff, setStatsByRiff] = useState<Record<string, SocialStats>>({})
    const [followingByAuthor, setFollowingByAuthor] = useState<Record<string, boolean>>({})
    const [originalById, setOriginalById] = useState<Record<string, OriginalRiff>>({})
    const [loadErrorState, setLoadErrorState] = useState<{ key: string; message: string } | null>(null)
    const [loadedKey, setLoadedKey] = useState('')
    const supabase = useMemo(() => createClient(), [])
    const requestKey = `${riffIds.join(',')}|${authorIds.join(',')}|${parentIds.join(',')}`

    useEffect(() => {
        let active = true
        void (async () => {
            try {
            const [{ data: { user } }, statsResult, originalResult] = await Promise.all([
                supabase.auth.getUser(),
                riffIds.length ? supabase.rpc('get_riff_social_stats', { p_riff_ids: riffIds }) : Promise.resolve({ data: [], error: null }),
                parentIds.length ? supabase.from('riffs').select('id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at').in('id', [...new Set(parentIds)]).is('deleted_at', null) : Promise.resolve({ data: [], error: null }),
            ])
            if (statsResult.error) throw statsResult.error
            if (!active) return
            setViewerId(user?.id ?? null)
            const stats: Record<string, SocialStats> = {}
            for (const row of statsResult.data ?? []) {
                stats[row.riff_id] = {
                    likes: Number(row.likes), comments: Number(row.comments), reposts: Number(row.reposts), branches: Number(row.branches),
                    liked: row.liked, saved: row.saved, reposted: row.reposted,
                }
            }
            setStatsByRiff(stats)
            const originals = (originalResult.data ?? []) as RiffRecord[]
            if (originals.length) {
                const originalAuthorIds = [...new Set(originals.map((post) => post.author_id))]
                const originalIds = originals.map((post) => post.id)
                const [profileResult, attachmentResult] = await Promise.all([
                    supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', originalAuthorIds),
                    supabase.from('riff_attachments').select('id, riff_id, filename, storage_path, public_url, mime_type, byte_size, media_filter, sticker, sort_order').in('riff_id', originalIds).order('sort_order', { ascending: true }),
                ])
                if (active) {
                    const profileMap = new Map(((profileResult.data ?? []) as RiffAuthor[]).map((profile) => [profile.id, profile]))
                    const attachmentsByRiff = new Map<string, RiffAttachment[]>()
                    for (const attachment of (attachmentResult.data ?? []) as RiffAttachment[]) attachmentsByRiff.set(attachment.riff_id, [...(attachmentsByRiff.get(attachment.riff_id) ?? []), attachment])
                    setOriginalById(Object.fromEntries(originals.map((post) => [post.id, { post, author: profileMap.get(post.author_id), attachments: attachmentsByRiff.get(post.id) ?? [] }])))
                }
            } else if (active) setOriginalById({})
            if (user && authorIds.length) {
                const { data, error } = await supabase.from('riff_follows').select('followed_id').eq('follower_id', user.id).in('followed_id', authorIds.filter((id) => id !== user.id))
                if (error) throw error
                if (active) {
                    const knownAuthors = authorIds.filter((id) => id !== user.id)
                    const followingState = Object.fromEntries(knownAuthors.map((id) => [id, false]))
                    for (const row of data ?? []) followingState[row.followed_id] = true
                    setFollowingByAuthor(followingState)
                }
            }
            } catch (error) {
                if (active) setLoadErrorState({ key: requestKey, message: error instanceof Error ? error.message : 'Social features could not load. Run the Riff social upgrade SQL and retry.' })
            } finally {
                if (active) setLoadedKey(requestKey)
            }
        })()
        return () => { active = false }
    }, [authorIds, parentIds, riffIds, requestKey, supabase])

    const loadError = loadErrorState?.key === requestKey ? loadErrorState.message : ''
    const loading = loadedKey !== requestKey

    const value = useMemo<SocialContextValue>(() => ({
        viewerId,
        statsByRiff,
        followingByAuthor,
        originalById,
        loadError,
        loading,
        updateStats: (riffId, update) => setStatsByRiff((current) => ({ ...current, [riffId]: update(current[riffId] ?? zeroStats) })),
        setFollowing: (authorId, followed) => setFollowingByAuthor((current) => ({ ...current, [authorId]: followed })),
    }), [viewerId, statsByRiff, followingByAuthor, originalById, loadError, loading])

    return <SocialContext.Provider value={value}>{loadError && <p role="alert" className="mb-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100">Social features could not load: {loadError}</p>}{children}</SocialContext.Provider>
}

export function useRiffSocial(riffId: string, authorId: string) {
    const context = useContext(SocialContext)
    if (!context) throw new Error('RiffSocialActions must be rendered inside RiffSocialProvider')
    return {
        viewerId: context.viewerId,
        loadError: context.loadError,
        loading: context.loading,
        stats: context.statsByRiff[riffId] ?? zeroStats,
        following: context.followingByAuthor[authorId] ?? false,
        updateStats: (update: (value: SocialStats) => SocialStats) => context.updateStats(riffId, update),
        setFollowing: (followed: boolean) => context.setFollowing(authorId, followed),
    }
}

export function useRiffFollow(authorId: string) {
    const context = useContext(SocialContext)
    if (!context) throw new Error('RiffFollowButton must be rendered inside RiffSocialProvider')
    return {
        viewerId: context.viewerId,
        following: context.followingByAuthor[authorId] ?? false,
        loading: context.loading,
        loadError: context.loadError,
        setFollowing: (followed: boolean) => context.setFollowing(authorId, followed),
    }
}

export function useOriginalRiff(parentId: string) {
    const context = useContext(SocialContext)
    if (!context) throw new Error('RiffOriginalQuote must be rendered inside RiffSocialProvider')
    return context.originalById[parentId]
}
