'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/icon'
import { createClient } from '@/lib/supabase/client'

export type NotificationItem = {
    id: string
    type: 'like' | 'comment' | 'repost' | 'follow' | 'branch' | 'new_riff'
    actorName: string
    actorUsername: string | null
    action: string
    excerpt: string | null
    createdAt: string
    readAt: string | null
    href: string
}

const icons: Record<NotificationItem['type'], IconName> = {
    like: 'heart', comment: 'comment', repost: 'repost', follow: 'user', branch: 'branch', new_riff: 'feed',
}

function dateLabel(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

export function NotificationInbox({ items: initialItems, userId }: { items: NotificationItem[]; userId: string }) {
    const router = useRouter()
    const [items, setItems] = useState(initialItems)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const unreadCount = items.filter((item) => !item.readAt).length

    async function markOneRead(item: NotificationItem) {
        if (item.readAt) { router.push(item.href); return }
        const readAt = new Date().toISOString()
        const { error: updateError } = await createClient().from('riff_notifications').update({ read_at: readAt }).eq('id', item.id).eq('recipient_id', userId)
        if (updateError) { setError('Could not mark that notification as read.'); return }
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt } : entry))
        window.dispatchEvent(new Event('riff:notifications-updated'))
        router.push(item.href)
    }

    async function markAllRead() {
        if (!unreadCount || busy) return
        setBusy(true)
        setError('')
        const readAt = new Date().toISOString()
        const { error: updateError } = await createClient().from('riff_notifications').update({ read_at: readAt }).eq('recipient_id', userId).is('read_at', null)
        if (updateError) setError('Could not update notifications. Try again.')
        else {
            setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })))
            window.dispatchEvent(new Event('riff:notifications-updated'))
        }
        setBusy(false)
    }

    return <div>
        <div className="mb-4 flex min-h-9 items-center justify-between gap-3">
            <p className="text-sm text-riff-muted">{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</p>
            {unreadCount > 0 && <button type="button" disabled={busy} onClick={() => void markAllRead()} className="text-sm font-medium text-riff-accent hover:underline disabled:opacity-50">{busy ? 'Updating…' : 'Mark all as read'}</button>}
        </div>
        {error && <p role="alert" className="mb-3 text-sm text-rose-300">{error}</p>}
        {items.length ? <ul className="divide-y divide-riff-outline overflow-hidden rounded-2xl border border-riff-outline bg-riff-surface">
            {items.map((item) => <li key={item.id}>
                <Link href={item.href} onClick={(event) => { event.preventDefault(); void markOneRead(item) }} className={`flex gap-3 px-4 py-4 transition hover:bg-white/[0.035] ${item.readAt ? '' : 'bg-white/[0.025]'}`}>
                    <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border ${item.readAt ? 'border-riff-outline bg-riff-surface-2 text-riff-muted' : 'border-riff-accent/25 bg-riff-accent/10 text-riff-accent'}`}><Icon name={icons[item.type]} size={17} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 text-sm leading-6"><strong className="font-semibold text-riff-text">{item.actorName}</strong>{' '}<span className="text-riff-muted">{item.action}</span></span>
                            {!item.readAt && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-riff-accent" />}
                        </span>
                        {item.excerpt && <span className="mt-1 block line-clamp-2 text-sm text-riff-muted">“{item.excerpt}”</span>}
                        <time dateTime={item.createdAt} className="mt-1 block text-xs text-riff-muted/75">{dateLabel(item.createdAt)}</time>
                    </span>
                </Link>
            </li>)}
        </ul> : <div className="rounded-2xl border border-dashed border-riff-outline px-6 py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-riff-surface-2 text-riff-muted"><Icon name="bell" size={21} /></span>
            <h2 className="mt-4 font-medium">Nothing here yet</h2>
            <p className="mt-1 text-sm text-riff-muted">When people interact with your Riffs or follow you, you’ll see it here.</p>
        </div>}
    </div>
}
