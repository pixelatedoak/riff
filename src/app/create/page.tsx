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
            <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-10 lg:pt-14">
                <Link href={parent ? `/r/${parent.id}` : '/'} className="inline-flex items-center gap-2 text-sm text-riff-muted transition hover:text-riff-text">
                    <span aria-hidden="true">←</span>
                    {parent ? 'Back to thread' : 'Back to feed'}
                </Link>
                <p className="riff-overline mt-8">Write into the thread</p>
                <h1 className="riff-page-heading mt-2">{parent ? 'Add a Riffed branch' : 'Start a Riff'}</h1>
                <p className="mt-2 text-sm leading-6 text-riff-muted">{parent ? 'Take the original thought somewhere new.' : 'Choose whether your thought stays standalone or leaves room for branches.'}</p>
                <div className="mt-8">
                    <RiffComposer authorId={user.id} parent={parent} />
                </div>
            </section>
            <BottomNavigation active="none" />
        </main>
    )
}
