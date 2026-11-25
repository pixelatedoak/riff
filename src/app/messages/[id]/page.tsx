import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { MessageThread, ThreadBackLink, type ThreadMessage } from '@/app/messages/[id]/message-thread'
import { createClient } from '@/lib/supabase/server'

type Conversation = { id: string; user_one: string; user_two: string }
type Profile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: conversation } = await supabase.from('riff_conversations')
        .select('id, user_one, user_two').eq('id', id).maybeSingle()
    if (!conversation) notFound()
    const thread = conversation as Conversation
    const otherUserId = thread.user_one === user.id ? thread.user_two : thread.user_one
    const [{ data: profile }, { data: messageData, error: messageError }] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', otherUserId).maybeSingle(),
        supabase.from('riff_messages').select('id, sender_id, recipient_id, content, giphy_id, created_at, read_at').eq('conversation_id', id).order('created_at', { ascending: false }).limit(100),
    ])
    const otherProfile = profile as Profile | null
    const needsGifSetup = messageError?.code === '42703' || messageError?.code === 'PGRST204'
    const title = otherProfile?.full_name || (otherProfile?.username ? `@${otherProfile.username}` : 'Riff user')
    const initialMessages = ((messageData ?? []) as ThreadMessage[]).reverse()

    return <main className="min-h-dvh bg-riff-bg px-3 pb-24 pt-5 text-riff-text sm:px-6 sm:pt-8">
        <section className="mx-auto flex h-[calc(100dvh-8rem)] min-h-0 max-w-2xl flex-col overflow-hidden rounded-2xl border border-riff-outline bg-riff-surface">
            <header className="flex items-center gap-3 border-b border-riff-outline px-3 py-3 sm:px-5">
                <ThreadBackLink />
                <Link href={otherProfile?.username ? `/u/${otherProfile.username}` : '/messages'} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 hover:opacity-80">
                    {otherProfile?.avatar_url ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={otherProfile.avatar_url} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                    </> : <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-riff-surface-3 font-medium text-riff-accent">{title.slice(0, 1).toUpperCase()}</span>}
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{title}</span>{otherProfile?.username && <span className="block truncate text-xs text-riff-muted">@{otherProfile.username}</span>}</span>
                </Link>
            </header>
            <MessageThread key={id} conversationId={id} userId={user.id} otherUserId={otherUserId} initialMessages={initialMessages} needsGifSetup={needsGifSetup} />
        </section>
        <BottomNavigation active="messages" />
    </main>
}
