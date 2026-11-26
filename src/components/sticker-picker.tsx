'use client'

import { useEffect, useState } from 'react'
import { CustomStickerArtwork } from '@/components/custom-sticker-artwork'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/client'
import { FUNNY_STICKERS, STICKER_PALETTES, type StickerDesign } from '@/lib/riffs/stickers'

export function useUserStickers(userId: string) {
    const [stickers, setStickers] = useState<StickerDesign[]>([])

    useEffect(() => {
        let alive = true
        void createClient().from('riff_user_stickers').select('id, label, text, background, foreground').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
            .then(({ data }) => {
                if (alive) setStickers((data ?? []) as StickerDesign[])
            })
        return () => { alive = false }
    }, [userId])

    return { stickers, setStickers }
}

export function StickerPickerPanel({ userId, onSelect, onClose }: { userId: string; onSelect: (sticker: StickerDesign) => void; onClose: () => void }) {
    const { stickers, setStickers } = useUserStickers(userId)
    const [tab, setTab] = useState<'pack' | 'mine' | 'create'>('pack')
    const [text, setText] = useState('')
    const [paletteIndex, setPaletteIndex] = useState(0)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    async function createSticker(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const cleanText = text.trim().replace(/\s+/g, ' ').slice(0, 18)
        if (!cleanText || saving) return
        setSaving(true)
        setError('')
        const palette = STICKER_PALETTES[paletteIndex]
        const { data, error: saveError } = await createClient().from('riff_user_stickers').insert({
            user_id: userId,
            label: cleanText,
            text: cleanText,
            background: palette.background,
            foreground: palette.foreground,
        }).select('id, label, text, background, foreground').single()
        setSaving(false)
        if (saveError || !data) {
            setError(saveError?.code === '42P01' || saveError?.code === 'PGRST205'
                ? 'Run supabase/riff-chat-stickers-replies.sql in Supabase to save custom stickers.'
                : 'Could not save this sticker. Try again.')
            return
        }
        const sticker = data as StickerDesign
        setStickers((current) => [sticker, ...current])
        setText('')
        onSelect(sticker)
    }

    const visibleStickers = tab === 'pack' ? FUNNY_STICKERS : stickers

    return <section aria-label="Sticker library" className="absolute bottom-[calc(100%+0.75rem)] right-0 z-40 w-[min(92vw,23rem)] overflow-hidden rounded-[1.5rem] border border-riff-outline bg-riff-surface shadow-[0_20px_70px_rgba(0,0,0,0.5)] sm:w-[25rem]">
        <div className="flex items-center justify-between border-b border-riff-outline px-4 py-3">
            <div><h2 className="text-sm font-semibold">Stickers</h2><p className="mt-0.5 text-[10px] text-riff-muted">Your stickers work in chat and post creation.</p></div>
            <button type="button" aria-label="Close stickers" onClick={onClose} className="flex size-8 items-center justify-center rounded-full text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="close" size={16} /></button>
        </div>
        <div className="flex gap-1 border-b border-riff-outline px-3 pt-2">
            {([{ id: 'pack', label: 'Riff pack' }, { id: 'mine', label: 'Mine' }, { id: 'create', label: 'Make one' }] as const).map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => { setTab(item.id); setError('') }} className={`border-b-2 px-3 py-2 text-xs font-medium transition ${tab === item.id ? 'border-riff-accent text-riff-text' : 'border-transparent text-riff-muted hover:text-riff-text'}`}>{item.label}</button>)}
        </div>
        {tab === 'create' ? <form onSubmit={(event) => void createSticker(event)} className="space-y-3 p-4">
            <label className="block text-xs font-medium text-riff-muted">Sticker text <span className="font-normal">(18 characters max)</span>
                <input autoFocus value={text} maxLength={18} onChange={(event) => setText(event.target.value)} placeholder="e.g. BRB, overthinking" className="mt-1.5 h-10 w-full rounded-xl border border-riff-outline bg-riff-bg px-3 text-sm text-riff-text outline-none placeholder:text-riff-faint focus:border-riff-accent/50" />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Sticker color">
                {STICKER_PALETTES.map((palette, index) => <button key={palette.label} type="button" aria-label={`${palette.label} sticker color`} aria-pressed={paletteIndex === index} onClick={() => setPaletteIndex(index)} className={`size-8 shrink-0 rounded-full border-2 transition ${paletteIndex === index ? 'border-riff-text ring-2 ring-riff-accent/30' : 'border-riff-outline'}`} style={{ backgroundColor: palette.background }} />)}
            </div>
            <div className="flex min-h-16 items-center justify-center rounded-xl bg-riff-bg p-2"><CustomStickerArtwork sticker={{ id: 'preview', label: text || 'Your sticker', text: text || 'YOUR TEXT', background: STICKER_PALETTES[paletteIndex].background, foreground: STICKER_PALETTES[paletteIndex].foreground }} className="h-auto w-48 max-w-full" /></div>
            {error && <p role="alert" className="text-xs leading-5 text-rose-300">{error}</p>}
            <button type="submit" disabled={!text.trim() || saving} className="w-full rounded-full bg-riff-surface-3 px-4 py-2.5 text-sm font-medium text-riff-text transition hover:bg-riff-surface-2 disabled:opacity-50">{saving ? 'Saving…' : 'Save & use sticker'}</button>
        </form> : <div className="max-h-[min(54dvh,22rem)] overflow-y-auto p-3">
            {visibleStickers.length ? <div className="grid grid-cols-2 gap-2">
                {visibleStickers.map((sticker) => <button key={sticker.id} type="button" onClick={() => onSelect(sticker)} className="flex min-h-[5.2rem] items-center justify-center rounded-xl bg-riff-surface-2 p-2 transition hover:bg-riff-surface-3 focus-visible:outline-2 focus-visible:outline-riff-accent"><CustomStickerArtwork sticker={sticker} className="h-auto w-full" /></button>)}
            </div> : <div className="py-8 text-center"><p className="text-sm font-medium">No custom stickers yet</p><p className="mt-1 text-xs text-riff-muted">Make one and it’ll be ready for your next Riff too.</p></div>}
            {error && <p role="alert" className="mt-3 text-xs leading-5 text-rose-300">{error}</p>}
        </div>}
    </section>
}
