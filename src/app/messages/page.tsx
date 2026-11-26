import { redirect } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { ConversationList } from '@/app/messages/conversation-list'
import { NewMessage } from '@/app/messages/new-message'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/server'

type Conversation = { id: string; user_one: string; user_two: string; updated_at: string }
type Message = { id: string; conversation_id: string; sender_id: string; content: string | null; giphy_id: string | null; sticker_data: { label: string } | null; created_at: string; read_at: string | null }
type UserProfile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }
type ConversationPreference = { conversation_id: string; is_muted: boolean; hidden_at: string | null }

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
    const [{ data: profiles }, { data: messages, error: messagesError }, { data: unread, error: unreadError }, { data: preferences, error: preferencesError }] = await Promise.all([
        otherIds.length ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', otherIds) : Promise.resolve({ data: [] }),
        ids.length ? supabase.from('riff_messages').select('id, conversation_id, sender_id, content, giphy_id, sticker_data, created_at, read_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
        ids.length ? supabase.from('riff_messages').select('conversation_id').in('conversation_id', ids).eq('recipient_id', user.id).is('read_at', null) : Promise.resolve({ data: [], error: null }),
        ids.length ? supabase.from('riff_conversation_preferences').select('conversation_id, is_muted, hidden_at').eq('user_id', user.id).in('conversation_id', ids) : Promise.resolve({ data: [], error: null }),
    ])
    const profileMap = new Map(((profiles ?? []) as UserProfile[]).map((profile) => [profile.id, profile]))
    const finalSetupNeeded = setupNeeded || isMissingTable(messagesError) || isMissingTable(unreadError)
    const gifSetupNeeded = messagesError?.code === '42703' || messagesError?.code === 'PGRST204'
    const chatFeaturesNeedSetup = Boolean(gifSetupNeeded && /sticker_data|reply_to_message_id/i.test(messagesError?.message ?? ''))
    const loadFailed = Boolean((firstError && !isMissingTable(firstError)) || (secondError && !isMissingTable(secondError)) || (messagesError && !isMissingTable(messagesError) && !chatFeaturesNeedSetup) || (unreadError && !isMissingTable(unreadError)))
    const latestByConversation = new Map<string, Message>()
    for (const message of (messages ?? []) as Message[]) if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message)
    const unreadCounts = new Map<string, number>()
    for (const message of (unread ?? []) as { conversation_id: string }[]) unreadCounts.set(message.conversation_id, (unreadCounts.get(message.conversation_id) ?? 0) + 1)
    const preferenceMap = new Map(((preferences ?? []) as ConversationPreference[]).map((preference) => [preference.conversation_id, preference]))
    const listItems = conversations.flatMap((conversation) => {
        const preference = preferenceMap.get(conversation.id)
        if (preference?.hidden_at) return []
        const otherId = conversation.user_one === user.id ? conversation.user_two : conversation.user_one
        const profile = profileMap.get(otherId)
        const last = latestByConversation.get(conversation.id)
        return [{
            id: conversation.id,
            name: profile?.full_name || profile?.username || 'Riff user',
            username: profile?.username ?? null,
            avatarUrl: profile?.avatar_url ?? null,
            preview: last?.content || (last?.sticker_data ? `Sticker · ${last.sticker_data.label}` : last?.giphy_id ? 'GIF' : 'No messages yet'),
            senderId: last?.sender_id ?? null,
            createdAt: last?.created_at ?? null,
            unreadCount: unreadCounts.get(conversation.id) ?? 0,
            isMuted: preference?.is_muted ?? false,
        }]
    })
    const preferencesNeedSetup = Boolean(preferencesError && isMissingTable(preferencesError))

    return <main className="min-h-dvh bg-riff-bg px-4 pb-28 pt-7 text-riff-text sm:px-6 sm:pt-10">
        <section className="mx-auto max-w-3xl">
            <header className="relative mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl border border-riff-outline bg-riff-surface text-riff-muted"><Icon name="message" size={19} /></span>
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-riff-muted">Direct messages</p><h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">Chats</h1></div>
                </div>
                {!finalSetupNeeded && !loadFailed && <NewMessage userId={user.id} />}
            </header>
            {gifSetupNeeded ? <div className="mb-4 rounded-2xl border border-riff-outline bg-riff-surface p-4"><h2 className="text-sm font-medium">Enable GIF messages</h2><p className="mt-1.5 text-xs leading-5 text-riff-muted">Run <code className="text-riff-accent-soft">supabase/riff-giphy-messages.sql</code> in Supabase, then reload.</p></div> : null}
            {finalSetupNeeded && <div className="mb-4 rounded-2xl border border-riff-outline bg-riff-surface p-4"><h2 className="text-sm font-medium">Messages need one setup step</h2><p className="mt-1.5 text-xs leading-5 text-riff-muted">Run <code className="text-riff-accent-soft">supabase/riff-messaging.sql</code> in Supabase, then reload.</p></div>}
            {chatFeaturesNeedSetup && <div className="mb-4 rounded-2xl border border-riff-outline bg-riff-surface p-4"><h2 className="text-sm font-medium">Enable replies and stickers</h2><p className="mt-1.5 text-xs leading-5 text-riff-muted">Run <code className="text-riff-accent-soft">supabase/riff-chat-stickers-replies.sql</code> in Supabase, then reload.</p></div>}
            {loadFailed ? <div role="alert" className="rounded-2xl border border-riff-outline bg-riff-surface p-5 text-sm text-riff-muted">Could not load your chats right now. Refresh the page and try again.</div> : !finalSetupNeeded && <ConversationList userId={user.id} conversations={listItems} preferencesNeedSetup={preferencesNeedSetup} />}
        </section>
        <BottomNavigation active="messages" />
    </main>
}
