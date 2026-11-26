'use client'

import { useEffect, useId, useState } from 'react'
import { Icon } from '@/components/icon'

type GiphyGif = {
    id: string
    slug?: string
    title?: string
    images?: {
        fixed_width?: { url?: string }
        downsized?: { url?: string }
        downsized_medium?: { url?: string }
    }
}

export function GifPicker({ disabled, onAddGif, apiKey, keyName, buttonLabel = 'Add GIF', placement = 'bottom', compact = false }: { disabled: boolean; onAddGif: (gif: { id: string; previewUrl: string; pageUrl: string }) => boolean; apiKey?: string; keyName: string; buttonLabel?: string; placement?: 'top' | 'bottom'; compact?: boolean }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [gifs, setGifs] = useState<GiphyGif[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const inputId = useId()

    useEffect(() => {
        if (!open || !apiKey) return
        const controller = new AbortController()
        const timer = window.setTimeout(async () => {
            setLoading(true)
            setError('')
            const endpoint = query.trim() ? 'search' : 'trending'
            const url = new URL(`https://api.giphy.com/v1/gifs/${endpoint}`)
            url.searchParams.set('api_key', apiKey)
            url.searchParams.set('limit', '24')
            url.searchParams.set('rating', 'g')
            url.searchParams.set('lang', 'en')
            if (query.trim()) url.searchParams.set('q', query.trim().slice(0, 50))
            try {
                const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
                const result = await response.json() as { data?: GiphyGif[]; meta?: { status?: number } }
                if (!response.ok || (result.meta?.status && result.meta.status >= 400)) throw new Error('GIPHY is unavailable right now.')
                setGifs(result.data ?? [])
                if (!result.data?.length) setError('No GIFs found. Try another search.')
            } catch (caught) {
                if (caught instanceof DOMException && caught.name === 'AbortError') return
                setError(caught instanceof Error ? caught.message : 'Could not load GIFs. Try again.')
                setGifs([])
            } finally {
                if (!controller.signal.aborted) setLoading(false)
            }
        }, query.trim() ? 350 : 0)
        return () => { window.clearTimeout(timer); controller.abort() }
    }, [apiKey, open, query])

    function selectGif(gif: GiphyGif) {
        const previewUrl = gif.images?.downsized_medium?.url ?? gif.images?.downsized?.url ?? gif.images?.fixed_width?.url
        if (!previewUrl) {
            setError('This GIF is unavailable. Choose another one.')
            return
        }
        const slug = gif.slug && /^[a-zA-Z0-9-]+$/.test(gif.slug) ? gif.slug : gif.id
        const pageUrl = `https://giphy.com/gifs/${encodeURIComponent(slug)}`
        if (onAddGif({ id: gif.id, previewUrl, pageUrl })) setOpen(false)
    }

    return <div className="relative">
        <button type="button" disabled={disabled} aria-expanded={open} aria-label={compact ? 'Add a GIF' : undefined} title={compact ? 'GIF' : undefined} onClick={() => { setOpen((value) => !value); setError('') }} className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-riff-outline text-xs font-semibold text-riff-text transition hover:bg-riff-surface-2 disabled:pointer-events-none disabled:opacity-45 ${compact ? 'size-10 p-0' : 'px-3.5'}`}>
            {compact ? <Icon name="gif" size={17} /> : <><span className="rounded border border-current/50 px-1 py-0.5 text-[9px] font-black leading-none">GIF</span>{buttonLabel}</>}
        </button>
        {open && <section aria-label="Choose a GIF from GIPHY" className={`absolute right-0 z-30 w-[min(90vw,26rem)] overflow-hidden rounded-2xl border border-riff-outline bg-riff-surface shadow-2xl ${placement === 'top' ? 'bottom-12' : 'top-12'}`}>
            <div className="flex items-center gap-2 border-b border-riff-outline p-3">
                <label className="sr-only" htmlFor={inputId}>Search GIFs</label>
                <Icon name="search" size={15} className="shrink-0 text-riff-muted" />
                <input id={inputId} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search GIFs" maxLength={50} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-riff-muted" />
                <button type="button" aria-label="Close GIF picker" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="close" size={15} /></button>
            </div>
            <div className="max-h-[min(60dvh,26rem)] overflow-y-auto p-3">
                {!apiKey ? <p className="py-7 text-center text-sm leading-6 text-riff-muted">Add <code className="text-riff-accent-soft">{keyName}</code> to your local and Vercel environment settings to enable GIF search.</p> : loading && gifs.length === 0 ? <p role="status" className="py-10 text-center text-sm text-riff-muted">Finding GIFs…</p> : error && gifs.length === 0 ? <p role="status" className="py-8 text-center text-sm text-riff-muted">{error}</p> : <div className="grid grid-cols-3 gap-2">
                    {gifs.map((gif) => {
                        const previewUrl = gif.images?.fixed_width?.url ?? gif.images?.downsized?.url
                        return previewUrl ? <button key={gif.id} type="button" disabled={disabled} aria-label={`Add GIF: ${gif.title || 'Animated GIF'}`} onClick={() => selectGif(gif)} className="group aspect-square overflow-hidden rounded-lg bg-riff-surface-2 focus-visible:outline-2 focus-visible:outline-riff-accent">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewUrl} alt={gif.title || 'Animated GIF'} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                        </button> : null
                    })}
                </div>}
                {error && gifs.length > 0 && <p role="status" className="mt-2 text-center text-xs text-riff-muted">{error}</p>}
            </div>
            <a href="https://giphy.com" target="_blank" rel="noreferrer" className="flex items-center justify-center border-t border-riff-outline px-3 py-2 text-xs font-semibold tracking-wide text-riff-muted hover:text-riff-text">Powered by <span className="ml-1 bg-gradient-to-r from-[#00ccff] via-[#9933ff] to-[#ff6666] bg-clip-text font-black text-transparent">GIPHY</span></a>
        </section>}
    </div>
}
