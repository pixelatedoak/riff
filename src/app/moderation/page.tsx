import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BottomNavigation } from '@/app/bottom-navigation'
import { ReportInbox } from '@/app/moderation/report-inbox'
import { createClient } from '@/lib/supabase/server'

export type ReportItem = {
    id: string
    target_type: 'riff' | 'comment'
    target_id: string
    reason: string
    status: 'open' | 'reviewed' | 'dismissed'
    created_at: string
    reporter_id: string
    preview: string
}

export default async function ModerationPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    if (!user.email) notFound()

    const { data: moderator } = await supabase.from('riff_moderators').select('email').eq('email', user.email.toLowerCase()).maybeSingle()
    if (!moderator) notFound()

    const { data: reports, error } = await supabase.from('riff_reports')
        .select('id, reporter_id, target_type, target_id, reason, status, created_at')
        .order('created_at', { ascending: false }).limit(200)
    const riffIds = [...new Set((reports ?? []).filter((report) => report.target_type === 'riff').map((report) => report.target_id))]
    const commentIds = [...new Set((reports ?? []).filter((report) => report.target_type === 'comment').map((report) => report.target_id))]
    const [{ data: riffRows }, { data: commentRows }] = await Promise.all([
        riffIds.length ? supabase.from('riffs').select('id, content, deleted_at').in('id', riffIds) : Promise.resolve({ data: [] }),
        commentIds.length ? supabase.from('riff_comments').select('id, content').in('id', commentIds) : Promise.resolve({ data: [] }),
    ])
    const previews = new Map<string, string>()
    for (const riff of riffRows ?? []) previews.set(riff.id, riff.deleted_at ? '[deleted]' : riff.content)
    for (const comment of commentRows ?? []) previews.set(comment.id, comment.content)
    const items = ((reports ?? []) as Omit<ReportItem, 'preview'>[]).map((report) => ({
        ...report,
        preview: previews.get(report.target_id) ?? '[content no longer available]',
    }))

    return <main className="min-h-dvh bg-transparent pb-28 text-zinc-100">
        <section className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-12">
            <Link href="/profile" className="text-sm text-zinc-500 hover:text-zinc-200">← Profile</Link>
            <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200/80">Riff safety</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Moderation inbox</h1>
            <p className="mt-2 text-sm text-zinc-500">Review reports, remove content, or close a report.</p>
            {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] p-4 text-sm text-rose-100">Could not load reports: {error.message}</p> : <ReportInbox initialReports={items} />}
        </section>
        <BottomNavigation active="none" />
    </main>
}
