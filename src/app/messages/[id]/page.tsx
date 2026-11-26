import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ConversationList, type ConversationListItem } from '@/app/messages/conversation-list'
import { NewMessage } from '@/app/messages/new-message'
import { MessageThread, ThreadBackLink, type ThreadMessage } from '@/app/messages/[id]/message-thread'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/server'

type Conversation = { id: string; user_one: string; user_two: string; updated_at: string }
type Profile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }
type ListMessage = { id: string; conversation_id: string; sender_id: string; content: string | null; giphy_id: string | null; sticker_data: { label: string } | null; created_at: string; read_at: string | null }
type Preference = { conversation_id: string; is_muted: boolean; hidden_at: string | null }

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: conversation } = await supabase.from('riff_conversations')
        .select('id, user_one, user_two, updated_at').eq('id', id).maybeSingle()
    if (!conversation) notFound()
    const thread = conversation as Conversation
    const otherUserId = thread.user_one === user.id ? thread.user_two : thread.user_one
    const [{ data: profile }, { data: messageData, error: messageError }, { data: firstConversations }, { data: secondConversations }] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', otherUserId).maybeSingle(),
        supabase.from('riff_messages').select('id, sender_id, recipient_id, content, giphy_id, sticker_data, reply_to_message_id, created_at, read_at').eq('conversation_id', id).order('created_at', { ascending: false }).limit(100),
        supabase.from('riff_conversations').select('id, user_one, user_two, updated_at').eq('user_one', user.id),
        supabase.from('riff_conversations').select('id, user_one, user_two, updated_at').eq('user_two', user.id),
    ])
    const otherProfile = profile as Profile | null
    const isMissingMessageColumn = messageError?.code === '42703' || messageError?.code === 'PGRST204'
    const needsGifSetup = Boolean(isMissingMessageColumn && messageError?.message.toLowerCase().includes('giphy_id'))
    const needsChatFeaturesSetup = Boolean(isMissingMessageColumn && /(sticker_data|reply_to_message_id)/i.test(messageError?.message ?? ''))
    const title = otherProfile?.full_name || (otherProfile?.username ? `@${otherProfile.username}` : 'Riff user')
    const initialMessages = ((messageData ?? []) as ThreadMessage[]).reverse()
    const conversations = [...(firstConversations ?? []), ...(secondConversations ?? [])] as Conversation[]
    conversations.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    const conversationIds = conversations.map((item) => item.id)
    const otherIds = [...new Set(conversations.map((item) => item.user_one === user.id ? item.user_two : item.user_one))]
    const [{ data: profiles }, { data: listMessages }, { data: unreadMessages }, { data: preferences, error: preferencesError }] = await Promise.all([
        otherIds.length ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', otherIds) : Promise.resolve({ data: [] }),
        conversationIds.length ? supabase.from('riff_messages').select('id, conversation_id, sender_id, content, giphy_id, sticker_data, created_at, read_at').in('conversation_id', conversationIds).order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
        conversationIds.length ? supabase.from('riff_messages').select('conversation_id').in('conversation_id', conversationIds).eq('recipient_id', user.id).is('read_at', null) : Promise.resolve({ data: [] }),
        conversationIds.length ? supabase.from('riff_conversation_preferences').select('conversation_id, is_muted, hidden_at').eq('user_id', user.id).in('conversation_id', conversationIds) : Promise.resolve({ data: [], error: null }),
    ])
    const profileMap = new Map(((profiles ?? []) as Profile[]).map((item) => [item.id, item]))
    const latestMessages = new Map<string, ListMessage>()
    for (const item of (listMessages ?? []) as ListMessage[]) if (!latestMessages.has(item.conversation_id)) latestMessages.set(item.conversation_id, item)
    const unreadCounts = new Map<string, number>()
    for (const item of (unreadMessages ?? []) as { conversation_id: string }[]) unreadCounts.set(item.conversation_id, (unreadCounts.get(item.conversation_id) ?? 0) + 1)
    const preferenceMap = new Map(((preferences ?? []) as Preference[]).map((item) => [item.conversation_id, item]))
    const sidebarConversations: ConversationListItem[] = conversations.flatMap((item) => {
        const preference = preferenceMap.get(item.id)
        if (preference?.hidden_at) return []
        const personId = item.user_one === user.id ? item.user_two : item.user_one
        const person = profileMap.get(personId)
        const last = latestMessages.get(item.id)
        return [{
            id: item.id,
            name: person?.full_name || person?.username || 'Riff user',
            username: person?.username ?? null,
            avatarUrl: person?.avatar_url ?? null,
            preview: last?.content || (last?.sticker_data ? `Sticker · ${last.sticker_data.label}` : last?.giphy_id ? 'GIF' : 'No messages yet'),
            senderId: last?.sender_id ?? null,
            createdAt: last?.created_at ?? null,
            unreadCount: unreadCounts.get(item.id) ?? 0,
            isMuted: preference?.is_muted ?? false,
        }]
    })

    return <main className="h-dvh overflow-hidden bg-riff-bg pt-[env(safe-area-inset-top)] text-riff-text md:p-5 lg:p-7">
        <section className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] overflow-hidden bg-transparent md:rounded-[1.75rem] md:border md:border-riff-outline/80 md:bg-riff-surface/35">
            <aside className="hidden w-[19rem] shrink-0 flex-col p-4 lg:flex xl:w-[21rem]">
                <div className="mb-4 flex shrink-0 items-center justify-between px-1">
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-riff-muted">Direct messages</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Chats</h1></div>
                    <NewMessage userId={user.id} />
                </div>
                <ConversationList userId={user.id} conversations={sidebarConversations} preferencesNeedSetup={preferencesError?.code === '42P01' || preferencesError?.code === 'PGRST205'} layout="sidebar" activeConversationId={id} />
            </aside>
            <div className="hidden w-px shrink-0 bg-riff-outline md:block" />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="relative z-10 flex h-[5.25rem] shrink-0 items-center justify-center border-b border-riff-outline/70 bg-transparent px-3 py-2 sm:h-[5.5rem]">
                <div className="absolute left-3 top-3 md:hidden"><ThreadBackLink /></div>
                <div className="absolute left-3 hidden md:flex">
                    <Link href="/messages" aria-label="Back to chats" className="flex size-9 items-center justify-center rounded-full text-riff-muted transition hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="chevron-left" size={19} /></Link>
                </div>
                <Link href={otherProfile?.username ? `/u/${otherProfile.username}` : '/messages'} className="flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-1 transition hover:opacity-80">
                    {otherProfile?.avatar_url ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={otherProfile.avatar_url} alt="" className="size-9 rounded-full object-cover sm:size-10" />
                    </> : <span className="flex size-9 items-center justify-center rounded-full bg-riff-surface-2 text-sm font-semibold text-riff-text sm:size-10">{title.slice(0, 1).toUpperCase()}</span>}
                    <span className="flex min-w-0 flex-col items-start leading-tight"><span className="max-w-[55vw] truncate text-xs font-semibold text-riff-text sm:max-w-none sm:text-sm">{title}</span>{otherProfile?.username && otherProfile.full_name && <span className="max-w-[45vw] truncate text-[10px] text-riff-muted sm:max-w-none sm:text-xs">@{otherProfile.username}</span>}</span>
                </Link>
            </header>
            <MessageThread key={id} conversationId={id} userId={user.id} otherUserId={otherUserId} otherName={title} initialMessages={initialMessages} needsGifSetup={needsGifSetup} needsChatFeaturesSetup={needsChatFeaturesSetup} />
            </div>
        </section>
    </main>
}
