'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { createClient } from '@/lib/supabase/client'
import { useRiffFollow, useRiffSocial } from '@/app/riffs/riff-social-provider'
import { Icon } from '@/components/icon'
import { Button } from '@/components/ui/button'
import { MarkdownEditor } from '@/components/markdown-editor'
import { Textarea } from '@/components/ui/input'

type CommentRow = { id: string; author_id: string; content: string; created_at: string }

export function RiffFollowButton({ authorId }: { authorId: string }) {
    const supabase = createClient()
    const { viewerId, following, loading, loadError, setFollowing } = useRiffFollow(authorId)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')

    if (!viewerId || viewerId === authorId) return null

    async function toggleFollow() {
        if (busy || loading || loadError) return
        setBusy(true)
        setMessage('')
        try {
            const result = following
                ? await supabase.from('riff_follows').delete().eq('follower_id', viewerId).eq('followed_id', authorId)
                : await supabase.from('riff_follows').insert({ follower_id: viewerId, followed_id: authorId })
            if (result.error?.code === '23505' && !following) setFollowing(true)
            else if (result.error) setMessage(result.error.message)
            else setFollowing(!following)
        } catch {
            setMessage('Could not update the follow. Check your connection and try again.')
        } finally {
            setBusy(false)
        }
    }

    return <button type="button" title={message || undefined} disabled={busy || loading || Boolean(loadError)} onClick={() => void toggleFollow()} className={`shrink-0 text-xs font-medium transition hover:text-riff-accent disabled:opacity-50 ${following ? 'text-riff-muted' : 'text-riff-accent'}`}>{busy ? '…' : following ? 'Following' : 'Follow'}</button>
}

