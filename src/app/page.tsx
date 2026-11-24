import { redirect } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { RiffTree } from '@/app/riffs/riff-tree'
import { createClient } from '@/lib/supabase/server'
import type { RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import { PwaInstallPrompt } from '@/app/pwa-install-prompt'
import Link from 'next/link'

function BranchArtwork() {
    return (
        <svg aria-hidden="true" viewBox="0 0 360 260" fill="none" className="pointer-events-none absolute -right-8 top-1/2 hidden w-[22rem] -translate-y-1/2 text-violet-200/50 md:block">
            <path d="M74 130h86c25 0 30-53 57-53h35" stroke="currentColor" strokeWidth="1.5" />
            <path d="M74 130h86c25 0 30 53 57 53h35" stroke="currentColor" strokeWidth="1.5" />
            <path d="M74 130h178" stroke="currentColor" strokeOpacity=".25" strokeWidth="1" strokeDasharray="4 7" />
            <circle cx="74" cy="130" r="11" fill="#b7a5ff" fillOpacity=".2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="252" cy="77" r="8" fill="#b7a5ff" fillOpacity=".14" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="252" cy="183" r="8" fill="#b7a5ff" fillOpacity=".14" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="270" cy="130" r="4" fill="currentColor" />
            <path d="M160 130v-24" stroke="currentColor" strokeOpacity=".4" strokeWidth="1" />
            <circle cx="160" cy="98" r="3" fill="currentColor" fillOpacity=".7" />
        </svg>
    )
}

export default async function Home({ searchParams }: { searchParams: Promise<{ feed?: string | string[]; before?: string | string[]; beforeId?: string | string[] }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const params = await searchParams
    const feedMode = (Array.isArray(params.feed) ? params.feed[0] : params.feed) === 'following' ? 'following' : 'latest'
    const before = Array.isArray(params.before) ? params.before[0] : params.before
    const beforeId = Array.isArray(params.beforeId) ? params.beforeId[0] : params.beforeId
    const validBefore = before && !Number.isNaN(Date.parse(before)) ? new Date(before).toISOString() : null
    const validBeforeId = beforeId && /^[0-9a-f-]{36}$/i.test(beforeId) ? beforeId : null

    let followedIds: string[] = []
    let followingError: string | null = null
    if (feedMode === 'following') {
        const { data: follows, error: followError } = await supabase.from('riff_follows').select('followed_id').eq('follower_id', user.id)
        if (followError) { followedIds = []; followingError = followError.message }
        else followedIds = [...new Set((follows ?? []).map((follow) => follow.followed_id))]
    }

    const rootQuery = async (authors?: string[]) => {
        let query = supabase.from('riffs')
            .select('id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at')
            .is('parent_riff_id', null)
            .order('created_at', { ascending: false })
            .limit(20)
        if (authors) query = query.in('author_id', authors)
        if (validBefore && validBeforeId) query = query.or(`created_at.lt.${validBefore},and(created_at.eq.${validBefore},id.lt.${validBeforeId})`)
        else if (validBefore) query = query.lt('created_at', validBefore)
        return query
    }

    const { data: rootData, error: rootError } = feedMode === 'following' && followedIds.length === 0
        ? { data: [], error: null }
        : await rootQuery(feedMode === 'following' ? followedIds : undefined)

    const roots = (rootData ?? []) as RiffRecord[]
    const rootIds = roots.map((riff) => riff.id)
    const { data: riffData, error: branchError } = rootIds.length > 0
        ? await supabase
            .from('riffs')
            .select('id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at')
            .in('root_riff_id', rootIds)
            .order('created_at', { ascending: true })
            .limit(500)
        : { data: [], error: null }

    const riffMap = new Map<string, RiffRecord>()
    for (const riff of [...roots, ...(riffData ?? [])] as RiffRecord[]) riffMap.set(riff.id, riff)
    const riffs = [...riffMap.values()]
    const authorIds = [...new Set(riffs.map((riff) => riff.author_id))]
    const { data: authorData, error: authorError } = authorIds.length > 0
        ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', authorIds)
        : { data: [], error: null }
    const authors = (authorData ?? []) as RiffAuthor[]
    const { data: attachmentData, error: attachmentError } = riffs.length > 0
        ? await supabase.from('riff_attachments').select('id, riff_id, filename, storage_path, public_url, mime_type, byte_size').in('riff_id', riffs.map((riff) => riff.id))
        : { data: [], error: null }
    const rootCount = roots.length
    const riffError = rootError ?? branchError ?? authorError ?? attachmentError ?? (followingError ? { message: followingError } : null)

    return (
        <main className="min-h-dvh bg-transparent pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-zinc-100">
            <section aria-labelledby="feed-title" className="mx-auto max-w-5xl px-4 pt-5 sm:px-6 sm:pt-12">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 sm:mb-6 sm:text-xs">
                    <span className="size-1.5 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.85)]" />
                    Riff / Feed
                </div>

                <div className="relative isolate overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-[#121117] px-5 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:rounded-[1.75rem] sm:px-10 sm:py-12 sm:shadow-[0_28px_100px_rgba(0,0,0,0.3)]">
                    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_20%,rgba(139,92,246,0.2),transparent_44%),radial-gradient(ellipse_at_80%_100%,rgba(34,211,238,0.09),transparent_42%)]" />
                    <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-72 rounded-full border border-white/[0.04] sm:size-96" />
                    <div aria-hidden="true" className="absolute -right-2 -top-10 -z-10 size-56 rounded-full border border-white/[0.04] sm:right-12 sm:top-0 sm:size-72" />
                    <BranchArtwork />

                    <div className="relative max-w-xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/15 bg-violet-200/[0.06] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-violet-200">
                            <span className="size-1.5 rounded-full bg-violet-300" />
                            A feed for unfinished thoughts
                        </span>
                        <h1 id="feed-title" className="mt-4 text-[2.45rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:mt-6 sm:text-6xl sm:leading-[1.08]">
                            One thought can<br className="hidden sm:block" /> take its own <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">direction.</span>
                        </h1>
                        <p className="mt-3 max-w-md text-[13px] leading-5 text-zinc-400 sm:mt-5 sm:text-base sm:leading-7">
                            Riffs grow through branches. Your feed will gather the ideas and responses that find their way here.
                        </p>
                        <Link href="/create" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-300 px-4 py-3 text-sm font-semibold text-[#17121f] shadow-[0_8px_28px_rgba(167,139,250,0.18)] transition hover:bg-violet-200 sm:mt-7 sm:w-auto sm:py-2.5">
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" /></svg>
                            Start a Riff
                        </Link>
                    </div>
                </div>

                <PwaInstallPrompt />

                <div className="mt-7 flex items-end justify-between gap-4 sm:mt-8">
                    <div>
                        <h2 className="text-lg font-medium tracking-tight text-white">Your feed</h2>
                        <p className="mt-1 text-sm text-zinc-500">{feedMode === 'following' ? 'New thoughts from people you follow.' : 'The latest public thoughts from the community.'}</p>
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-xs text-zinc-500">{rootCount} {rootCount === 1 ? 'post' : 'posts'}</span>
                </div>

                <nav aria-label="Feed filter" className="mt-4 flex w-fit gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
                    <Link href="/" aria-current={feedMode === 'latest' ? 'page' : undefined} className={`min-h-9 rounded-lg px-4 py-2 text-xs font-medium ${feedMode === 'latest' ? 'bg-white/[0.08] text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}>Latest</Link>
                    <Link href="/?feed=following" aria-current={feedMode === 'following' ? 'page' : undefined} className={`min-h-9 rounded-lg px-4 py-2 text-xs font-medium ${feedMode === 'following' ? 'bg-white/[0.08] text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}>Following</Link>
                </nav>

                {riffError ? (
                    <div role="alert" className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] px-5 py-4 text-sm leading-6 text-amber-100/80">
                        Couldn’t load the feed. {riffError.message} Check that the Riff SQL upgrades have been run in Supabase.
                    </div>
                ) : riffs.length > 0 ? (
                    <div className="mt-4"><RiffTree riffs={riffs} authors={authors} attachments={attachmentData ?? []} /></div>
                ) : (
                <div className="mt-4 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-[#101014]/75 px-6 py-10 text-center">
                    <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-violet-200/10 bg-violet-300/[0.06] text-violet-200">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14m0-7h7m0 0c3.5 0 3.5-5 7-5m-7 5c3.5 0 3.5 5 7 5" />
                            <circle cx="5" cy="5" r="1.5" fill="currentColor" />
                            <circle cx="5" cy="19" r="1.5" fill="currentColor" />
                            <circle cx="19" cy="7" r="1.5" fill="currentColor" />
                            <circle cx="19" cy="17" r="1.5" fill="currentColor" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-medium text-zinc-200">{feedMode === 'following' ? 'Your following feed is quiet' : 'A little quiet before the first riff'}</h3>
                    <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500">{feedMode === 'following' ? 'Follow people from their profile pages, and their latest Riffs will show up here.' : 'When thoughts start branching out, you’ll find them here.'}</p>
                </div>
                )}

                {!riffError && roots.length === 20 && <div className="mt-6 flex justify-center"><Link href={`/?${feedMode === 'following' ? 'feed=following&' : ''}before=${encodeURIComponent(roots[roots.length - 1].created_at)}&beforeId=${roots[roots.length - 1].id}`} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5">Load older Riffs</Link></div>}
            </section>

            <BottomNavigation active="feed" />
        </main>
    )
}
