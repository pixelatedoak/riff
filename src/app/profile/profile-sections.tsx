'use client'

import { useEffect, useMemo, useState } from 'react'
import { RiffPosts } from '@/app/riffs/riff-tree'
import type { RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import type { RiffAttachment } from '@/lib/riffs/types'
import { createClient } from '@/lib/supabase/client'
import * as Tabs from '@radix-ui/react-tabs'

export function ProfileSections({ sections, profileName, profileId, posts = [], authors = [], attachments = [], sortOrder = 'Newest first' }: {
    sections: string[]
    profileName?: string
    profileId: string
    posts?: RiffRecord[]
    authors?: RiffAuthor[]
    attachments?: RiffAttachment[]
    sortOrder?: 'Newest first' | 'Oldest first'
}) {
    const [activeSection, setActiveSection] = useState(sections[0] ?? 'Posts')
    const [activityPosts, setActivityPosts] = useState<RiffRecord[]>([])
    const [activityAuthors, setActivityAuthors] = useState<RiffAuthor[]>([])
    const [activityAttachments, setActivityAttachments] = useState<RiffAttachment[]>([])
    const [activityLoadedFor, setActivityLoadedFor] = useState('')
    const [activityError, setActivityError] = useState<{ section: string; message: string } | null>(null)
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        if (!['Reposts', 'Liked', 'Saved'].includes(activeSection)) return
        let current = true
        void (async () => {
            if (activeSection === 'Saved') {
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.id !== profileId) {
                    if (current) { setActivityPosts([]); setActivityAuthors([]); setActivityAttachments([]) }
                    return
                }
            }
            const activity = activeSection === 'Reposts'
                ? await supabase.from('riff_reposts').select('riff_id, created_at').eq('user_id', profileId).order('created_at', { ascending: false }).limit(100)
                : activeSection === 'Liked'
                    ? await supabase.from('riff_likes').select('riff_id, created_at').eq('user_id', profileId).order('created_at', { ascending: false }).limit(100)
                    : await supabase.from('riff_saves').select('riff_id, created_at').eq('user_id', profileId).order('created_at', { ascending: false }).limit(100)
            if (activity.error) throw activity.error
            const ids = [...new Set((activity.data ?? []).map((row) => row.riff_id))]
            if (!ids.length) {
                if (current) { setActivityPosts([]); setActivityAuthors([]); setActivityAttachments([]) }
                return
            }
            const { data: postData, error: postError } = await supabase.from('riffs')
                .select('id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at')
                .in('id', ids).is('deleted_at', null)
            if (postError) throw postError
            const nextPosts = (postData ?? []).sort((left, right) => ids.indexOf(left.id) - ids.indexOf(right.id)) as RiffRecord[]
            const authorIds = [...new Set(nextPosts.map((post) => post.author_id))]
            const [{ data: authorData }, { data: attachmentData }] = await Promise.all([
                authorIds.length ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', authorIds) : Promise.resolve({ data: [] }),
                supabase.from('riff_attachments').select('id, riff_id, filename, storage_path, public_url, mime_type, byte_size, media_filter, sticker, sort_order').in('riff_id', ids).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
            ])
            if (current) {
                setActivityPosts(nextPosts)
                setActivityAuthors((authorData ?? []) as RiffAuthor[])
                setActivityAttachments((attachmentData ?? []) as RiffAttachment[])
            }
        })().catch((error: unknown) => {
            if (current) setActivityError({ section: activeSection, message: error instanceof Error ? error.message : 'Could not load this activity.' })
        }).finally(() => { if (current) setActivityLoadedFor(activeSection) })
        return () => { current = false }
    }, [activeSection, profileId, supabase])
    const sectionName = activeSection.toLowerCase()
    const isActivityTab = ['Reposts', 'Liked', 'Saved'].includes(activeSection)
    const activityLoading = isActivityTab && activityLoadedFor !== activeSection
    const visibleActivityError = activityError?.section === activeSection ? activityError.message : ''
    const sourcePosts = isActivityTab ? activityPosts : posts
    const visiblePosts = sourcePosts
        .filter((post) => {
            if (activeSection === 'Riffs') return post.kind === 'riff'
            if (activeSection === 'Black Riffs') return post.kind === 'black'
                    if (activeSection === 'Posts') return true
                    if (isActivityTab) return true
            return false
        })
        .sort((left, right) => sortOrder === 'Newest first'
            ? (isActivityTab ? 0 : right.created_at.localeCompare(left.created_at))
            : (isActivityTab ? 0 : left.created_at.localeCompare(right.created_at)))

    return (
        <Tabs.Root value={activeSection} onValueChange={setActiveSection}>
            <Tabs.List aria-label="Profile activity sections" className="mt-5 flex gap-1 overflow-x-auto border-b border-riff-outline pb-px">
                {sections.map((section) => (
                    <Tabs.Trigger
                        key={section}
                        value={section}
                        className={`shrink-0 border-b-2 px-3.5 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-riff-accent ${activeSection === section ? 'border-riff-accent text-riff-accent-soft' : 'border-transparent text-riff-faint hover:text-riff-text'}`}
                    >
                        {section}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>

            <Tabs.Content value={activeSection} className="min-h-40 py-5 focus-visible:outline-none">
                {visiblePosts.length > 0 ? (
                    <RiffPosts riffs={visiblePosts} authors={isActivityTab ? activityAuthors : authors} attachments={(isActivityTab ? activityAttachments : attachments).filter((attachment) => visiblePosts.some((post) => post.id === attachment.riff_id))} />
                ) : activityLoading ? (
                    <div role="status" className="py-10 text-center text-sm text-zinc-500">Loading {sectionName}…</div>
                ) : (
                    <div className="flex min-h-32 flex-col items-center justify-center px-5 py-9 text-center">
                        <h3 className="text-sm font-medium text-zinc-300">No {sectionName} yet</h3>
                        <p className="mt-1.5 text-sm text-zinc-500">
                            {profileName ? `${profileName}'s ${sectionName} will appear here.` : `When you have ${sectionName}, they’ll appear here.`}
                        </p>
                    </div>
                )}
                {visibleActivityError && <p role="alert" className="mt-3 text-center text-sm text-rose-200">{visibleActivityError}</p>}
            </Tabs.Content>
        </Tabs.Root>
    )
}
