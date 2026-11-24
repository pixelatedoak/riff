'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReportItem } from '@/app/moderation/page'
import { createClient } from '@/lib/supabase/client'

export function ReportInbox({ initialReports }: { initialReports: ReportItem[] }) {
    const [reports, setReports] = useState(initialReports)
    const [busyId, setBusyId] = useState('')
    const [error, setError] = useState('')
    const supabase = createClient()
    const router = useRouter()

    async function setStatus(report: ReportItem, status: 'reviewed' | 'dismissed') {
        setBusyId(report.id)
        setError('')
        const { error: updateError } = await supabase.from('riff_reports').update({ status }).eq('id', report.id)
        if (updateError) setError(updateError.message)
        else setReports((items) => items.map((item) => item.id === report.id ? { ...item, status } : item))
        setBusyId('')
    }

    async function removeContent(report: ReportItem) {
        if (!window.confirm('Remove this reported content? The change cannot be undone.')) return
        setBusyId(report.id)
        setError('')
        if (report.target_type === 'riff') {
            const { data: deleted, error: deleteError } = await supabase.rpc('soft_delete_riff', { p_riff_id: report.target_id })
            if (deleteError || !deleted) { setError(deleteError?.message ?? 'You do not have permission to remove this Riff.'); setBusyId(''); return }
            const { data: files, error: filesError } = await supabase.from('riff_attachments').select('id, storage_path').eq('riff_id', report.target_id)
            if (filesError) { setError(filesError.message); setBusyId(''); return }
            if (files?.length) {
                const { error: storageError } = await supabase.storage.from('riff-files').remove(files.map((file) => file.storage_path))
                if (storageError) { setError(`Post hidden, but files need cleanup: ${storageError.message}`); setBusyId(''); return }
                const { error: metadataError } = await supabase.from('riff_attachments').delete().in('id', files.map((file) => file.id))
                if (metadataError) { setError(metadataError.message); setBusyId(''); return }
            }
        } else {
            const { error: commentError } = await supabase.from('riff_comments').delete().eq('id', report.target_id)
            if (commentError) { setError(commentError.message); setBusyId(''); return }
        }
        {
            await supabase.from('riff_reports').update({ status: 'reviewed' }).eq('id', report.id)
            setReports((items) => items.map((item) => item.id === report.id ? { ...item, status: 'reviewed', preview: '[removed by a moderator]' } : item))
            router.refresh()
        }
        setBusyId('')
    }

    if (!reports.length) return <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#121216] p-8 text-center text-sm text-zinc-500">No reports yet.</div>

    return <div className="mt-6 space-y-3">
        {error && <p role="alert" className="rounded-xl border border-rose-300/15 bg-rose-300/[0.05] p-3 text-sm text-rose-100">{error}</p>}
        {reports.map((report) => <article key={report.id} className="rounded-2xl border border-white/[0.08] bg-[#121216] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full border border-rose-200/15 bg-rose-200/[0.05] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-100">{report.target_type} · {report.status}</span><p className="mt-3 text-sm leading-6 text-zinc-200">{report.preview}</p><p className="mt-2 text-xs text-zinc-500">Reason: {report.reason}</p><p className="mt-1 text-[11px] text-zinc-600">Reported {new Date(report.created_at).toLocaleString()} · reporter {report.reporter_id.slice(0, 8)}</p></div><p className="text-[11px] text-zinc-600">ID {report.target_id.slice(0, 8)}</p></div>
            <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={busyId === report.id || report.status !== 'open'} onClick={() => void setStatus(report, 'reviewed')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40">Mark reviewed</button>
                <button type="button" disabled={busyId === report.id || report.status !== 'open'} onClick={() => void setStatus(report, 'dismissed')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40">Dismiss</button>
                <button type="button" disabled={busyId === report.id || report.status !== 'open'} onClick={() => void removeContent(report)} className="rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-200 hover:bg-rose-300/[0.07] disabled:opacity-40">Remove content</button>
            </div>
        </article>)}
    </div>
}
