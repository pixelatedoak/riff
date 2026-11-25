import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { NewMessage } from '@/app/messages/new-message'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/server'

type Conversation = { id: string; user_one: string; user_two: string; updated_at: string }
type Message = { id: string; conversation_id: string; sender_id: string; content: string | null; giphy_id: string | null; created_at: string; read_at: string | null }
type UserProfile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }

function isMissingTable(error: { code?: string } | null) {
    return error?.code === '42P01' || error?.code === 'PGRST205'
}

export default async function MessagesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const [{ data: first, error: firstError }, { data: second, error: secondError }] = await Promise.all([
        supabase.from('riff_conversations').select('id, user_one, user_two, updated_at').eq('user_one', user.id),
        supabase.from('riff_conversations').select('id, user_one, user_two, updated_at').eq('user_two', user.id),
    ])
    const setupNeeded = isMissingTable(firstError) || isMissingTable(secondError)
    const conversations = [...(first ?? []), ...(second ?? [])] as Conversation[]
    conversations.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    const ids = conversations.map((conversation) => conversation.id)
    const otherIds = [...new Set(conversations.map((conversation) => conversation.user_one === user.id ? conversation.user_two : conversation.user_one))]
    const [{ data: profiles }, { data: messages, error: messagesError }, { data: unread, error: unreadError }] = await Promise.all([
        otherIds.length ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', otherIds) : Promise.resolve({ data: [] }),
        ids.length ? supabase.from('riff_messages').select('id, conversation_id, sender_id, content, giphy_id, created_at, read_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
        ids.length ? supabase.from('riff_messages').select('conversation_id').in('conversation_id', ids).eq('recipient_id', user.id).is('read_at', null) : Promise.resolve({ data: [], error: null }),
    ])
    const profileMap = new Map(((profiles ?? []) as UserProfile[]).map((profile) => [profile.id, profile]))
    const finalSetupNeeded = setupNeeded || isMissingTable(messagesError) || isMissingTable(unreadError)
    const gifSetupNeeded = messagesError?.code === '42703' || messagesError?.code === 'PGRST204'
    const loadFailed = Boolean((firstError && !isMissingTable(firstError)) || (secondError && !isMissingTable(secondError)) || (messagesError && !isMissingTable(messagesError)) || (unreadError && !isMissingTable(unreadError)))
    const latestByConversation = new Map<string, Message>()
    for (const message of (messages ?? []) as Message[]) if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message)
    const unreadCounts = new Map<string, number>()
    for (const message of (unread ?? []) as { conversation_id: string }[]) unreadCounts.set(message.conversation_id, (unreadCounts.get(message.conversation_id) ?? 0) + 1)

    return <main className="min-h-dvh bg-riff-bg px-4 pb-28 pt-8 text-riff-text sm:px-6">
        <section className="mx-auto max-w-2xl">
            <header className="relative mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl border border-riff-outline bg-riff-surface"><Icon name="message" size={20} /></span><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-riff-muted">Your conversations</p><h1 className="text-2xl font-semibold tracking-tight">Messages</h1></div></div>
                {!finalSetupNeeded && !loadFailed && <NewMessage userId={user.id} />}
            </header>
            {gifSetupNeeded ? <div className="rounded-2xl border border-riff-outline bg-riff-surface p-5"><h2 className="font-medium">Enable GIF messages</h2><p className="mt-2 text-sm text-riff-muted">Run <code className="text-riff-accent-soft">supabase/riff-giphy-messages.sql</code> in your Supabase SQL Editor, then reload this page.</p></div> : finalSetupNeeded ? <div className="rounded-2xl border border-riff-outline bg-riff-surface p-5">
                <h2 className="font-medium">Messages need one setup step</h2><p className="mt-2 text-sm text-riff-muted">Run <code className="text-riff-accent-soft">supabase/riff-messaging.sql</code> in your Supabase SQL Editor, then reload this page.</p>
            </div> : loadFailed ? <div role="alert" className="rounded-2xl border border-riff-outline bg-riff-surface p-5 text-sm text-riff-muted">Could not load your messages right now. Refresh the page and try again.</div> : conversations.length === 0 ? <div className="rounded-2xl border border-riff-outline bg-riff-surface px-5 py-14 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-riff-surface-2 text-riff-muted"><Icon name="message" size={21} /></span><h2 className="mt-4 font-medium">Your inbox is quiet</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-riff-muted">Start a conversation from someone’s profile, or use New message to find them by username.</p>
            </div> : <ul className="divide-y divide-riff-outline overflow-hidden rounded-2xl border border-riff-outline bg-riff-surface">
                {conversations.map((conversation) => {
                    const otherId = conversation.user_one === user.id ? conversation.user_two : conversation.user_one
                    const profile = profileMap.get(otherId)
                    const last = latestByConversation.get(conversation.id)
                    const unreadCount = unreadCounts.get(conversation.id) ?? 0
                    const title = profile?.full_name || (profile?.username ? `@${profile.username}` : 'Riff user')
                    return <li key={conversation.id}><Link href={`/messages/${conversation.id}`} className="flex items-center gap-3 px-4 py-4 transition hover:bg-riff-surface-2 sm:px-5">
                        {profile?.avatar_url ? <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={profile.avatar_url} alt="" className="size-11 shrink-0 rounded-full object-cover" />
                        </> : <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-riff-surface-3 font-medium text-riff-accent">{title.slice(0, 1).toUpperCase()}</span>}
                        <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{title}</span>{profile?.username && <span className="hidden truncate text-xs text-riff-muted sm:inline">@{profile.username}</span>}</span><span className={`mt-1 block truncate text-sm ${unreadCount ? 'font-medium text-riff-text' : 'text-riff-muted'}`}>{last ? `${last.sender_id === user.id ? 'You: ' : ''}${last.content || (last.giphy_id ? 'GIF' : '')}` : 'Start the conversation'}</span></span>
                        <span className="flex shrink-0 flex-col items-end gap-1.5">{last && <time className="text-[11px] text-riff-muted">{new Date(last.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>}{unreadCount > 0 && <span className="flex min-w-5 items-center justify-center rounded-full bg-riff-accent px-1.5 py-0.5 text-[10px] font-bold text-riff-accent-ink">{unreadCount > 99 ? '99+' : unreadCount}</span>}</span>
                    </Link></li>
                })}
            </ul>}
        </section>
        <BottomNavigation active="messages" />
    </main>
}