export function RiffSocialActions({ riffId, authorId, content, kind, commentsEnabled, allowBranches, hasAttachments, floating = false }: {
    riffId: string
    authorId: string
    content: string
    kind: 'riff' | 'black'
    commentsEnabled: boolean
    allowBranches: boolean
    hasAttachments: boolean
    floating?: boolean
}) {
    const supabase = createClient()
    const router = useRouter()
    const { viewerId, stats, updateStats, loading } = useRiffSocial(riffId, authorId)
    const [busy, setBusy] = useState(false)
    const [panel, setPanel] = useState<'edit' | 'report' | null>(null)
    const [comments, setComments] = useState<(CommentRow & { author_name: string })[]>([])
    const [commentsLoading, setCommentsLoading] = useState(false)
    const [commentsLoaded, setCommentsLoaded] = useState(false)
    const [commentsOpen, setCommentsOpen] = useState(false)
    const [commentsError, setCommentsError] = useState('')
    const [commentText, setCommentText] = useState('')
    const [editedText, setEditedText] = useState('')
    const [nextCommentsEnabled, setNextCommentsEnabled] = useState(commentsEnabled)
    const [nextAllowBranches, setNextAllowBranches] = useState(allowBranches)
    const [message, setMessage] = useState('')
    const [reportTarget, setReportTarget] = useState<{ type: 'riff' | 'comment'; id: string }>({ type: 'riff', id: riffId })
    const [reportReason, setReportReason] = useState('')
    const [reportDetails, setReportDetails] = useState('')
    const [postCardHeight, setPostCardHeight] = useState(0)
    const [overflowExpandedAtHeight, setOverflowExpandedAtHeight] = useState<number | null>(null)
    const actionRailRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const rail = actionRailRef.current
        const layout = rail?.closest('[data-riff-post-layout]')
        const card = layout?.querySelector<HTMLElement>('[data-riff-post-card]')
        const content = layout?.querySelector<HTMLElement>('[data-riff-post-content]')
        if (!floating || !card || !content) return
        const measure = () => {
            const cardStyle = getComputedStyle(card)
            const verticalInsets = [cardStyle.paddingTop, cardStyle.paddingBottom, cardStyle.borderTopWidth, cardStyle.borderBottomWidth]
                .reduce((total, value) => total + Number.parseFloat(value || '0'), 0)
            setPostCardHeight(Math.ceil(content.getBoundingClientRect().height + verticalInsets))
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(content)
        return () => observer.disconnect()
    }, [floating])

    async function toggle(table: 'riff_likes' | 'riff_saves' | 'riff_reposts', active: boolean, key: 'liked' | 'saved' | 'reposted', countKey?: 'likes' | 'reposts') {
        if (!viewerId) { setMessage('Sign in to use this feature.'); return }
        setBusy(true)
        setMessage('')
        const query = supabase.from(table)
        const result = active
            ? await query.delete().eq('riff_id', riffId).eq('user_id', viewerId)
            : await query.insert({ riff_id: riffId, user_id: viewerId })
        if (result.error) setMessage(result.error.message)
        else updateStats((value) => ({ ...value, [key]: !active, ...(countKey ? { [countKey]: Math.max(0, value[countKey] + (active ? -1 : 1)) } : {}) }))
        setBusy(false)
    }

    async function share() {
        const url = `${window.location.origin}/r/${riffId}`
        try {
            if (navigator.share) await navigator.share({ title: 'Riff', url })
            else { await navigator.clipboard.writeText(url); setMessage('Link copied.') }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
            try { await navigator.clipboard.writeText(url); setMessage('Link copied.') }
            catch { setMessage('Could not share or copy the link in this browser.') }
        }
    }

    async function loadComments(force = false) {
        if ((!force && commentsLoaded) || commentsLoading) return
        setCommentsError('')
        setCommentsLoading(true)
        try {
            const { data, error } = await supabase.from('riff_comments').select('id, author_id, content, created_at').eq('riff_id', riffId).order('created_at', { ascending: false }).limit(100)
            if (error) throw error
            const rows = ((data ?? []) as CommentRow[]).reverse()
            const ids = [...new Set(rows.map((row) => row.author_id))]
            const { data: profiles, error: profilesError } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [], error: null }
            if (profilesError) throw profilesError
            const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || `@${profile.username || 'user'}`]))
            setComments(rows.map((row) => ({ ...row, author_name: names.get(row.author_id) ?? 'Riff user' })))
            setCommentsLoaded(true)
        } catch (error) {
            setCommentsError(`Could not load comments: ${error instanceof Error ? error.message : 'Check your connection and try again.'}`)
        } finally {
            setCommentsLoading(false)
        }
    }

    function toggleComments() {
        if (commentsOpen) {
            setCommentsOpen(false)
            return
        }
        setCommentsOpen(true)
        void loadComments()
    }

    async function removeComment(comment: CommentRow) {
        if (!viewerId) return
        setBusy(true)
        const { error } = await supabase.from('riff_comments').delete().eq('id', comment.id).eq('author_id', viewerId)
        if (error) setMessage(error.message)
        else {
            setComments((rows) => rows.filter((row) => row.id !== comment.id))
            updateStats((value) => ({ ...value, comments: Math.max(0, value.comments - 1) }))
        }
        setBusy(false)
    }

    async function submitReport(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!viewerId || reportReason.length < 3) { setMessage('Choose a reason for your report.'); return }
        setBusy(true)
        const reason = [reportReason, reportDetails.trim()].filter(Boolean).join(': ').slice(0, 500)
        const { error } = await supabase.from('riff_reports').insert({ reporter_id: viewerId, target_type: reportTarget.type, target_id: reportTarget.id, reason })
        if (error) setMessage(error.code === '23505' ? 'You already reported this item.' : error.message)
        else { setPanel(null); setMessage('Report sent for review.') }
        setBusy(false)
    }

    async function addComment(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!viewerId || !commentText.trim()) { setMessage(viewerId ? 'Write a comment first.' : 'Sign in to comment.'); return }
        setBusy(true)
        const { data, error } = await supabase.from('riff_comments').insert({ riff_id: riffId, author_id: viewerId, content: commentText.trim() }).select('id, author_id, content, created_at').single()
        if (error) setMessage(error.message)
        else if (data) {
            setComments((value) => [...value, { ...data, author_name: 'You' }])
            updateStats((value) => ({ ...value, comments: value.comments + 1 }))
            setCommentText('')
        }
        setBusy(false)
    }

    async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!editedText.trim() && !hasAttachments) { setMessage('Add text or attach a file before saving.'); return }
        setBusy(true)
        const { error } = await supabase.from('riffs').update({ content: editedText.trim(), comments_enabled: nextCommentsEnabled, allow_branches: nextAllowBranches }).eq('id', riffId).eq('author_id', viewerId)
        if (error) setMessage(error.message)
        else { setPanel(null); router.refresh() }
        setBusy(false)
    }

    async function deletePost() {
        if (!viewerId || !window.confirm('Delete this post and its branches? This cannot be undone.')) return
        setBusy(true)
        const { data: deleted, error } = await supabase.rpc('soft_delete_riff', { p_riff_id: riffId })
        if (error || !deleted) setMessage(error?.message ?? 'Could not delete this Riff.')
        else {
            const { data: files } = await supabase.from('riff_attachments').select('id, storage_path').eq('riff_id', riffId)
            if (files?.length) {
                const { error: storageError } = await supabase.storage.from('riff-files').remove(files.map((file) => file.storage_path))
                if (!storageError) await supabase.from('riff_attachments').delete().in('id', files.map((file) => file.id))
                else setMessage('Riff deleted. Its files could not be removed and may need storage cleanup.')
            }
            router.refresh()
            if (window.location.pathname === `/r/${riffId}`) router.push('/')
        }
        setBusy(false)
    }

    const actionItems = [
        ...(kind === 'riff' && allowBranches ? [{ key: 'riff-off', label: 'Riff off', disabled: false, icon: 'flame' as const, activeClass: '', gold: true, onClick: () => router.push(`/create?parent=${riffId}`) }] : []),
        { key: 'like', label: stats.liked ? 'Unlike' : 'Like', count: stats.likes, pressed: stats.liked, disabled: busy || loading, icon: 'heart' as const, activeClass: 'text-rose-300', onClick: () => void toggle('riff_likes', stats.liked, 'liked', 'likes') },
        ...(commentsEnabled ? [{ key: 'comment', label: commentsOpen ? 'Hide comments' : 'Comments', count: stats.comments, pressed: commentsOpen, disabled: loading, icon: 'comment' as const, activeClass: 'text-riff-accent', onClick: toggleComments }] : []),
        { key: 'repost', label: stats.reposted ? 'Undo repost' : 'Repost', count: stats.reposts, pressed: stats.reposted, disabled: busy || loading, icon: 'repost' as const, activeClass: 'text-riff-accent', onClick: () => void toggle('riff_reposts', stats.reposted, 'reposted', 'reposts') },
        { key: 'save', label: stats.saved ? 'Unsave' : 'Save', pressed: stats.saved, disabled: busy || loading, icon: 'bookmark' as const, activeClass: 'text-riff-accent', onClick: () => void toggle('riff_saves', stats.saved, 'saved') },
        { key: 'share', label: 'Share', disabled: false, icon: 'share' as const, activeClass: 'text-riff-accent', onClick: () => void share() },
    ]
    const ownerMenuItems = viewerId === authorId ? [
        { key: 'post-settings', label: 'Post Settings', disabled: false, icon: 'settings' as const, activeClass: 'text-riff-accent', onClick: () => { setEditedText(content); setNextCommentsEnabled(commentsEnabled); setNextAllowBranches(allowBranches); setMessage(''); setPanel('edit') } },
        { key: 'delete-post', label: 'Delete post', disabled: busy, icon: 'trash' as const, activeClass: 'text-rose-300', onClick: () => void deletePost() },
    ] : []
    const compactRail = postCardHeight > 0 && postCardHeight < 240
    const buttonSize = compactRail ? 40 : 44
    const railGap = compactRail ? 8 : 12
    const railInset = compactRail ? 8 : 12
    const actionCapacity = postCardHeight > 0 ? Math.max(1, Math.floor((postCardHeight - railInset + railGap) / (buttonSize + railGap))) : 1
    const overflowItems = [...actionItems, ...ownerMenuItems]
    const hasActionOverflow = postCardHeight > 0 && overflowItems.length > actionCapacity
    const visibleActionCount = hasActionOverflow ? Math.min(actionItems.length, Math.max(0, actionCapacity - 1)) : actionItems.length
    const visibleActionItems = actionItems.slice(0, visibleActionCount)
    const isOverflowExpanded = overflowExpandedAtHeight === postCardHeight && hasActionOverflow
    const expandedItemCount = overflowItems.length + 1
    const expandedStackHeight = expandedItemCount * buttonSize + (expandedItemCount - 1) * railGap + railInset
    const actionRailHeight = isOverflowExpanded ? Math.max(postCardHeight, expandedStackHeight) : postCardHeight
    const circleClass = `relative flex ${compactRail ? 'size-10' : 'size-11'} shrink-0 items-center justify-center rounded-full border border-riff-outline bg-riff-surface text-riff-muted shadow-lg transition hover:-translate-y-0.5 hover:bg-riff-surface-2 hover:text-riff-accent disabled:opacity-50`
    const renderActionCircle = (item: (typeof actionItems)[number] | (typeof ownerMenuItems)[number]) => <button key={item.key} type="button" title={`${item.label}${'count' in item && item.count ? ` · ${item.count}` : ''}`} aria-label={`${item.label}${'count' in item && item.count !== undefined ? `, ${item.count}` : ''}`} aria-pressed={'pressed' in item ? item.pressed : undefined} disabled={item.disabled} onClick={item.onClick} className={`${circleClass} ${'gold' in item && item.gold ? 'border-white/20 bg-white/[0.07] text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_4px_18px_rgba(214,189,130,0.12)] backdrop-blur-md before:pointer-events-none before:absolute before:inset-px before:rounded-full before:bg-gradient-to-b before:from-white/20 before:via-white/[0.04] before:to-transparent before:content-[\'\'] hover:border-white/30 hover:bg-white/[0.12] hover:text-amber-100' : ''} ${'pressed' in item && item.pressed ? item.activeClass : ''}`}><Icon name={item.icon} size={compactRail ? 16 : 18} className={'gold' in item && item.gold ? 'relative z-10 drop-shadow-[0_0_6px_rgba(251,191,36,0.28)]' : undefined} />{'count' in item && item.count !== undefined && item.count > 0 && <span className="absolute -right-1 -top-1 rounded-full border border-riff-outline bg-riff-surface-3 px-1 text-[9px] leading-4 text-riff-text">{item.count}</span>}</button>

    useEffect(() => {
        const layout = actionRailRef.current?.closest('[data-riff-post-layout]')
        const card = layout?.querySelector<HTMLElement>('[data-riff-post-card]')
        if (!card) return
        const desktop = window.matchMedia('(min-width: 1024px)').matches
        const offset = desktop && compactRail && isOverflowExpanded
            ? Math.max(0, (actionRailHeight - postCardHeight) / 2)
            : 0
        card.style.transform = offset ? `translateY(${offset}px)` : ''
        card.style.transition = 'transform 280ms ease'
        return () => {
            card.style.transform = ''
            card.style.transition = ''
        }
    }, [floating, compactRail, isOverflowExpanded, actionRailHeight, postCardHeight])

    return (
        <div className={floating ? 'contents' : 'mt-4 border-t border-white/[0.06] pt-3'}>
            {floating ? <>
                <div className="col-start-1 row-start-2 flex flex-wrap items-center gap-2 lg:hidden">
                    {viewerId && viewerId !== authorId && <button type="button" aria-label="Report post" title="Report post" onClick={() => { setReportTarget({ type: 'riff', id: riffId }); setReportReason(''); setReportDetails(''); setMessage(''); setPanel('report') }} className={circleClass}><Icon name="flag" size={16} /></button>}
                    {isOverflowExpanded ? <div id={`riff-mobile-actions-${riffId}`} className="flex basis-full flex-wrap items-center gap-2">{overflowItems.map((item) => renderActionCircle(item))}</div> : (hasActionOverflow ? visibleActionItems : overflowItems).map((item) => renderActionCircle(item))}
                    {hasActionOverflow && <button type="button" aria-label={isOverflowExpanded ? 'Collapse post actions' : 'Show more post actions'} aria-expanded={isOverflowExpanded} aria-controls={`riff-mobile-actions-${riffId}`} onClick={() => setOverflowExpandedAtHeight(isOverflowExpanded ? null : postCardHeight)} className={circleClass}><Icon name={isOverflowExpanded ? 'close' : 'menu'} size={18} /></button>}
                </div>
                {viewerId && viewerId !== authorId && <aside aria-label="Post report" className="col-start-1 row-start-1 hidden justify-center pt-3 lg:flex">
                    <button type="button" aria-label="Report post" title="Report post" onClick={() => { setReportTarget({ type: 'riff', id: riffId }); setReportReason(''); setReportDetails(''); setMessage(''); setPanel('report') }} className={circleClass}><Icon name="flag" size={16} /></button>
                </aside>}
                <aside ref={actionRailRef} aria-label="Post interactions" className="col-start-3 row-start-1 hidden self-stretch lg:flex lg:justify-center" style={{ height: actionRailHeight || undefined, transition: 'height 280ms ease' }}>
                    <div id={`riff-actions-${riffId}`} className={`flex flex-col items-center ${compactRail ? 'gap-2 pt-2' : 'gap-3 pt-3'}`}>
                        {(hasActionOverflow && isOverflowExpanded ? overflowItems : hasActionOverflow ? visibleActionItems : overflowItems).map((item) => renderActionCircle(item))}
                        {hasActionOverflow && <button type="button" aria-label={isOverflowExpanded ? 'Collapse post actions' : 'Show more post actions'} aria-expanded={isOverflowExpanded} aria-controls={`riff-actions-${riffId}`} onClick={() => setOverflowExpandedAtHeight(isOverflowExpanded ? null : postCardHeight)} className={circleClass}><Icon name={isOverflowExpanded ? 'close' : 'menu'} size={18} className="transition-transform duration-300" /></button>}
                    </div>
                </aside>
                <div className="col-start-1 row-start-3 mt-3 min-w-0 lg:col-start-2 lg:col-span-2 lg:row-start-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                </div>
                {message && <p role="status" className="mt-2 text-xs text-amber-200">{message}</p>}
                {commentsEnabled && commentsOpen && <section id={`comments-${riffId}`} aria-label="Comments" className="mt-4 rounded-card border border-riff-outline bg-riff-surface-low p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div><h3 className="text-sm font-semibold text-riff-text">Comments</h3><p className="mt-0.5 text-xs text-riff-muted">{stats.comments} {stats.comments === 1 ? 'comment' : 'comments'}</p></div>
                        <button type="button" onClick={() => setCommentsOpen(false)} className="rounded-lg px-2.5 py-1.5 text-xs text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text">Close</button>
                    </div>
                    {commentsLoading ? <p role="status" className="py-5 text-center text-sm text-riff-muted">Loading comments…</p> : commentsError ? <div role="alert" className="rounded-control border border-rose-300/15 bg-rose-300/[0.05] p-3 text-sm text-rose-100"><p>{commentsError}</p><button type="button" onClick={() => void loadComments(true)} className="mt-2 underline underline-offset-2">Try again</button></div> : comments.length ? <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-1">{comments.map((comment) => <article key={comment.id} className="border-b border-riff-outline pb-3 last:border-0 last:pb-0"><div className="flex items-baseline justify-between gap-3"><p className="truncate text-xs font-semibold text-riff-text">{comment.author_name}</p><time dateTime={comment.created_at} className="shrink-0 text-[11px] text-riff-faint">{new Date(comment.created_at).toLocaleString()}</time></div><p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-riff-muted">{comment.content}</p><div className="mt-2 flex gap-3">{viewerId === comment.author_id ? <button type="button" disabled={busy} onClick={() => void removeComment(comment)} className="text-xs text-riff-faint hover:text-rose-200">Delete</button> : viewerId && <button type="button" onClick={() => { setReportTarget({ type: 'comment', id: comment.id }); setReportReason(''); setReportDetails(''); setMessage(''); setPanel('report') }} className="text-xs text-riff-faint hover:text-rose-200">Report</button>}</div></article>)}</div> : <p className="py-5 text-center text-sm text-riff-muted">Be the first to comment.</p>}
                    {viewerId ? <form onSubmit={addComment} className="mt-4 flex items-end gap-2 border-t border-riff-outline pt-4"><Textarea aria-label="Write a comment" value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} rows={2} placeholder="Add to the conversation…" className="min-h-11 flex-1 resize-y" /><Button disabled={busy || !commentText.trim()} size="compact">Post</Button></form> : <p className="mt-4 border-t border-riff-outline pt-4 text-sm text-riff-muted"><Link href="/auth/login" className="text-riff-accent underline underline-offset-2">Sign in</Link> to join the conversation.</p>}
                </section>}
                </div>
            </> : <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                {viewerId && viewerId !== authorId && <button type="button" aria-label="Report post" title="Report post" onClick={() => { setReportTarget({ type: 'riff', id: riffId }); setReportReason(''); setReportDetails(''); setMessage(''); setPanel('report') }} className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-riff-outline bg-riff-surface text-riff-muted shadow-lg transition hover:bg-riff-surface-2 hover:text-riff-accent lg:absolute lg:-left-12 lg:top-0"><Icon name="flag" size={15} /></button>}
                <button type="button" disabled={busy || loading} onClick={() => void toggle('riff_likes', stats.liked, 'liked', 'likes')} className={`inline-flex items-center gap-1.5 hover:text-rose-200 disabled:opacity-50 ${stats.liked ? 'text-rose-200' : ''}`}><Icon name="heart" size={15} />{stats.likes || 'Like'}</button>
                {commentsEnabled && <button type="button" disabled={loading} aria-expanded={commentsOpen} aria-controls={`comments-${riffId}`} onClick={toggleComments} className="inline-flex items-center gap-1.5 hover:text-amber-200 disabled:opacity-50"><Icon name="comment" size={15} />{commentsOpen ? 'Hide comments' : 'Comment'}{stats.comments ? ` · ${stats.comments}` : ''}</button>}
                <button type="button" disabled={busy || loading} onClick={() => void toggle('riff_reposts', stats.reposted, 'reposted', 'reposts')} className={`inline-flex items-center gap-1.5 hover:text-amber-200 disabled:opacity-50 ${stats.reposted ? 'text-amber-200' : ''}`}><Icon name="repost" size={15} />Repost{stats.reposts ? ` · ${stats.reposts}` : ''}</button>
                <button type="button" disabled={busy || loading} onClick={() => void toggle('riff_saves', stats.saved, 'saved')} className={`inline-flex items-center gap-1.5 hover:text-amber-200 disabled:opacity-50 ${stats.saved ? 'text-amber-200' : ''}`}><Icon name="bookmark" size={15} />{stats.saved ? 'Saved' : 'Save'}</button>
                <button type="button" onClick={() => void share()} className="inline-flex items-center gap-1.5 hover:text-amber-200"><Icon name="share" size={15} />Share</button>
                {stats.branches > 0 && <Link href={`/r/${riffId}`} className="hover:text-amber-200">{stats.branches} {stats.branches === 1 ? 'branch' : 'branches'}</Link>}
                {viewerId === authorId && <details className="relative ml-auto">
                    <summary aria-label="More post actions" className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-full border border-riff-outline text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="menu" size={16} /></summary>
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-riff-outline bg-riff-surface-2 p-1.5 shadow-xl">
                        <button type="button" onClick={() => { setEditedText(content); setNextCommentsEnabled(commentsEnabled); setNextAllowBranches(allowBranches); setMessage(''); setPanel('edit') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-riff-text hover:bg-riff-surface-3"><Icon name="settings" size={14} />Post Settings</button>
                        <button type="button" disabled={busy} onClick={() => void deletePost()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-200 hover:bg-rose-300/10"><Icon name="trash" size={14} />Delete post</button>
                    </div>
                </details>}
            </div>}
            {!floating && message && <p role="status" className="mt-2 text-xs text-amber-200">{message}</p>}

            {!floating && commentsEnabled && commentsOpen && <section id={`comments-${riffId}`} aria-label="Comments" className="mt-4 rounded-card border border-riff-outline bg-riff-surface-low p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div><h3 className="text-sm font-semibold text-riff-text">Comments</h3><p className="mt-0.5 text-xs text-riff-muted">{stats.comments} {stats.comments === 1 ? 'comment' : 'comments'}</p></div>
                    <button type="button" onClick={() => setCommentsOpen(false)} className="rounded-lg px-2.5 py-1.5 text-xs text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text">Close</button>
                </div>
                {commentsLoading ? <p role="status" className="py-5 text-center text-sm text-riff-muted">Loading comments…</p> : commentsError ? <div role="alert" className="rounded-control border border-rose-300/15 bg-rose-300/[0.05] p-3 text-sm text-rose-100"><p>{commentsError}</p><button type="button" onClick={() => void loadComments(true)} className="mt-2 underline underline-offset-2">Try again</button></div> : comments.length ? <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-1">{comments.map((comment) => <article key={comment.id} className="border-b border-riff-outline pb-3 last:border-0 last:pb-0"><div className="flex items-baseline justify-between gap-3"><p className="truncate text-xs font-semibold text-riff-text">{comment.author_name}</p><time dateTime={comment.created_at} className="shrink-0 text-[11px] text-riff-faint">{new Date(comment.created_at).toLocaleString()}</time></div><p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-riff-muted">{comment.content}</p><div className="mt-2 flex gap-3">{viewerId === comment.author_id ? <button type="button" disabled={busy} onClick={() => void removeComment(comment)} className="text-xs text-riff-faint hover:text-rose-200">Delete</button> : viewerId && <button type="button" onClick={() => { setReportTarget({ type: 'comment', id: comment.id }); setReportReason(''); setReportDetails(''); setMessage(''); setPanel('report') }} className="text-xs text-riff-faint hover:text-rose-200">Report</button>}</div></article>)}</div> : <p className="py-5 text-center text-sm text-riff-muted">Be the first to comment.</p>}
                {viewerId ? <form onSubmit={addComment} className="mt-4 flex items-end gap-2 border-t border-riff-outline pt-4"><Textarea aria-label="Write a comment" value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} rows={2} placeholder="Add to the conversation…" className="min-h-11 flex-1 resize-y" /><Button disabled={busy || !commentText.trim()} size="compact">Post</Button></form> : <p className="mt-4 border-t border-riff-outline pt-4 text-sm text-riff-muted"><Link href="/auth/login" className="text-riff-accent underline underline-offset-2">Sign in</Link> to join the conversation.</p>}
            </section>}

            <Dialog.Root open={Boolean(panel)} onOpenChange={(open) => { if (!open) setPanel(null) }}>
                {panel && <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
                    <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[1.5rem] border border-riff-outline bg-riff-surface p-5 shadow-2xl focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-4"><div><Dialog.Title className="text-lg font-semibold text-riff-text">{panel === 'report' ? 'Report content' : 'Post settings'}</Dialog.Title><Dialog.Description className="mt-1 text-xs text-riff-muted">{panel === 'report' ? 'Tell the Riff team what needs a look.' : 'Update this post and its conversation settings.'}</Dialog.Description></div><Dialog.Close asChild><Button type="button" variant="ghost" size="compact">Close</Button></Dialog.Close></div>
                    {panel === 'report' ? <form onSubmit={submitReport} className="space-y-4">
                        <label className="block text-sm text-zinc-300">Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0c0c10] px-3 py-2.5 text-sm text-white"><option value="">Choose a reason</option><option value="Spam or scam">Spam or scam</option><option value="Harassment or hate">Harassment or hate</option><option value="Unsafe or illegal content">Unsafe or illegal content</option><option value="Other">Other</option></select></label>
                        <p className="text-xs text-zinc-500">Reports are sent to the Riff moderation inbox.</p>
                        <Textarea aria-label="Additional report details" value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={450} rows={3} placeholder="Add context (optional)" />
                        {message && <p role="alert" className="text-xs text-rose-200">{message}</p>}
                        <Button variant="danger" disabled={busy || !reportReason}><Icon name="flag" size={15} />Send report</Button>
                    </form> : <form onSubmit={saveSettings} className="space-y-4">
                        <label htmlFor="edit-riff-content" className="mb-2 block text-sm text-riff-muted">Post text</label>
                        <MarkdownEditor id="edit-riff-content" value={editedText} onChange={setEditedText} maxLength={1000} rows={5} placeholder="Update your post" />
                        <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={nextCommentsEnabled} onChange={(event) => setNextCommentsEnabled(event.target.checked)} className="accent-amber-300" /> Allow comments</label>
                        <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={nextAllowBranches} onChange={(event) => setNextAllowBranches(event.target.checked)} disabled={kind === 'black'} className="accent-amber-300" /> Allow branches{kind === 'black' && <span className="text-xs text-zinc-500">· Black Riffs are standalone</span>}</label>
                        {message && <p className="text-xs text-rose-200">{message}</p>}
                        <Button disabled={busy || !editedText.trim()}><Icon name="check" size={16} />Save settings</Button>
                    </form>}
                    </Dialog.Content>
                </Dialog.Portal>}
            </Dialog.Root>
        </div>
    )
}
