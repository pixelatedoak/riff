'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/icon'

export function MessageNavItem({ selected }: { selected: boolean }) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let alive = true
        const supabase = createClient()
        async function updateCount() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const [{ data: unreadMessages }, { data: mutedChats }] = await Promise.all([
                supabase.from('riff_messages').select('conversation_id').eq('recipient_id', user.id).is('read_at', null),
                supabase.from('riff_conversation_preferences').select('conversation_id').eq('user_id', user.id).eq('is_muted', true),
            ])
            const mutedIds = new Set((mutedChats ?? []).map((chat) => chat.conversation_id))
            const unread = (unreadMessages ?? []).filter((message) => !mutedIds.has(message.conversation_id)).length
            if (alive) setCount(unread)
        }
        void updateCount()
        const onUpdate = () => void updateCount()
        window.addEventListener('riff:messages-updated', onUpdate)
        let channel: ReturnType<typeof supabase.channel> | undefined
        void supabase.auth.getUser().then(({ data: { user } }) => {
            if (!alive || !user) return
            channel = supabase.channel(`riff-message-count-${user.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'riff_messages', filter: `recipient_id=eq.${user.id}` }, onUpdate)
                .subscribe()
        })
        return () => {
            alive = false
            window.removeEventListener('riff:messages-updated', onUpdate)
            if (channel) void supabase.removeChannel(channel)
        }
    }, [])

    return <Link href="/messages" aria-label={count ? `Messages, ${count} unread` : 'Messages'} aria-current={selected ? 'page' : undefined} title="Messages" className={`relative flex size-10 items-center justify-center rounded-full ${selected ? 'bg-riff-surface-3 text-riff-accent' : 'text-riff-muted transition hover:bg-white/5 hover:text-riff-text'}`}>
        <Icon name="message" size={18} strokeWidth={1.8} />
        {count > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full border border-riff-surface bg-riff-accent px-1 text-[9px] font-bold leading-4 text-riff-accent-ink">{count > 9 ? '9+' : count}</span>}
    </Link>
}
