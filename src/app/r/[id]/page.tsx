import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { RiffTree } from '@/app/riffs/riff-tree'
import type { RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import { createClient } from '@/lib/supabase/server'
import { getRiffPreviewData } from '@/lib/riffs/preview'

const riffColumns = 'id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at'
const branchPageSize = 100
type RiffPageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ offset?: string | string[] }> }

export async function generateMetadata({ params }: RiffPageProps): Promise<Metadata> {
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: 'Riff' }
    const preview = await getRiffPreviewData(id)
    if (!preview) return { title: 'Riff not found', robots: { index: false, follow: false } }

    const title = `${preview.kind === 'black' ? 'Black Riff' : 'Open Riff'} by ${preview.authorName}`
    const description = preview.attachmentCount > 0
        ? `${preview.description} · ${preview.attachmentCount} ${preview.attachmentCount === 1 ? 'attachment' : 'attachments'}`
        : preview.description
    const image = `/r/${id}/opengraph-image`

    return {
        title,
        description,
        alternates: { canonical: `/r/${id}` },
        openGraph: { type: 'article', siteName: 'Riff', title, description, url: `/r/${id}`, images: [{ url: image, width: 1200, height: 630, alt: `Preview of ${title}` }] },
        twitter: { card: 'summary_large_image', title, description, images: [image] },
    }
}

export default async function RiffThreadPage({ params, searchParams }: RiffPageProps) {
    const [{ id }, query] = await Promise.all([params, searchParams])
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
    const rawOffset = Array.isArray(query.offset) ? query.offset[0] : query.offset
    const parsedOffset = rawOffset && /^\d+$/.test(rawOffset) ? Number(rawOffset) : 0
    const offset = Number.isSafeInteger(parsedOffset) ? Math.max(0, Math.min(parsedOffset, 100000)) : 0

    const supabase = await createClient()
    const { data: requested } = await supabase.from('riffs').select(riffColumns).eq('id', id).maybeSingle()
    if (!requested) notFound()

    const [{ data: branchData }, { count: totalBranchCount }] = await Promise.all([
        supabase
        .from('riffs')
        .select(riffColumns)
        .eq('root_riff_id', requested.root_riff_id)
        .not('parent_riff_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + branchPageSize - 1),
        supabase.from('riffs').select('id', { count: 'exact', head: true })
            .eq('root_riff_id', requested.root_riff_id).not('parent_riff_id', 'is', null).is('deleted_at', null),
    ])

    const { data: rootRecord } = await supabase.from('riffs').select(riffColumns).eq('id', requested.root_riff_id).maybeSingle()
    if (!rootRecord) notFound()
    const riffMap = new Map<string, RiffRecord>()
    riffMap.set(requested.id, requested as RiffRecord)
    for (const branch of branchData ?? []) riffMap.set(branch.id, branch as RiffRecord)
    riffMap.set(requested.root_riff_id, rootRecord as RiffRecord)

    // Include each selected branch's ancestors so a page of recent branches still renders in its tree path.
    for (let depth = 0; depth < 100; depth++) {
        const missingParents = [...new Set([...riffMap.values()].map((riff) => riff.parent_riff_id).filter((parentId): parentId is string => Boolean(parentId) && !riffMap.has(parentId!)))]
        if (!missingParents.length) break
        const { data: ancestors } = await supabase.from('riffs').select(riffColumns).in('id', missingParents)
        for (const ancestor of ancestors ?? []) riffMap.set(ancestor.id, ancestor as RiffRecord)
    }
    const riffs = [...riffMap.values()]
    const authorIds = [...new Set(riffs.map((entry) => entry.author_id))]
    const { data: authorData } = authorIds.length > 0
        ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', authorIds)
        : { data: [] }
    const authors = (authorData ?? []) as RiffAuthor[]
    const { data: attachmentData } = riffs.length > 0
        ? await supabase.from('riff_attachments').select('id, riff_id, filename, storage_path, public_url, mime_type, byte_size, media_filter, sticker, sort_order').in('riff_id', riffs.map((entry) => entry.id)).order('sort_order', { ascending: true }).order('created_at', { ascending: true })
        : { data: [] }
    const root = riffs.find((entry) => entry.id === requested.root_riff_id)
    const nextOffset = offset + branchPageSize
    const hasOlder = offset + (branchData?.length ?? 0) < (totalBranchCount ?? 0)

    return (
        <main className="min-h-dvh bg-transparent pb-28 text-zinc-100">
            <section className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12 lg:max-w-5xl lg:px-10 lg:pt-14">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-200">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" /></svg>
                    Back to feed
                </Link>
                <div className="mb-5 mt-8">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-riff-accent">Riff thread</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{root?.kind === 'black' ? 'Black Riff' : 'An open thought'}</h1>
                    <p className="mt-1 text-sm text-zinc-500">{totalBranchCount ?? 0} {(totalBranchCount ?? 0) === 1 ? 'branch' : 'branches'}</p>
                </div>

                <RiffTree riffs={riffs} authors={authors} rootId={requested.root_riff_id} attachments={attachmentData ?? []} />
                <div className="mt-6 flex items-center justify-between gap-3">
                    {offset > 0 ? <Link href={`/r/${id}?offset=${Math.max(0, offset - branchPageSize)}`} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5">Newer branches</Link> : <span />}
                    {hasOlder && <Link href={`/r/${id}?offset=${nextOffset}`} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5">Older branches</Link>}
                </div>
            </section>
            <BottomNavigation active="none" />
        </main>
    )
}
