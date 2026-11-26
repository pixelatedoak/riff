'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icon'
import { CustomStickerArtwork } from '@/components/custom-sticker-artwork'
import { GifPicker } from '@/components/gif-picker'
import { StickerPickerPanel } from '@/components/sticker-picker'
import { createClient } from '@/lib/supabase/client'
import type { StickerDesign } from '@/lib/riffs/stickers'

export type ThreadMessage = {
    id: string
    sender_id: string
    recipient_id: string
    content: string | null
    giphy_id: string | null
    sticker_data: StickerDesign | null
    reply_to_message_id: string | null
    created_at: string
    read_at: string | null
}
type SelectedGif = { id: string; previewUrl: string; pageUrl: string }

function dayLabel(value: string) {
    const date = new Date(value)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function messageExcerpt(message: ThreadMessage | undefined) {
    if (!message) return 'Message unavailable'
    if (message.sticker_data) return `Sticker · ${message.sticker_data.label}`
    if (message.content) return message.content
    if (message.giphy_id) return 'GIF'
    return 'Message'
}

export function MessageThread({ conversationId, userId, otherUserId, otherName, initialMessages, needsGifSetup, needsChatFeaturesSetup }: {
    conversationId: string
    userId: string
    otherUserId: string
    otherName: string
    initialMessages: ThreadMessage[]
    needsGifSetup: boolean
    needsChatFeaturesSetup: boolean
}) {
    const [messages, setMessages] = useState(initialMessages)
    const [text, setText] = useState('')
    const [selectedGif, setSelectedGif] = useState<SelectedGif | null>(null)
    const [selectedSticker, setSelectedSticker] = useState<StickerDesign | null>(null)
    const [replyingTo, setReplyingTo] = useState<ThreadMessage | null>(null)
    const [stickerPickerOpen, setStickerPickerOpen] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)
    const messageInputRef = useRef<HTMLTextAreaElement>(null)

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
        if ((!content && !selectedGif && !selectedSticker) || sending || needsGifSetup || needsChatFeaturesSetup) return
        const supabase = createClient()
        setSending(true)
        setError('')
        const { data, error: sendError } = await supabase.from('riff_messages').insert({
            conversation_id: conversationId,
            sender_id: userId,
            recipient_id: otherUserId,
            content: content || null,
            giphy_id: selectedGif?.id ?? null,
            sticker_data: selectedSticker,
            reply_to_message_id: replyingTo?.id ?? null,
        }).select('id, sender_id, recipient_id, content, giphy_id, sticker_data, reply_to_message_id, created_at, read_at').single()
        if (sendError || !data) {
            setError(sendError?.code === '42703' || sendError?.code === 'PGRST204'
                ? 'Run supabase/riff-chat-stickers-replies.sql in Supabase to enable replies and custom stickers.'
                : sendError?.message ?? 'Could not send that message.')
            setSending(false)
            return
        }
        setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data as ThreadMessage])
        setText('')
        if (messageInputRef.current) messageInputRef.current.style.height = '2.75rem'
        setSelectedGif(null)
        setSelectedSticker(null)
        setReplyingTo(null)
        setSending(false)
        window.dispatchEvent(new Event('riff:messages-updated'))
    }

    const lastOutgoingId = [...messages].reverse().find((message) => message.sender_id === userId)?.id

    return <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div role="log" aria-label="Conversation messages" aria-live="polite" className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-transparent px-2.5 sm:px-5">
            <div className="flex w-full flex-1 flex-col py-4 sm:py-6">
                {messages.length === 0 && <div className="m-auto flex w-full max-w-sm flex-col items-center py-8 text-center">
                    <h2 className="text-lg font-semibold tracking-tight">Start a conversation</h2>
                    <p className="mt-1 max-w-xs text-sm leading-6 text-riff-muted">Send {otherName} a message. Your chat will grow here.</p>
                    <button type="button" onClick={() => messageInputRef.current?.focus()} className="mt-4 rounded-full bg-riff-surface-2 px-4 py-2 text-xs font-medium text-riff-text transition hover:bg-riff-surface-3">Write a message</button>
                </div>}
                {messages.map((message, index) => {
                    const mine = message.sender_id === userId
                    const previous = messages[index - 1]
                    const currentDate = new Date(message.created_at).toDateString()
                    const previousDate = previous ? new Date(previous.created_at).toDateString() : null
                    const showDay = currentDate !== previousDate
                    const replySource = message.reply_to_message_id ? messages.find((entry) => entry.id === message.reply_to_message_id) : undefined
                    const bubbleColor = mine ? 'bg-riff-accent/[0.14] text-riff-text' : 'bg-riff-surface-2 text-riff-text'

                    return <div key={message.id} className={`w-full ${showDay ? 'mt-3' : 'mt-4'}`}>
                        {showDay && <div className="mb-5 flex items-center justify-center"><span className="rounded-full bg-riff-surface-2/80 px-3 py-1 text-[10px] font-medium text-riff-muted">{dayLabel(message.created_at)}</span></div>}
                        <div className={`group flex w-full items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[92%] flex-col sm:max-w-[78%] ${mine ? 'items-end' : 'items-start'}`}>
                                <time className="mb-1 px-2 text-[10px] text-riff-muted">{new Date(message.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>
                                <div className={`w-fit max-w-full rounded-[1.5rem] px-4 py-3 ${mine ? 'rounded-br-lg' : 'rounded-bl-lg'} ${bubbleColor}`}>
                                    {message.reply_to_message_id && <div className="mb-2 rounded-xl border-l-2 border-riff-accent/60 bg-black/10 px-3 py-2">
                                        <p className="text-[10px] font-semibold text-riff-accent-soft">{replySource ? (replySource.sender_id === userId ? 'You' : otherName) : 'Reply'}</p>
                                        <p className="mt-0.5 truncate text-xs text-riff-muted">{messageExcerpt(replySource)}</p>
                                    </div>}
                                    {message.content && <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.55]">{message.content}</p>}
                                    {message.sticker_data && <CustomStickerArtwork sticker={message.sticker_data} className="my-1 h-auto w-44 max-w-full drop-shadow-[0_5px_12px_rgba(0,0,0,0.24)]" />}
                                    {message.giphy_id && <div className={`${message.content || message.sticker_data ? 'mt-2' : ''} w-[min(70vw,21rem)] overflow-hidden rounded-2xl`}>
                                        <div className="relative aspect-video"><iframe src={`https://giphy.com/embed/${encodeURIComponent(message.giphy_id)}`} title="GIF via GIPHY" allow="autoplay; encrypted-media" allowFullScreen loading="lazy" className="absolute inset-0 size-full border-0" /></div>
                                        <a href="https://giphy.com" target="_blank" rel="noreferrer" className="block bg-black/80 px-2 py-1 text-right text-[9px] font-semibold text-zinc-400">Powered by GIPHY</a>
                                    </div>}
                                </div>
                                {mine && message.id === lastOutgoingId && message.read_at && <span className="mt-1 px-2 text-[10px] text-riff-muted">Seen</span>}
                            </div>
                            <button type="button" aria-label="Reply to message" title="Reply" onClick={() => { setReplyingTo(message); messageInputRef.current?.focus() }} className={`mb-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-riff-surface-2 text-riff-muted transition hover:text-riff-text sm:opacity-0 sm:group-hover:opacity-100 ${mine ? 'order-first' : ''}`}><Icon name="reply" size={14} /></button>
                        </div>
                    </div>
                })}
                <div ref={bottomRef} />
            </div>
        </div>

        <footer className="relative shrink-0 bg-transparent px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5 sm:pt-4 sm:pb-5">
            {needsGifSetup && <p role="status" className="mb-2 text-xs leading-5 text-riff-muted">Run <code className="text-riff-accent-soft">supabase/riff-giphy-messages.sql</code> in Supabase to enable GIFs.</p>}
            {needsChatFeaturesSetup && <p role="status" className="mb-2 text-xs leading-5 text-riff-muted">Run <code className="text-riff-accent-soft">supabase/riff-chat-stickers-replies.sql</code> in Supabase to enable replies and saved stickers.</p>}
            {error && <p role="alert" className="mb-2 text-xs text-rose-300">{error}</p>}
            {replyingTo && <div className="mx-auto mb-2 flex max-w-4xl items-center gap-2 rounded-2xl bg-riff-surface-2/90 px-3 py-2">
                <span className="h-8 w-0.5 rounded-full bg-riff-accent/70" />
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold text-riff-muted">Replying to {replyingTo.sender_id === userId ? 'yourself' : otherName}</span><span className="mt-0.5 block truncate text-xs text-riff-text">{messageExcerpt(replyingTo)}</span></span>
                <button type="button" aria-label="Cancel reply" onClick={() => setReplyingTo(null)} className="flex size-8 items-center justify-center rounded-full text-riff-muted hover:bg-riff-surface-3 hover:text-riff-text"><Icon name="close" size={14} /></button>
            </div>}
            {(selectedGif || selectedSticker) && <div className="mx-auto mb-2 flex max-w-4xl items-center gap-3 rounded-2xl bg-riff-surface-2/90 px-3 py-2">
                {selectedSticker ? <CustomStickerArtwork sticker={selectedSticker} className="h-auto w-28" /> : selectedGif ? <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedGif.previewUrl} alt="Selected GIF preview" className="h-12 w-16 rounded-xl object-cover" />
                </> : null}
                <span className="min-w-0 flex-1 text-xs text-riff-muted">{selectedSticker ? selectedSticker.label : 'GIF ready to send'}</span>
                <button type="button" aria-label="Remove attachment" onClick={() => { setSelectedSticker(null); setSelectedGif(null) }} className="flex size-8 items-center justify-center rounded-full text-riff-muted hover:bg-riff-surface-3 hover:text-riff-text"><Icon name="close" size={14} /></button>
            </div>}
            <form onSubmit={(event) => void send(event)} className="mx-auto flex max-w-5xl items-end gap-1.5 rounded-full border border-riff-outline bg-riff-surface-2/95 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:gap-2 sm:p-2">
                <textarea ref={messageInputRef} aria-label="Write a message" value={text} onChange={(event) => { setText(event.target.value); event.currentTarget.style.height = 'auto'; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 144)}px` }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} maxLength={5000} rows={1} placeholder="Message" disabled={needsGifSetup || needsChatFeaturesSetup} className="max-h-36 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2.5 text-sm leading-5 text-riff-text outline-none placeholder:text-riff-muted focus:ring-0 disabled:opacity-50" />
                <div className="relative shrink-0">
                    {stickerPickerOpen && <StickerPickerPanel userId={userId} onSelect={(sticker) => { setSelectedSticker(sticker); setSelectedGif(null); setStickerPickerOpen(false) }} onClose={() => setStickerPickerOpen(false)} />}
                    <button type="button" aria-label="Add sticker" title="Add sticker" aria-expanded={stickerPickerOpen} onClick={() => setStickerPickerOpen((open) => !open)} disabled={needsChatFeaturesSetup} className="flex size-10 items-center justify-center rounded-full border border-riff-outline text-riff-muted transition hover:bg-riff-surface-3 hover:text-riff-text disabled:opacity-40"><Icon name="sticker" size={17} /></button>
                </div>
                <GifPicker apiKey={process.env.NEXT_PUBLIC_GIPHY_CHAT_API_KEY} keyName="NEXT_PUBLIC_GIPHY_CHAT_API_KEY" compact placement="top" disabled={sending || needsGifSetup} onAddGif={(gif) => { setSelectedGif(gif); setSelectedSticker(null); return true }} />
                <button type="submit" aria-label="Send message" disabled={needsGifSetup || needsChatFeaturesSetup || (!text.trim() && !selectedGif && !selectedSticker) || sending} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-riff-accent text-riff-accent-ink transition hover:bg-riff-accent-hover disabled:cursor-not-allowed disabled:opacity-35"><Icon name="send" size={17} /></button>
            </form>
        </footer>
    </div>
}

export function ThreadBackLink() {
    return <Link href="/messages" aria-label="Back to chats" className="flex size-10 items-center justify-center rounded-full border border-riff-outline bg-riff-surface-2/70 text-riff-muted transition hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="chevron-left" size={21} /></Link>
}
