'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRiffSocial } from '@/app/riffs/riff-social-provider'

type CommentRow = { id: string; author_id: string; content: string; created_at: string }
export function RiffSocialActions({ riffId, authorId, content, kind, commentsEnabled, allowBranches }: {
    riffId: string
    authorId: string
    content: string
    kind: 'riff' | 'black'
    commentsEnabled: boolean
    allowBranches: boolean
}) {
    const supabase = createClient()
    const router = useRouter()
    const { viewerId, stats, following, updateStats, setFollowing, loading } = useRiffSocial(riffId, authorId)
    const [busy, setBusy] = useState(false)
    const [panel, setPanel] = useState<'comments' | 'edit' | 'report' | null>(null)
    const [comments, setComments] = useState<(CommentRow & { author_name: string })[]>([])
    const [commentsLoading, setCommentsLoading] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [editedText, setEditedText] = useState('')
    const [nextCommentsEnabled, setNextCommentsEnabled] = useState(commentsEnabled)
    const [nextAllowBranches, setNextAllowBranches] = useState(allowBranches)
    const [message, setMessage] = useState('')
    const [reportTarget, setReportTarget] = useState<{ type: 'riff' | 'comment'; id: string }>({ type: 'riff', id: riffId })
    const [reportReason, setReportReason] = useState('')
    const [reportDetails, setReportDetails] = useState('')

    useEffect(() => {
        if (!panel) return
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
        document.getElementById('riff-panel-close')?.focus()
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') { setPanel(null); return }
            if (event.key !== 'Tab') return
            const panelElement = document.querySelector('[data-riff-panel]')
            const focusable = panelElement?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]')
            if (!focusable?.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus() }
    }, [panel])

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

    async function openComments() {
        setMessage('')
        setComments([])
        setCommentsLoading(true)
        setPanel('comments')
        try {
            const { data, error } = await supabase.from('riff_comments').select('id, author_id, content, created_at').eq('riff_id', riffId).order('created_at', { ascending: true }).limit(100)
            if (error) throw error
            const rows = (data ?? []) as CommentRow[]
            const ids = [...new Set(rows.map((row) => row.author_id))]
            const { data: profiles, error: profilesError } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [], error: null }
            if (profilesError) throw profilesError
            const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || `@${profile.username || 'user'}`]))
            setComments(rows.map((row) => ({ ...row, author_name: names.get(row.author_id) ?? 'Riff user' })))
        } catch (error) {
            setMessage(`Could not load comments: ${error instanceof Error ? error.message : 'Check your connection and try again.'}`)
        } finally {
            setCommentsLoading(false)
        }
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

    async function toggleFollow() {
        if (!viewerId) { setMessage('Sign in to follow people.'); return }
        setBusy(true)
        const result = following
            ? await supabase.from('riff_follows').delete().eq('follower_id', viewerId).eq('followed_id', authorId)
            : await supabase.from('riff_follows').insert({ follower_id: viewerId, followed_id: authorId })
        if (result.error) setMessage(result.error.message)
        else setFollowing(!following)
        setBusy(false)
    }

    async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!editedText.trim()) { setMessage('A post cannot be empty.'); return }
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

    return (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                <button type="button" disabled={busy || loading} onClick={() => void toggle('riff_likes', stats.liked, 'liked', 'likes')} className={`hover:text-rose-200 disabled:opacity-50 ${stats.liked ? 'text-rose-200' : ''}`}>♡ {stats.likes || 'Like'}</button>
                {commentsEnabled && <button type="button" disabled={loading} onClick={() => void openComments()} className="hover:text-violet-200 disabled:opacity-50">Comment{stats.comments ? ` · ${stats.comments}` : ''}</button>}
                <button type="button" disabled={busy || loading} onClick={() => void toggle('riff_reposts', stats.reposted, 'reposted', 'reposts')} className={`hover:text-violet-200 disabled:opacity-50 ${stats.reposted ? 'text-violet-200' : ''}`}>⤴ Repost{stats.reposts ? ` · ${stats.reposts}` : ''}</button>
                <button type="button" disabled={busy || loading} onClick={() => void toggle('riff_saves', stats.saved, 'saved')} className={`hover:text-violet-200 disabled:opacity-50 ${stats.saved ? 'text-violet-200' : ''}`}>{stats.saved ? 'Saved' : 'Save'}</button>
                <button type="button" onClick={() => void share()} className="hover:text-violet-200">Share</button>
                {stats.branches > 0 && <Link href={`/r/${riffId}`} className="hover:text-violet-200">{stats.branches} {stats.branches === 1 ? 'branch' : 'branches'}</Link>}
                {viewerId && viewerId !== authorId && <button type="button" disabled={busy || loading} onClick={() => void toggleFollow()} className={`hover:text-cyan-200 disabled:opacity-50 ${following ? 'text-cyan-200' : ''}`}>{following ? 'Following' : 'Follow'}</button>}
                {viewerId !== authorId && viewerId && <button type="button" onClick={() => { setReportTarget({ type: 'riff', id: riffId }); setReportReason(''); setReportDetails(''); setMessage(''); setPanel('report') }} className="hover:text-rose-200">Report</button>}
                {viewerId === authorId && <details className="relative ml-auto">
                    <summary className="cursor-pointer list-none rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-zinc-400 hover:bg-white/[0.04]">Post settings</summary>
                    <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-white/10 bg-[#19181f] p-1.5 shadow-xl">
                        <button type="button" onClick={() => { setEditedText(content); setNextCommentsEnabled(commentsEnabled); setNextAllowBranches(allowBranches); setMessage(''); setPanel('edit') }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5">Edit post settings</button>
                        <button type="button" disabled={busy} onClick={() => void deletePost()} className="w-full rounded-lg px-3 py-2 text-left text-xs text-rose-200 hover:bg-rose-300/10">Delete post</button>
                    </div>
                </details>}
            </div>
            {message && <p role="status" className="mt-2 text-xs text-violet-200">{message}</p>}

            {panel && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null) }}>
                <section data-riff-panel role="dialog" aria-modal="true" aria-label={panel === 'comments' ? 'Comments' : panel === 'report' ? 'Report content' : 'Edit post settings'} className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#15141a] p-5 shadow-2xl sm:rounded-3xl sm:p-6">
                    <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">{panel === 'comments' ? 'Comments' : panel === 'report' ? 'Report content' : 'Post settings'}</h2><button id="riff-panel-close" type="button" onClick={() => setPanel(null)} className="rounded-lg px-3 py-1.5 text-zinc-400 hover:bg-white/5">Close</button></div>
                    {panel === 'comments' ? <>
                        <div className="space-y-4">{commentsLoading ? <p role="status" className="py-6 text-center text-sm text-zinc-500">Loading comments…</p> : comments.length ? comments.map((comment) => <article key={comment.id} className="border-b border-white/[0.06] pb-3"><p className="text-xs font-medium text-zinc-300">{comment.author_name}<time className="ml-2 font-normal text-zinc-600">{new Date(comment.created_at).toLocaleString()}</time></p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{comment.content}</p><div className="mt-2 flex gap-3">{viewerId === comment.author_id ? <button type="button" disabled={busy} onClick={() => void removeComment(comment)} className="text-xs text-zinc-500 hover:text-rose-200">Delete</button> : viewerId && <button type="button" onClick={() => { setReportTarget({ type: 'comment', id: comment.id }); setReportReason(''); setReportDetails(''); setMessage(''); setPanel('report') }} className="text-xs text-zinc-500 hover:text-rose-200">Report</button>}</div></article>) : <p className="py-6 text-center text-sm text-zinc-500">Be the first to comment.</p>}</div>
                        {message && <p role="alert" className="mt-3 text-xs text-rose-200">{message}</p>}
                        <form onSubmit={addComment} className="mt-4 flex gap-2"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} placeholder="Write a comment…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-300/30" /><button disabled={busy} className="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-semibold text-[#17121f] disabled:opacity-50">Post</button></form>
                    </> : panel === 'report' ? <form onSubmit={submitReport} className="space-y-4">
                        <label className="block text-sm text-zinc-300">Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0c0c10] px-3 py-2.5 text-sm text-white"><option value="">Choose a reason</option><option value="Spam or scam">Spam or scam</option><option value="Harassment or hate">Harassment or hate</option><option value="Unsafe or illegal content">Unsafe or illegal content</option><option value="Other">Other</option></select></label>
                        <p className="text-xs text-zinc-500">Reports are sent to the Riff moderation inbox.</p>
                        <textarea aria-label="Additional report details" value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={450} rows={3} placeholder="Add context (optional)" className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white" />
                        {message && <p role="alert" className="text-xs text-rose-200">{message}</p>}
                        <button disabled={busy || !reportReason} className="rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-semibold text-[#211316] disabled:opacity-50">Send report</button>
                    </form> : <form onSubmit={saveSettings} className="space-y-4">
                        <label className="block text-sm text-zinc-300">Post text<textarea value={editedText} onChange={(event) => setEditedText(event.target.value)} maxLength={1000} rows={5} placeholder="Paste the updated post text" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white outline-none focus:border-violet-300/30" /></label>
                        <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={nextCommentsEnabled} onChange={(event) => setNextCommentsEnabled(event.target.checked)} className="accent-violet-300" /> Allow comments</label>
                        <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={nextAllowBranches} onChange={(event) => setNextAllowBranches(event.target.checked)} disabled={kind === 'black'} className="accent-violet-300" /> Allow branches{kind === 'black' && <span className="text-xs text-zinc-500">· Black Riffs are standalone</span>}</label>
                        {message && <p className="text-xs text-rose-200">{message}</p>}
                        <button disabled={busy || !editedText.trim()} className="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-semibold text-[#17121f] disabled:opacity-50">Save settings</button>
                    </form>}
                </section>
            </div>}
        </div>
    )
}
