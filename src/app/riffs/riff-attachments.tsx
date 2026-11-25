'use client'

import { useRef, useState } from 'react'
import type { RiffAttachment } from '@/lib/riffs/types'
import { Icon } from '@/components/icon'
import { Button } from '@/components/ui/button'
import { getRiffMediaFilter } from '@/lib/riffs/media-editing'

function readableSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function DownloadLink({ file }: { file: RiffAttachment }) {
    const url = `${file.public_url}${file.public_url.includes('?') ? '&' : '?'}download=${encodeURIComponent(file.filename)}`
    return <a href={url} className="shrink-0 rounded-lg border border-riff-outline px-2.5 py-2 text-xs font-medium text-riff-accent hover:bg-riff-surface-2">Download</a>
}

function FileDetails({ file, actions }: { file: RiffAttachment; actions?: React.ReactNode }) {
    return <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-riff-surface-2 text-riff-accent" aria-hidden="true"><Icon name={file.mime_type.startsWith('image/') ? 'image' : 'file'} /></div>
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-riff-text">{file.filename}</p>
            <p className="mt-0.5 text-[11px] text-riff-muted">{file.mime_type || 'Unknown type'} · {readableSize(file.byte_size)}</p>
        </div>
        {actions}
        <DownloadLink file={file} />
    </div>
}

function MediaCarousel({ files }: { files: RiffAttachment[] }) {
    const [activeIndex, setActiveIndex] = useState(0)
    const pointerStart = useRef<number | null>(null)
    const file = files[activeIndex]
    const isVideo = file.mime_type.toLowerCase().startsWith('video/')
    const step = (direction: -1 | 1) => setActiveIndex((current) => (current + direction + files.length) % files.length)

    return <section aria-label="Post media" className="overflow-hidden rounded-card border border-riff-outline bg-riff-surface-low">
        <div
            className="relative flex items-center justify-center overflow-hidden bg-transparent"
            onKeyDown={(event) => {
                if (files.length < 2) return
                if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
                if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
            }}
            onPointerDown={(event) => { pointerStart.current = event.clientX }}
            onPointerUp={(event) => {
                if (pointerStart.current === null || files.length < 2) return
                const distance = event.clientX - pointerStart.current
                if (Math.abs(distance) > 45) step(distance < 0 ? 1 : -1)
                pointerStart.current = null
            }}
            onPointerCancel={() => { pointerStart.current = null }}
            tabIndex={files.length > 1 ? 0 : undefined}
            aria-roledescription={files.length > 1 ? 'carousel' : undefined}
            aria-label={files.length > 1 ? `Media ${activeIndex + 1} of ${files.length}. Use arrow keys to change slides.` : file.filename}
        >
            {isVideo ? <video key={file.id} src={file.public_url} controls playsInline preload="metadata" className="block h-auto w-full" /> : <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={file.id} src={file.public_url} alt={file.filename} loading="lazy" draggable={false} style={{ filter: getRiffMediaFilter(file.media_filter) }} className="block h-auto w-full" />
                {file.sticker && <span aria-label={`Sticker ${file.sticker}`} className="absolute bottom-4 right-4 select-none text-5xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">{file.sticker}</span>}
            </>}
            {files.length > 1 && <>
                <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium tabular-nums text-white" aria-live="polite">{activeIndex + 1} / {files.length}</span>
                <button type="button" aria-label="Previous media" onClick={() => step(-1)} className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-lg text-white shadow-lg backdrop-blur transition hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-riff-accent">‹</button>
                <button type="button" aria-label="Next media" onClick={() => step(1)} className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-lg text-white shadow-lg backdrop-blur transition hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-riff-accent">›</button>
            </>}
        </div>
        {files.length > 1 && <div className="flex items-center justify-center gap-1.5 border-b border-riff-outline px-3 py-2.5" aria-label="Choose media slide">
            {files.map((entry, index) => <button key={entry.id} type="button" aria-label={`Show media ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => setActiveIndex(index)} className={`size-1.5 rounded-full transition ${index === activeIndex ? 'bg-riff-accent ring-2 ring-riff-accent/20' : 'bg-riff-muted/50 hover:bg-riff-muted'}`} />)}
        </div>}
        <FileDetails file={file} />
    </section>
}

function OtherAttachment({ file, expanded, toggleExpanded }: { file: RiffAttachment; expanded: boolean; toggleExpanded: () => void }) {
    const type = file.mime_type.toLowerCase()
    const showPreview = (type.startsWith('video/') || type.startsWith('audio/') || type === 'application/pdf' || (type.startsWith('text/') && type !== 'text/html'))

    return <section className="overflow-hidden rounded-card border border-riff-outline bg-riff-surface-low">
        {showPreview && type.startsWith('video/') && <video src={file.public_url} controls preload="metadata" className="max-h-[34rem] w-full bg-black" />}
        {showPreview && type.startsWith('audio/') && <audio src={file.public_url} controls preload="metadata" className="w-full px-4 py-5" />}
        {showPreview && type === 'application/pdf' && <iframe src={file.public_url} title={file.filename} sandbox="" className="h-[min(70vh,42rem)] w-full bg-white" />}
        {showPreview && type.startsWith('text/') && type !== 'text/html' && <iframe src={file.public_url} title={file.filename} sandbox="" className="h-64 w-full bg-white" />}
        {type === 'text/html' && expanded && <iframe src={file.public_url} title={file.filename} sandbox="" className="h-72 w-full bg-white" />}
        <FileDetails file={file} actions={<>
            {type === 'text/html' && <Button variant="ghost" size="compact" type="button" onClick={toggleExpanded}>{expanded ? 'Hide preview' : 'Preview'}</Button>}
            {(type === 'application/pdf' || type === 'image/svg+xml') && <a href={file.public_url} target="_blank" rel="noreferrer" className="rounded-lg px-2.5 py-2 text-xs text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text">Open</a>}
        </>} />
    </section>
}

export function RiffAttachments({ attachments }: { attachments: RiffAttachment[] }) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    if (attachments.length === 0) return null
    const ordered = [...attachments].sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    const slides = ordered.filter((file) => {
        const type = file.mime_type.toLowerCase()
        return (type.startsWith('image/') && type !== 'image/svg+xml') || type.startsWith('video/')
    })
    const otherFiles = ordered.filter((file) => !slides.includes(file))

    return <div className="mt-4 space-y-3">
        {slides.length > 0 && <MediaCarousel files={slides} />}
        {otherFiles.map((file) => <OtherAttachment key={file.id} file={file} expanded={Boolean(expanded[file.id])} toggleExpanded={() => setExpanded((current) => ({ ...current, [file.id]: !current[file.id] }))} />)}
    </div>
}
