'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/client'

export type ConversationListItem = {
    id: string
    name: string
    username: string | null
    avatarUrl: string | null
    preview: string
    senderId: string | null
    createdAt: string | null
    unreadCount: number
    isMuted: boolean
}

function dateLabel(value: string | null) {
    if (!value) return ''
    const date = new Date(value)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ConversationList({ userId, conversations, preferencesNeedSetup = false, layout = 'page', activeConversationId }: {
    userId: string
    conversations: ConversationListItem[]
    preferencesNeedSetup?: boolean
    layout?: 'page' | 'sidebar'
    activeConversationId?: string
}) {
    const [items, setItems] = useState(conversations)
    const [query, setQuery] = useState('')
    const [confirming, setConfirming] = useState<ConversationListItem | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [error, setError] = useState('')

    const filtered = useMemo(() => {
        const term = query.trim().toLocaleLowerCase()
        if (!term) return items
        return items.filter((item) => `${item.name} ${item.username ?? ''} ${item.preview}`.toLocaleLowerCase().includes(term))
    }, [items, query])

    async function savePreference(item: ConversationListItem, changes: { isMuted?: boolean; hiddenAt?: string }) {
        setBusyId(item.id)
        setError('')
        const next = { ...item, ...(changes.isMuted === undefined ? {} : { isMuted: changes.isMuted }) }
        const { error: saveError } = await createClient().from('riff_conversation_preferences').upsert({
            user_id: userId,
            conversation_id: item.id,
            is_muted: changes.isMuted ?? item.isMuted,
            hidden_at: changes.hiddenAt ?? null,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,conversation_id' })
        setBusyId(null)
        if (saveError) {
            setError(saveError.code === '42P01' || saveError.code === 'PGRST205'
                ? 'Run supabase/riff-messaging-preferences.sql in Supabase to enable chat actions.'
                : 'Could not save that chat setting. Try again.')
            return
        }
        if (changes.hiddenAt) {
            setItems((current) => current.filter((entry) => entry.id !== item.id))
            setConfirming(null)
            window.dispatchEvent(new Event('riff:messages-updated'))
            return
        }
        setItems((current) => current.map((entry) => entry.id === item.id ? next : entry))
        window.dispatchEvent(new Event('riff:messages-updated'))
    }

    return <>
        <div className="relative shrink-0">
            <label className="flex h-12 items-center gap-3 rounded-2xl border border-riff-outline bg-riff-bg/55 px-4 transition focus-within:border-riff-accent/45">
                <Icon name="search" size={18} className="shrink-0 text-riff-muted" />
                <span className="sr-only">Search conversations</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search people or messages" className="min-w-0 flex-1 bg-transparent text-sm text-riff-text outline-none placeholder:text-riff-muted" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="flex size-7 items-center justify-center rounded-full text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="close" size={14} /></button>}
            </label>
        </div>

        {preferencesNeedSetup && <p role="status" className="mt-3 rounded-xl border border-riff-outline bg-riff-surface px-3.5 py-3 text-xs leading-5 text-riff-muted">Run <code className="text-riff-accent-soft">supabase/riff-messaging-preferences.sql</code> in Supabase to enable mute and delete options.</p>}
        {error && <p role="alert" className="mt-3 rounded-xl border border-riff-outline bg-riff-surface px-3.5 py-3 text-xs leading-5 text-riff-muted">{error}</p>}

        <section aria-label="Chat list" className={`mt-5 ${layout === 'sidebar' ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
            <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-riff-text">Chats</h2>
                <span className="text-xs tabular-nums text-riff-muted">{filtered.length}{query ? ` of ${items.length}` : ''}</span>
            </div>
            {filtered.length === 0 ? <div className={`rounded-2xl border border-riff-outline bg-riff-bg/35 px-5 py-12 text-center ${layout === 'sidebar' ? 'my-2' : ''}`}>
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-riff-surface-2 text-riff-muted"><Icon name={items.length ? 'search' : 'message'} size={20} /></span>
                <p className="mt-4 text-sm font-medium">{items.length ? 'No chats match that search' : 'No conversations yet'}</p>
                <p className="mt-1 text-xs leading-5 text-riff-muted">{items.length ? 'Try a name, username, or a word from a message.' : 'Start a chat from someone’s profile or use New message.'}</p>
            </div> : <ul className={`divide-y divide-riff-outline/70 overflow-visible rounded-2xl border border-riff-outline/80 bg-riff-bg/25 ${layout === 'sidebar' ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}>
                {filtered.map((item) => <li key={item.id} className={`group flex min-w-0 items-center gap-2.5 px-2.5 transition hover:bg-riff-surface-2/45 ${activeConversationId === item.id ? 'bg-riff-surface-2/70' : ''} ${layout === 'sidebar' ? 'py-2.5' : 'gap-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5'}`}>
                    <Link href={`/messages/${item.id}`} aria-label={`Open chat with ${item.name}`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                        {item.avatarUrl ? <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.avatarUrl} alt="" className={`${layout === 'sidebar' ? 'size-10' : 'size-12 sm:size-13'} shrink-0 rounded-full object-cover ring-1 ring-riff-outline`} />
                        </> : <span className={`flex ${layout === 'sidebar' ? 'size-10' : 'size-12 sm:size-13'} shrink-0 items-center justify-center rounded-full border border-riff-outline bg-riff-surface-3 text-base font-medium text-riff-text`}>{item.name.slice(0, 1).toUpperCase()}</span>}
                        <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-sm font-semibold text-riff-text">{item.name}</span>
                                {item.isMuted && <span aria-label="Muted" title="Muted"><Icon name="bell" size={13} className="shrink-0 text-riff-muted" /></span>}
                                {item.unreadCount > 0 && <span className="size-1.5 shrink-0 rounded-full bg-riff-accent" aria-label={`${item.unreadCount} unread messages`} />}
                            </span>
                            <span className={`mt-1 block truncate text-[13px] ${item.unreadCount ? 'font-medium text-riff-text' : 'text-riff-muted'}`}>{item.senderId === userId ? `You: ${item.preview}` : item.preview}</span>
                        </span>
                    </Link>
                    <span className="flex shrink-0 flex-col items-end gap-1.5 self-stretch py-0.5">
                        <time className="text-[10px] text-riff-muted">{dateLabel(item.createdAt)}</time>
                        {item.unreadCount > 0 && <span className="flex min-w-5 items-center justify-center rounded-full bg-riff-surface-3 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-riff-text">{item.unreadCount > 99 ? '99+' : item.unreadCount}</span>}
                        <details className="group/menu relative mt-auto">
                            <summary aria-label={`Options for ${item.name}`} title="Chat options" className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full text-riff-muted transition hover:bg-riff-surface-3 hover:text-riff-text [&::-webkit-details-marker]:hidden"><Icon name="more" size={18} /></summary>
                            <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-riff-outline bg-riff-surface p-1.5 shadow-xl">
                                <button type="button" disabled={busyId === item.id || preferencesNeedSetup} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); void savePreference(item, { isMuted: !item.isMuted }) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-riff-text transition hover:bg-riff-surface-2 disabled:opacity-45"><Icon name="bell" size={15} />{item.isMuted ? 'Unmute chat' : 'Mute chat'}</button>
                                <button type="button" disabled={busyId === item.id || preferencesNeedSetup} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setConfirming(item) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-rose-300 transition hover:bg-riff-surface-2 disabled:opacity-45"><Icon name="trash" size={15} />Delete conversation</button>
                            </div>
                        </details>
                    </span>
                </li>)}
            </ul>}
        </section>

        {confirming && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirming(null) }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="delete-chat-title" aria-describedby="delete-chat-description" className="w-full max-w-sm rounded-2xl border border-riff-outline bg-riff-surface p-5 shadow-2xl">
                <span className="flex size-10 items-center justify-center rounded-xl bg-riff-surface-2 text-riff-muted"><Icon name="trash" size={18} /></span>
                <h2 id="delete-chat-title" className="mt-4 text-base font-semibold">Delete this conversation?</h2>
                <p id="delete-chat-description" className="mt-2 text-sm leading-6 text-riff-muted">It will disappear from your chat list. The other person will still have their copy.</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => setConfirming(null)} className="rounded-full border border-riff-outline px-4 py-2 text-sm text-riff-text transition hover:bg-riff-surface-2">Cancel</button>
                    <button type="button" disabled={busyId === confirming.id} onClick={() => void savePreference(confirming, { hiddenAt: new Date().toISOString() })} className="rounded-full bg-riff-surface-3 px-4 py-2 text-sm font-medium text-riff-text transition hover:bg-riff-surface-2 disabled:opacity-50">{busyId === confirming.id ? 'Deleting…' : 'Delete chat'}</button>
                </div>
            </section>
        </div>}
    </>
}
