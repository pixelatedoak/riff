'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/client'
import { GifPicker } from '@/components/gif-picker'

export type ThreadMessage = { id: string; sender_id: string; recipient_id: string; content: string | null; giphy_id: string | null; created_at: string; read_at: string | null }
type SelectedGif = { id: string; previewUrl: string; pageUrl: string }

export function MessageThread({ conversationId, userId, otherUserId, initialMessages, needsGifSetup }: { conversationId: string; userId: string; otherUserId: string; initialMessages: ThreadMessage[]; needsGifSetup: boolean }) {
    const [messages, setMessages] = useState(initialMessages)
    const [text, setText] = useState('')
    const [selectedGif, setSelectedGif] = useState<SelectedGif | null>(null)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const supabase = createClient()
        const markRead = async () => {
            await supabase.from('riff_messages').update({ read_at: new Date().toISOString() })
                .eq('conversation_id', conversationId).eq('recipient_id', userId).is('read_at', null)
            setMessages((current) => current.map((message) => message.recipient_id === userId && !message.read_at ? { ...message, read_at: new Date().toISOString() } : message))
            window.dispatchEvent(new Event('riff:messages-updated'))
        }
        void markRead()

        const channel = supabase.channel(`riff-messages-${conversationId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'riff_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
                const message = payload.new as ThreadMessage
                setMessages((current) => current.some((entry) => entry.id === message.id) ? current : [...current, message])
                if (message.recipient_id === userId) {
                    void supabase.from('riff_messages').update({ read_at: new Date().toISOString() }).eq('id', message.id).eq('recipient_id', userId)
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'riff_messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
                const message = payload.new as ThreadMessage
                if (message.read_at) setMessages((current) => current.map((entry) => entry.id === message.id ? { ...entry, read_at: message.read_at } : entry))
            })
            .subscribe()
        return () => { void supabase.removeChannel(channel) }
    }, [conversationId, userId])

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages])

    async function send(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const content = text.trim()
        if ((!content && !selectedGif) || sending || needsGifSetup) return
        const supabase = createClient()
        setSending(true)
        setError('')
        const { data, error: sendError } = await supabase.from('riff_messages').insert({
            conversation_id: conversationId,
            sender_id: userId,
            recipient_id: otherUserId,
            content: content || null,
            giphy_id: selectedGif?.id ?? null,
        }).select('id, sender_id, recipient_id, content, giphy_id, created_at, read_at').single()
        if (sendError || !data) {
            setError(sendError?.code === '42703' || sendError?.code === 'PGRST204'
                ? 'Run supabase/riff-giphy-messages.sql in Supabase to enable GIF messages.'
                : sendError?.message ?? 'Could not send that message.')
            setSending(false)
            return
        }
        setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data as ThreadMessage])
        setText('')
        setSelectedGif(null)
        setSending(false)
        window.dispatchEvent(new Event('riff:messages-updated'))
    }

    const lastOutgoingId = [...messages].reverse().find((message) => message.sender_id === userId)?.id

    return <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-[40dvh] flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.length === 0 && <div className="m-auto max-w-xs py-12 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-riff-surface-2 text-riff-muted"><Icon name="message" size={21} /></span><p className="mt-4 text-sm font-medium">Say hello</p><p className="mt-1 text-xs leading-5 text-riff-muted">Your messages are private to the two people in this conversation.</p></div>}
            {messages.map((message) => {
                const mine = message.sender_id === userId
                return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 sm:max-w-[75%] ${mine ? 'rounded-br-md bg-riff-accent text-riff-accent-ink' : 'rounded-bl-md border border-riff-outline bg-riff-surface-2 text-riff-text'}`}>
                        {message.content && <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.content}</p>}
                        {message.giphy_id && <div className={`${message.content ? 'mt-2' : ''} w-[min(64vw,18rem)] overflow-hidden rounded-lg bg-black`}>
                            <div className="relative aspect-video"><iframe src={`https://giphy.com/embed/${encodeURIComponent(message.giphy_id)}`} title="GIF via GIPHY" allow="autoplay; encrypted-media" allowFullScreen loading="lazy" className="absolute inset-0 size-full border-0" /></div>
                            <a href="https://giphy.com" target="_blank" rel="noreferrer" className="block px-2 py-1 text-right text-[9px] font-semibold text-zinc-400">Powered by GIPHY</a>
                        </div>}
                        <div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${mine ? 'text-riff-accent-ink/65' : 'text-riff-muted'}`}><time>{new Date(message.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>{mine && message.id === lastOutgoingId && message.read_at && <span>Seen</span>}</div>
                    </div>
                </div>
            })}
            <div ref={bottomRef} />
        </div>
        <div className="border-t border-riff-outline bg-riff-bg/95 p-3 sm:p-4">
            {needsGifSetup && <p role="status" className="mb-2 rounded-lg bg-riff-surface px-3 py-2 text-xs text-riff-muted">Run <code className="text-riff-accent-soft">supabase/riff-giphy-messages.sql</code> in Supabase to enable messages here.</p>}
            {error && <p role="alert" className="mb-2 text-xs text-rose-300">{error}</p>}
            {selectedGif && <div className="mb-2 flex items-center gap-2 rounded-xl border border-riff-outline bg-riff-surface px-2 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedGif.previewUrl} alt="Selected GIF preview" className="h-14 w-20 rounded-lg object-cover" />
                <span className="flex-1 text-xs text-riff-muted">GIF ready to send · Powered by GIPHY</span>
                <button type="button" aria-label="Remove selected GIF" onClick={() => setSelectedGif(null)} className="rounded-full p-1.5 text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="close" size={15} /></button>
            </div>}
            <form onSubmit={(event) => void send(event)} className="flex items-end gap-2">
                <textarea aria-label="Write a message" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} maxLength={5000} rows={1} placeholder="Write a message…" disabled={needsGifSetup} className="max-h-36 min-h-11 flex-1 resize-y rounded-2xl border border-riff-outline bg-riff-surface px-4 py-3 text-sm text-riff-text outline-none placeholder:text-riff-muted focus:border-riff-accent disabled:opacity-50" />
                <GifPicker apiKey={process.env.NEXT_PUBLIC_GIPHY_CHAT_API_KEY} keyName="NEXT_PUBLIC_GIPHY_CHAT_API_KEY" buttonLabel="GIF" placement="top" disabled={sending || needsGifSetup} onAddGif={(gif) => { setSelectedGif(gif); return true }} />
                <button type="submit" aria-label="Send message" disabled={needsGifSetup || (!text.trim() && !selectedGif) || sending} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-riff-accent text-riff-accent-ink transition hover:bg-riff-accent-hover disabled:cursor-not-allowed disabled:opacity-40"><Icon name="arrow-up-right" size={18} /></button>
            </form>
            <p className="mt-2 px-1 text-[10px] text-riff-muted">Enter to send · Shift + Enter for a new line</p>
        </div>
    </div>
}

export function ThreadBackLink() {
    return <Link href="/messages" aria-label="Back to messages" className="flex size-10 items-center justify-center rounded-full text-riff-muted transition hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="arrow-left" size={18} /></Link>
}
