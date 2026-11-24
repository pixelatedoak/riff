'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SocialStats = { likes: number; comments: number; reposts: number; branches: number; liked: boolean; saved: boolean; reposted: boolean }
type SocialContextValue = {
    viewerId: string | null
    statsByRiff: Record<string, SocialStats>
    followingByAuthor: Record<string, boolean>
    updateStats: (riffId: string, update: (value: SocialStats) => SocialStats) => void
    setFollowing: (authorId: string, value: boolean) => void
    loadError: string
    loading: boolean
}

const SocialContext = createContext<SocialContextValue | null>(null)
const zeroStats: SocialStats = { likes: 0, comments: 0, reposts: 0, branches: 0, liked: false, saved: false, reposted: false }

export function RiffSocialProvider({ riffIds, authorIds, children }: { riffIds: string[]; authorIds: string[]; children: ReactNode }) {
    const [viewerId, setViewerId] = useState<string | null>(null)
    const [statsByRiff, setStatsByRiff] = useState<Record<string, SocialStats>>({})
    const [followingByAuthor, setFollowingByAuthor] = useState<Record<string, boolean>>({})
    const [loadErrorState, setLoadErrorState] = useState<{ key: string; message: string } | null>(null)
    const [loadedKey, setLoadedKey] = useState('')
    const supabase = useMemo(() => createClient(), [])
    const requestKey = `${riffIds.join(',')}|${authorIds.join(',')}`

    useEffect(() => {
        let active = true
        void (async () => {
            try {
            const [{ data: { user } }, statsResult] = await Promise.all([
                supabase.auth.getUser(),
                riffIds.length ? supabase.rpc('get_riff_social_stats', { p_riff_ids: riffIds }) : Promise.resolve({ data: [], error: null }),
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
            if (user && authorIds.length) {
                const { data, error } = await supabase.from('riff_follows').select('followed_id').eq('follower_id', user.id).in('followed_id', authorIds.filter((id) => id !== user.id))
                if (error) throw error
                if (active) setFollowingByAuthor(Object.fromEntries((data ?? []).map((row) => [row.followed_id, true])))
            }
            } catch (error) {
                if (active) setLoadErrorState({ key: requestKey, message: error instanceof Error ? error.message : 'Social features could not load. Run the Riff social upgrade SQL and retry.' })
            } finally {
                if (active) setLoadedKey(requestKey)
            }
        })()
        return () => { active = false }
    }, [authorIds, riffIds, requestKey, supabase])

    const loadError = loadErrorState?.key === requestKey ? loadErrorState.message : ''
    const loading = loadedKey !== requestKey

    const value = useMemo<SocialContextValue>(() => ({
        viewerId,
        statsByRiff,
        followingByAuthor,
        loadError,
        loading,
        updateStats: (riffId, update) => setStatsByRiff((current) => ({ ...current, [riffId]: update(current[riffId] ?? zeroStats) })),
        setFollowing: (authorId, followed) => setFollowingByAuthor((current) => ({ ...current, [authorId]: followed })),
    }), [viewerId, statsByRiff, followingByAuthor, loadError, loading])

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
