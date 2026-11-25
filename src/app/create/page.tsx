import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { RiffComposer } from '@/app/create/riff-composer'
import { createClient } from '@/lib/supabase/server'

export default async function CreateRiffPage({ searchParams }: { searchParams: Promise<{ parent?: string | string[] }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const params = await searchParams
    const parentId = Array.isArray(params.parent) ? params.parent[0] : params.parent
    let parent: { id: string; author_id: string; content: string; kind: 'riff' | 'black'; author_name: string } | null = null

    if (parentId) {
        if (!/^[0-9a-f-]{36}$/i.test(parentId)) notFound()

        const { data: parentRiff } = await supabase
            .from('riffs')
            .select('id, author_id, content, kind, allow_branches')
            .eq('id', parentId)
            .maybeSingle()

        if (!parentRiff || parentRiff.kind !== 'riff' || parentRiff.allow_branches === false) notFound()

        const { data: parentProfile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', parentRiff.author_id)
            .maybeSingle()

        parent = {
            ...parentRiff,
            author_name: parentProfile?.full_name || (parentProfile?.username ? `@${parentProfile.username}` : 'a Riff user'),
        }
    }

    return (
        <main className="min-h-dvh bg-riff-bg pb-28 text-riff-text">
            <section className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-10 lg:pt-12">
                <Link href={parent ? `/r/${parent.id}` : '/'} className="inline-flex items-center gap-2 text-sm text-riff-muted transition hover:text-riff-text">
                    <span aria-hidden="true">←</span>
                    {parent ? 'Back to thread' : 'Cancel'}
                </Link>
                <div className="mb-6 mt-6 flex items-end justify-between gap-4 sm:mt-8">
                    <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-riff-faint">{parent ? 'Thread reply' : 'Create'}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-riff-text">{parent ? 'New branch' : 'New post'}</h1></div>
                    <p className="hidden max-w-sm text-right text-sm text-riff-muted sm:block">{parent ? 'Add your perspective to this thread.' : 'Write a thought. Add media if you want.'}</p>
                </div>
                <div>
                    <RiffComposer authorId={user.id} parent={parent} />
                </div>
            </section>
            <BottomNavigation active="none" />
        </main>
    )
}
