import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { RiffPosts } from '@/app/riffs/riff-tree'
import { createClient } from '@/lib/supabase/server'
import type { RiffAttachment, RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import { Icon } from '@/components/icon'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Explore' }

type SearchParams = Promise<{ q?: string | string[]; sort?: string | string[]; page?: string | string[] }>
type SocialScore = { riff_id: string; likes: number | string; comments: number | string; reposts: number | string; branches: number | string }

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
}

function avatarInitials(profile: { full_name: string | null; username: string | null }) {
    return (profile.full_name || profile.username || 'R')
        .split(/[\s_]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export default async function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams
    const rawQuery = (first(params.q) ?? '').trim().slice(0, 80)
    const query = rawQuery.replace(/\s+/g, ' ')
    const escapedQuery = query.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
    const sort = first(params.sort) === 'recent' ? 'recent' : 'trending'
    const requestedPage = Number(first(params.page) ?? '1')
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1000) : 1
    const pageSize = 20
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    let posts: RiffRecord[] = []
    let authors: RiffAuthor[] = []
    let attachments: RiffAttachment[] = []
    let profiles: { id: string; username: string; full_name: string | null; avatar_url: string | null }[] = []
    let postError = ''
    let profileError = ''
    let exploreNote = ''
    let totalMatches = 0

    if (query) {
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        const [postResult, usernameResult, nameResult] = await Promise.all([
            supabase.from('riffs')
                .select('id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at', { count: 'exact' })
                .ilike('content', `%${escapedQuery}%`)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .range(from, to),
            supabase.from('profiles').select('id, username, full_name, avatar_url').ilike('username', `%${escapedQuery}%`).limit(12),
            supabase.from('profiles').select('id, username, full_name, avatar_url').ilike('full_name', `%${escapedQuery}%`).limit(12),
        ])
        postError = postResult.error?.message ?? ''
        profileError = usernameResult.error?.message ?? nameResult.error?.message ?? ''
        totalMatches = postResult.count ?? 0
        posts = (postResult.data ?? []) as RiffRecord[]
        const profileMap = new Map<string, (typeof profiles)[number]>()
        for (const profile of [...(usernameResult.data ?? []), ...(nameResult.data ?? [])]) profileMap.set(profile.id, profile)
        profiles = [...profileMap.values()].slice(0, 12)
    } else {
        const rootQuery = supabase.from('riffs')
            .select('id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at')
            .is('parent_riff_id', null)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(100)
        const { data: rootData, error: rootError } = await rootQuery

        if (rootError) postError = rootError.message
        const roots = (rootData ?? []) as RiffRecord[]
        let rankedRoots = roots
        if (sort === 'trending' && roots.length) {
            const { data: scoreData, error: scoreError } = await supabase.rpc('get_riff_social_stats', { p_riff_ids: roots.map((riff) => riff.id) })
            if (!scoreError && scoreData) {
                const scores = new Map((scoreData as SocialScore[]).map((row) => [row.riff_id,
                    Number(row.likes) + Number(row.comments) * 2 + Number(row.reposts) * 3 + Number(row.branches) * 2,
                ]))
                rankedRoots = [...roots].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || b.created_at.localeCompare(a.created_at))
            } else exploreNote = 'Popularity data is unavailable, so these are sorted by newest.'
        }
        const selectedRoots = sort === 'recent' ? rankedRoots.slice(0, pageSize) : rankedRoots.slice(0, pageSize)
        totalMatches = roots.length
        const rootIds = selectedRoots.map((riff) => riff.id)
        posts = selectedRoots
        if (rootIds.length) {
            const { data: branchData, error: branchError } = await supabase.from('riffs')
                .select('id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at')
                .in('root_riff_id', rootIds).not('parent_riff_id', 'is', null).order('created_at', { ascending: true }).limit(500)
            if (branchError) postError = branchError.message
            posts = [...selectedRoots, ...((branchData ?? []) as RiffRecord[])]
        }
    }

    if (posts.length) {
        const authorIds = [...new Set(posts.map((post) => post.author_id))]
        const [authorResult, attachmentResult] = await Promise.all([
            supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', authorIds),
            supabase.from('riff_attachments').select('id, riff_id, filename, storage_path, public_url, mime_type, byte_size, media_filter, sticker, sort_order').in('riff_id', posts.map((post) => post.id)).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
        ])
        authors = (authorResult.data ?? []) as RiffAuthor[]
        attachments = attachmentResult.data ?? []
        if (authorResult.error) postError ||= authorResult.error.message
        if (attachmentResult.error) postError ||= attachmentResult.error.message
    }

    const nextSearch = (nextPage: number) => `/explore?q=${encodeURIComponent(query)}&page=${nextPage}`
    const totalPages = Math.max(1, Math.ceil(totalMatches / pageSize))

    return (
        <main className="min-h-dvh bg-riff-bg pb-[calc(6rem+env(safe-area-inset-bottom))] text-riff-text">
            <section className="mx-auto max-w-3xl px-4 pb-8 pt-7 sm:px-6 sm:pt-10 lg:max-w-5xl lg:px-10 lg:pt-14">
                <header className="border-b border-riff-outline pb-5 sm:pb-6">
                    <p className="riff-overline">Find people and ideas</p>
                    <h1 className="riff-page-heading mt-2">Explore</h1>
                    <form action="/explore" method="get" role="search" className="mt-5 flex gap-2">
                        <label className="relative min-w-0 flex-1">
                            <span className="sr-only">Search Riffs and people</span>
                            <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-riff-faint" />
                            <input type="search" name="q" defaultValue={query} maxLength={80} placeholder="Search posts or people" className="h-11 w-full rounded-control border border-riff-outline bg-riff-surface px-10 pr-3 text-sm text-riff-text outline-none placeholder:text-riff-faint focus:border-riff-accent/60 focus:ring-2 focus:ring-riff-accent/15" />
                        </label>
                        <button type="submit" className={buttonVariants({ size: 'default' })}>Search</button>
                    </form>
                </header>

                {query ? (
                    <section aria-label="Search results" className="mt-6">
                        <h2 className="text-sm font-semibold">Results for “{query}”</h2>
                        {profileError && <p role="alert" className="mt-3 text-sm text-rose-200">Couldn’t search profiles: {profileError}</p>}
                        {profiles.length > 0 && (
                            <div className="mt-4">
                                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-riff-faint">People</h3>
                                <div className="flex flex-wrap gap-2">
                                {profiles.map((profile) => (
                                    <Link key={profile.id} href={`/u/${encodeURIComponent(profile.username)}`} className="flex min-w-48 items-center gap-3 rounded-card border border-riff-outline bg-riff-surface px-3 py-2.5 transition hover:bg-riff-surface-2">
                                        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-riff-surface-3 text-xs font-semibold text-riff-accent">
                                            {profile.avatar_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                                            ) : avatarInitials(profile)}
                                        </span>
                                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{profile.full_name || `@${profile.username}`}</span><span className="block truncate text-xs text-riff-muted">@{profile.username}</span></span>
                                    </Link>
                                ))}
                                </div>
                            </div>
                        )}
                        <div className="mb-3 mt-6 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Posts</h3><span className="text-xs text-riff-faint">{totalMatches} matches</span></div>
                        {postError ? <Card role="alert" className="p-4 text-sm text-rose-100">Search could not finish: {postError}</Card> : posts.length ? <RiffPosts riffs={posts} authors={authors} attachments={attachments} /> : <Card className="p-6 text-center text-sm text-riff-muted">No posts matched that search.</Card>}
                        {!postError && totalPages > 1 && <nav aria-label="Search pages" className="mt-5 flex justify-between"><span>{page > 1 && <Link className={buttonVariants({ variant: 'secondary', size: 'compact' })} href={nextSearch(page - 1)}>Previous</Link>}</span><span>{page < totalPages && <Link className={buttonVariants({ variant: 'secondary', size: 'compact' })} href={nextSearch(page + 1)}>More results</Link>}</span></nav>}
                    </section>
                ) : (
                    <section aria-label="Explore posts" className="mt-6">
                        <div className="mb-4 flex items-end justify-between gap-3">
                            <div><h2 className="text-base font-semibold">{sort === 'trending' ? 'Popular' : 'Recently posted'}</h2><p className="mt-1 text-xs text-riff-muted">{sort === 'trending' ? 'Active conversations from recent posts.' : 'The newest posts from the community.'}</p></div>
                            <nav aria-label="Explore sort" className="flex gap-1 rounded-xl border border-riff-outline bg-riff-surface-low p-1">
                                <Link href="/explore?sort=trending" aria-current={sort === 'trending' ? 'page' : undefined} className={cn(buttonVariants({ variant: sort === 'trending' ? 'secondary' : 'ghost', size: 'compact' }), 'min-h-8 border-transparent px-2.5')}>Popular</Link>
                                <Link href="/explore?sort=recent" aria-current={sort === 'recent' ? 'page' : undefined} className={cn(buttonVariants({ variant: sort === 'recent' ? 'secondary' : 'ghost', size: 'compact' }), 'min-h-8 border-transparent px-2.5')}>Recent</Link>
                            </nav>
                        </div>
                        {exploreNote && <p className="mb-3 text-xs text-riff-faint">{exploreNote}</p>}
                        {postError ? <Card role="alert" className="p-4 text-sm text-rose-100">Couldn’t load Explore: {postError}</Card> : posts.length ? <RiffPosts riffs={posts} authors={authors} attachments={attachments} /> : <Card className="p-8 text-center text-sm text-riff-muted">Nothing to explore yet. Check back after people start posting.</Card>}
                    </section>
                )}
            </section>
            <BottomNavigation active="explore" />
        </main>
    )
}
