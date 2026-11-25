import { redirect } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { RiffTree } from '@/app/riffs/riff-tree'
import { createClient } from '@/lib/supabase/server'
import type { RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import { PwaInstallPrompt } from '@/app/pwa-install-prompt'
import { Icon } from '@/components/icon'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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
            .is('deleted_at', null)
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
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(500)
        : { data: [], error: null }

    const riffMap = new Map<string, RiffRecord>()
    for (const riff of [...roots, ...(riffData ?? [])] as RiffRecord[]) riffMap.set(riff.id, riff)
    const riffs = [...riffMap.values()]
    const authorIds = [...new Set(riffs.map((riff) => riff.author_id))]
    const [authorResult, attachmentResult] = await Promise.all([
        authorIds.length > 0
            ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', authorIds)
            : Promise.resolve({ data: [], error: null }),
        riffs.length > 0
            ? supabase.from('riff_attachments').select('id, riff_id, filename, storage_path, public_url, mime_type, byte_size, media_filter, sticker, sort_order').in('riff_id', riffs.map((riff) => riff.id)).order('sort_order', { ascending: true }).order('created_at', { ascending: true })
            : Promise.resolve({ data: [], error: null }),
    ])
    const { data: authorData, error: authorError } = authorResult
    const { data: attachmentData, error: attachmentError } = attachmentResult
    const authors = (authorData ?? []) as RiffAuthor[]
    const rootCount = roots.length
    const riffError = rootError ?? branchError ?? authorError ?? attachmentError ?? (followingError ? { message: followingError } : null)

    return (
        <main className="min-h-dvh bg-riff-bg pb-[calc(6rem+env(safe-area-inset-bottom))] text-riff-text">
            <div className="mx-auto max-w-6xl px-4 pb-8 pt-7 sm:px-6 sm:pt-10">
                <div className="mx-auto max-w-3xl lg:max-w-4xl">
                    <section aria-labelledby="feed-title" className="min-w-0">
                        <header className="mb-6 flex items-end justify-between gap-4 border-b border-riff-outline pb-5 sm:mb-7 sm:pb-6">
                            <div>
                                <p className="riff-overline">Your idea stream</p>
                                <h1 id="feed-title" className="riff-page-heading mt-2">Feed</h1>
                                <p className="mt-2 text-sm leading-6 text-riff-muted">Thoughts are better when they can grow.</p>
                            </div>
                            <Link href="/create" className={cn(buttonVariants({ size: 'compact' }), 'hidden shrink-0 sm:inline-flex')}><Icon name="plus" size={16} />Write</Link>
                        </header>

                        <div className="mb-5 lg:hidden"><PwaInstallPrompt /></div>

                        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-riff-text">{feedMode === 'following' ? 'Following' : 'Latest'}</h2>
                                <p className="mt-1 text-xs text-riff-faint">{feedMode === 'following' ? 'New from people you follow.' : 'Recent public thoughts from the community.'}</p>
                            </div>
                            <span className="text-xs text-riff-faint">{rootCount} {rootCount === 1 ? 'post' : 'posts'}</span>
                        </div>

                        <nav aria-label="Feed filter" className="mb-4 inline-flex rounded-xl border border-riff-outline bg-riff-surface-low p-1">
                            <Link href="/" aria-current={feedMode === 'latest' ? 'page' : undefined} className={cn(buttonVariants({ variant: feedMode === 'latest' ? 'secondary' : 'ghost', size: 'compact' }), 'min-h-9 border-transparent')}>Latest</Link>
                            <Link href="/?feed=following" aria-current={feedMode === 'following' ? 'page' : undefined} className={cn(buttonVariants({ variant: feedMode === 'following' ? 'secondary' : 'ghost', size: 'compact' }), 'min-h-9 border-transparent')}>Following</Link>
                        </nav>

                        {riffError ? (
                            <Card role="alert" className="border-rose-200/15 bg-rose-200/[0.04] p-4 text-sm leading-6 text-rose-100">Couldn’t load the feed. {riffError.message} Check the Riff database setup in Supabase.</Card>
                        ) : riffs.length > 0 ? (
                            <div><RiffTree riffs={riffs} authors={authors} attachments={attachmentData ?? []} /></div>
                        ) : (
                            <Card className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                                <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-riff-outline bg-riff-surface-2 text-riff-accent-soft"><Icon name="branch" size={21} /></span>
                                <h3 className="text-base font-semibold text-riff-text">{feedMode === 'following' ? 'Your following feed is quiet' : 'Nothing has branched yet'}</h3>
                                <p className="mt-2 max-w-sm text-sm leading-6 text-riff-muted">{feedMode === 'following' ? 'Follow people from their profiles to see their latest Riffs here.' : 'Start a post and invite others into the conversation.'}</p>
                                <Link href="/create" className={cn(buttonVariants({ variant: 'secondary', size: 'compact' }), 'mt-5')}><Icon name="plus" size={15} />Start a Riff</Link>
                            </Card>
                        )}

                        {!riffError && roots.length === 20 && <div className="mt-6 flex justify-center"><Link href={`/?${feedMode === 'following' ? 'feed=following&' : ''}before=${encodeURIComponent(roots[roots.length - 1].created_at)}&beforeId=${roots[roots.length - 1].id}`} className={buttonVariants({ variant: 'secondary', size: 'compact' })}>Load older Riffs</Link></div>}
                    </section>
                </div>
            </div>
            <BottomNavigation active="feed" />
        </main>
    )
}
