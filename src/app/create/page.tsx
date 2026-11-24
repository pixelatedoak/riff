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
        <main className="min-h-screen bg-transparent pb-28 text-zinc-100">
            <section className="mx-auto max-w-2xl px-4 pt-8 sm:px-6 sm:pt-12">
                <Link href={parent ? `/r/${parent.id}` : '/'} className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-200">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" /></svg>
                    {parent ? 'Back to thread' : 'Back to feed'}
                </Link>
                <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">Write into the thread</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{parent ? 'Add a Riffed branch' : 'Start a Riff'}</h1>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{parent ? 'Take the original thought somewhere new.' : 'Choose whether your thought stays standalone or leaves room for branches.'}</p>
                <div className="mt-6">
                    <RiffComposer authorId={user.id} parent={parent} />
                </div>
            </section>
            <BottomNavigation active="none" />
        </main>
    )
}
