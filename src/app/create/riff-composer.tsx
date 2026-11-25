'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RiffKind } from '@/lib/riffs/types'
import { Icon } from '@/components/icon'
import { MarkdownEditor } from '@/components/markdown-editor'
import { RiffContent } from '@/components/riff-content'
import { Button } from '@/components/ui/button'
import { RIFF_MEDIA_FILTERS, RIFF_STICKERS, type RiffMediaFilter } from '@/lib/riffs/media-editing'

type ParentRiff = {
    id: string
    author_id: string
    content: string
    kind: RiffKind
    author_name: string
}

type PendingMedia = { id: string; file: File; previewUrl: string; mediaFilter: RiffMediaFilter; sticker: string; stickerX: number; stickerY: number; stickerScale: number }

const kindOptions: { kind: RiffKind; label: string; detail: string }[] = [
    { kind: 'riff', label: 'Open Riff', detail: 'Branchable' },
    { kind: 'black', label: 'Black Riff', detail: 'Standalone' },
]
const maxFiles = 5
const maxFileSize = 50 * 1024 * 1024
const editablePhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function renderPhotoEdits(item: PendingMedia) {
    const canEdit = editablePhotoTypes.has(item.file.type)
    if (!canEdit || (item.mediaFilter === 'none' && !item.sticker)) return item.file

    const bitmap = await createImageBitmap(item.file)
    try {
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('This browser could not edit the selected image.')
        const filter = RIFF_MEDIA_FILTERS.find((option) => option.id === item.mediaFilter)?.css ?? 'none'
        context.filter = filter
        context.drawImage(bitmap, 0, 0)
        context.filter = 'none'

        if (item.sticker) {
            const size = Math.max(28, Math.round(Math.min(canvas.width, canvas.height) * 0.16 * item.stickerScale))
            context.font = `${size}px system-ui, sans-serif`
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            context.shadowColor = 'rgba(0,0,0,0.65)'
            context.shadowBlur = size * 0.2
            context.fillText(item.sticker, item.stickerX * canvas.width, item.stickerY * canvas.height)
        }

        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not export this edited image.')), item.file.type, 0.92))
        return new File([blob], item.file.name, { type: blob.type || item.file.type, lastModified: item.file.lastModified })
    } finally {
        bitmap.close()
    }
}

function MediaStudio({ files, selectedId, onSelect, onUpdate, onRemove, onMove }: {
    files: PendingMedia[]
    selectedId: string | null
    onSelect: (id: string) => void
    onUpdate: (id: string, update: Partial<PendingMedia>) => void
    onRemove: (id: string) => void
    onMove: (id: string, direction: -1 | 1) => void
}) {
    const stageRef = useRef<HTMLDivElement>(null)
    const item = files.find((file) => file.id === selectedId) ?? files[0]
    if (!item) return null
    const index = files.findIndex((file) => file.id === item.id)
    const isPhoto = editablePhotoTypes.has(item.file.type)
    const isImage = item.file.type.startsWith('image/') && item.file.type !== 'image/svg+xml'
    const isVideo = item.file.type.startsWith('video/')
    const filter = RIFF_MEDIA_FILTERS.find((option) => option.id === item.mediaFilter)?.css ?? 'none'

    function moveSticker(event: React.PointerEvent<HTMLButtonElement>) {
        const stage = stageRef.current?.getBoundingClientRect()
        if (!stage || !event.currentTarget.hasPointerCapture(event.pointerId)) return
        onUpdate(item.id, {
            stickerX: Math.max(0.02, Math.min(0.98, (event.clientX - stage.left) / stage.width)),
            stickerY: Math.max(0.02, Math.min(0.98, (event.clientY - stage.top) / stage.height)),
        })
    }

    function nudgeSticker(key: string) {
        const amount = 0.02
        const next = { stickerX: item.stickerX, stickerY: item.stickerY }
        if (key === 'ArrowLeft') next.stickerX -= amount
        else if (key === 'ArrowRight') next.stickerX += amount
        else if (key === 'ArrowUp') next.stickerY -= amount
        else if (key === 'ArrowDown') next.stickerY += amount
        else return
        onUpdate(item.id, { stickerX: Math.max(0.02, Math.min(0.98, next.stickerX)), stickerY: Math.max(0.02, Math.min(0.98, next.stickerY)) })
    }

    return (
        <article className="overflow-hidden rounded-card border border-riff-outline bg-riff-surface">
            <div aria-label="Selected files" className="flex gap-2 overflow-x-auto border-b border-riff-outline bg-riff-surface-low p-3">
                {files.map((file, fileIndex) => <button key={file.id} type="button" aria-current={file.id === item.id ? 'true' : undefined} aria-label={`Edit image ${fileIndex + 1}: ${file.file.name}`} onClick={() => onSelect(file.id)} className={`relative size-20 shrink-0 overflow-hidden rounded-xl border transition ${file.id === item.id ? 'border-riff-accent ring-2 ring-riff-accent/20' : 'border-riff-outline opacity-75 hover:opacity-100'}`}>
                    {file.previewUrl && (file.file.type.startsWith('image/') ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={file.previewUrl} alt="" className="size-full object-cover" style={{ filter: RIFF_MEDIA_FILTERS.find((option) => option.id === file.mediaFilter)?.css ?? 'none' }} />
                    </> : <video src={file.previewUrl} className="size-full object-cover" />)}
                    {!file.previewUrl && <span className="flex size-full items-center justify-center bg-riff-surface-2 text-riff-muted"><Icon name="file" /></span>}
                    {file.sticker && <span aria-hidden="true" className="absolute bottom-1 right-1 text-xl drop-shadow">{file.sticker}</span>}
                    <span className="absolute left-1 top-1 rounded bg-black/65 px-1.5 text-[10px] text-white">{fileIndex + 1}</span>
                </button>)}
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="flex min-h-64 items-center justify-center overflow-hidden bg-[#0a0c0a] p-3 sm:min-h-[25rem] sm:p-5 lg:min-h-[34rem] lg:p-8">
                    {isPhoto && item.previewUrl ? <div ref={stageRef} className="relative inline-block max-h-[min(62vh,34rem)] max-w-full select-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.previewUrl} alt={`Editing ${item.file.name}`} draggable={false} className="block max-h-[min(62vh,34rem)] max-w-full object-contain" style={{ filter }} />
                        {item.sticker && <button type="button" aria-label="Drag sticker. Use arrow keys to move it." onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); moveSticker(event) }} onPointerMove={moveSticker} onKeyDown={(event) => { if (event.key.startsWith('Arrow')) { event.preventDefault(); nudgeSticker(event.key) } }} style={{ left: `${item.stickerX * 100}%`, top: `${item.stickerY * 100}%`, transform: `translate(-50%, -50%) scale(${item.stickerScale})` }} className="absolute touch-none cursor-move select-none rounded-lg px-1 text-5xl leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] focus-visible:outline-2 focus-visible:outline-riff-accent">{item.sticker}</button>}
                    </div> : isImage && item.previewUrl ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.previewUrl} alt={`Preview of ${item.file.name}`} className="max-h-[min(62vh,34rem)] max-w-full object-contain" />
                    </> : isVideo && item.previewUrl ? <video src={item.previewUrl} controls muted className="max-h-[min(62vh,34rem)] max-w-full" /> : <div className="flex flex-col items-center gap-3 text-riff-muted"><Icon name="file" size={36} /><span className="max-w-56 truncate text-sm">{item.file.name}</span></div>}
                </div>

                <div className="min-w-0 border-t border-riff-outline p-4 lg:border-l lg:border-t-0 lg:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-riff-text">{item.file.name}</p><p className="mt-1 text-xs text-riff-muted">{index + 1} of {files.length} · {(item.file.size / 1024 / 1024).toFixed(1)} MB</p></div>
                        <button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => onRemove(item.id)} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-riff-muted hover:bg-rose-300/10 hover:text-rose-200"><Icon name="trash" size={16} /></button>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <Button type="button" variant="secondary" size="compact" disabled={index === 0} onClick={() => onMove(item.id, -1)}>← Earlier</Button>
                        <Button type="button" variant="secondary" size="compact" disabled={index === files.length - 1} onClick={() => onMove(item.id, 1)}>Later →</Button>
                    </div>
                    {isPhoto && <>
                        <fieldset className="mt-5">
                            <legend className="mb-2 text-xs font-semibold text-riff-muted">Looks</legend>
                            <div className="grid grid-cols-3 gap-2">{RIFF_MEDIA_FILTERS.map((option) => <button key={option.id} type="button" aria-pressed={item.mediaFilter === option.id} onClick={() => onUpdate(item.id, { mediaFilter: option.id })} className={`overflow-hidden rounded-lg border text-left transition ${item.mediaFilter === option.id ? 'border-riff-accent' : 'border-riff-outline hover:border-riff-muted'}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.previewUrl} alt="" className="h-12 w-full object-cover" style={{ filter: option.css }} />
                                <span className="block truncate px-1.5 py-1 text-[10px] text-riff-muted">{option.label}</span>
                            </button>)}</div>
                        </fieldset>
                        <fieldset className="mt-5">
                            <legend className="mb-2 text-xs font-semibold text-riff-muted">Stickers</legend>
                            <div className="flex flex-wrap gap-1.5">
                                {RIFF_STICKERS.map((sticker) => <button key={sticker} type="button" aria-label={`Add ${sticker} sticker`} aria-pressed={item.sticker === sticker} onClick={() => onUpdate(item.id, { sticker: item.sticker === sticker ? '' : sticker, stickerX: item.sticker ? item.stickerX : 0.5, stickerY: item.sticker ? item.stickerY : 0.5 })} className={`flex size-9 items-center justify-center rounded-lg border text-lg ${item.sticker === sticker ? 'border-riff-accent bg-riff-surface-2' : 'border-riff-outline hover:bg-riff-surface-2'}`}>{sticker}</button>)}
                                {item.sticker && <button type="button" onClick={() => onUpdate(item.id, { sticker: '' })} className="rounded-lg px-2 text-xs text-riff-muted hover:bg-riff-surface-2">Remove</button>}
                            </div>
                        </fieldset>
                        {item.sticker && <label className="mt-5 block text-xs font-semibold text-riff-muted">Sticker size <span className="font-normal">{Math.round(item.stickerScale * 100)}%</span><input type="range" min="0.35" max="2.5" step="0.05" value={item.stickerScale} onChange={(event) => onUpdate(item.id, { stickerScale: Number(event.target.value) })} className="mt-2 w-full accent-riff-accent" /></label>}
                        {item.sticker && <p className="mt-2 text-[11px] leading-4 text-riff-faint">Drag the sticker on the photo. Use arrow keys for small moves.</p>}
                    </>}
                </div>
            </div>
        </article>
    )
}

export function RiffComposer({ authorId, parent }: { authorId: string; parent: ParentRiff | null }) {
    const [kind, setKind] = useState<RiffKind>('riff')
    const [content, setContent] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [files, setFiles] = useState<PendingMedia[]>([])
    const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null)
    const [uploadStatus, setUploadStatus] = useState('')
    const objectUrls = useRef(new Set<string>())
    const router = useRouter()
    const supabase = createClient()
    const remaining = 1000 - content.length

    useEffect(() => () => {
        for (const url of objectUrls.current) URL.revokeObjectURL(url)
        objectUrls.current.clear()
    }, [])

    function addFiles(selected: File[]) {
        setError('')
        if (files.length + selected.length > maxFiles) {
            setError(`Choose up to ${maxFiles} files per Riff.`)
            return
        }
        if (selected.some((file) => file.size > maxFileSize)) {
            setError('Each file must be 50 MB or smaller.')
            return
        }
        const additions = selected.map((file) => {
            const previewable = (file.type.startsWith('image/') && file.type !== 'image/svg+xml') || file.type.startsWith('video/')
            const previewUrl = previewable ? URL.createObjectURL(file) : ''
            if (previewUrl) objectUrls.current.add(previewUrl)
            return { id: crypto.randomUUID(), file, previewUrl, mediaFilter: 'none' as const, sticker: '', stickerX: 0.5, stickerY: 0.5, stickerScale: 1 }
        })
        setFiles((current) => [...current, ...additions])
        setSelectedMediaId((current) => current ?? additions[0]?.id ?? null)
    }

    function removeFile(id: string) {
        const item = files.find((entry) => entry.id === id)
        if (item?.previewUrl) {
            URL.revokeObjectURL(item.previewUrl)
            objectUrls.current.delete(item.previewUrl)
        }
        const next = files.filter((entry) => entry.id !== id)
        setFiles(next)
        if (selectedMediaId === id) setSelectedMediaId(next[0]?.id ?? null)
    }

    function updateFile(id: string, update: Partial<PendingMedia>) {
        setFiles((current) => current.map((item) => item.id === id ? { ...item, ...update } : item))
    }

    function moveFile(id: string, direction: -1 | 1) {
        setFiles((current) => {
            const index = current.findIndex((item) => item.id === id)
            const nextIndex = index + direction
            if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
            const next = [...current]
            ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
            return next
        })
    }

    async function submitRiff(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const text = content.trim()
        setError('')

        if (!text && files.length === 0) {
            setError('Write something or attach a file before posting.')
            return
        }
        if (text.length > 1000) {
            setError('Keep your Riff to 1,000 characters or less.')
            return
        }

        const id = crypto.randomUUID()
        setSaving(true)
        const uploaded: { item: PendingMedia; file: File; path: string; url: string }[] = []
        try {
            for (const [index, item] of files.entries()) {
                setUploadStatus(`Preparing ${index + 1} of ${files.length}`)
                const preparedFile = await renderPhotoEdits(item)
                if (preparedFile.size > maxFileSize) throw new Error('An edited image is larger than 50 MB. Choose a lighter look or a smaller image.')
                setUploadStatus(`Uploading ${index + 1} of ${files.length}`)
                const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180) || 'file'
                const path = `${authorId}/${id}/${crypto.randomUUID()}-${safeName}`
                const { error: uploadError } = await supabase.storage.from('riff-files').upload(path, preparedFile, {
                    contentType: preparedFile.type || 'application/octet-stream',
                    upsert: false,
                })
                if (uploadError) throw uploadError
                const { data: publicData } = supabase.storage.from('riff-files').getPublicUrl(path)
                uploaded.push({ item, file: preparedFile, path, url: publicData.publicUrl })
            }

            setUploadStatus('Publishing Riff…')
            const { error: insertError } = await supabase.from('riffs').insert({
                id,
                author_id: authorId,
                parent_riff_id: parent?.id ?? null,
                kind: parent ? 'riff' : kind,
                content: text,
            })

            if (insertError) {
                if (uploaded.length) await supabase.storage.from('riff-files').remove(uploaded.map((file) => file.path))
                setError(insertError.message)
                setSaving(false)
                setUploadStatus('')
                return
            }

            if (uploaded.length) {
                const { error: attachmentError } = await supabase.from('riff_attachments').insert(uploaded.map(({ file, path, url }, index) => ({
                    riff_id: id,
                    author_id: authorId,
                    filename: file.name.slice(0, 255),
                    storage_path: path,
                    public_url: url,
                    mime_type: file.type || 'application/octet-stream',
                    byte_size: file.size,
                    media_filter: 'none',
                    sticker: null,
                    sort_order: index,
                })))
                if (attachmentError) {
                    await supabase.rpc('soft_delete_riff', { p_riff_id: id })
                    throw attachmentError
                }
            }

            router.replace(`/r/${id}`)
            router.refresh()
        } catch (caught) {
            if (uploaded.length) await supabase.storage.from('riff-files').remove(uploaded.map((file) => file.path))
            setError(caught instanceof Error ? `Could not post your Riff: ${caught.message}` : 'Could not post your Riff. Check your connection and try again.')
            setSaving(false)
            setUploadStatus('')
        }
    }

    return (
        <form onSubmit={submitRiff} className="overflow-hidden rounded-card border border-riff-outline bg-riff-surface shadow-[0_28px_90px_rgba(0,0,0,0.2)]">
            <div className="p-5 sm:p-7">
                {parent ? (
                    <div className="mb-6 rounded-card border border-riff-outline bg-riff-surface-low p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-riff-muted"><Icon name="branch" size={15} />Branching from {parent.author_name}</div>
                        {parent.content && <RiffContent content={parent.content} className="line-clamp-3 text-sm" />}
                    </div>
                ) : (
                    <fieldset className="mb-6">
                        <legend className="mb-2.5 text-xs font-medium uppercase tracking-[0.14em] text-riff-muted">Choose a post type</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {kindOptions.map((option) => (
                                <button key={option.kind} type="button" aria-pressed={kind === option.kind} onClick={() => setKind(option.kind)} className={`rounded-control border p-4 text-left transition ${kind === option.kind ? 'border-riff-accent/35 bg-riff-surface-2' : 'border-riff-outline bg-riff-surface-low hover:bg-riff-surface-2'}`}>
                                    <span className="flex items-center gap-2 text-sm font-semibold text-riff-text"><Icon name={option.kind === 'riff' ? 'branch' : 'lock'} size={17} />{option.label}</span>
                                    <span className="mt-2 block text-xs font-medium text-riff-muted">{option.detail}</span>
                                </button>
                            ))}
                        </div>
                    </fieldset>
                )}

                <label htmlFor="riff-content" className="mb-2 block text-sm font-medium text-riff-text">{parent ? 'Add your branch' : kind === 'black' ? 'What’s on your mind?' : 'Start a thought'}</label>
                <MarkdownEditor id="riff-content" value={content} onChange={setContent} placeholder={parent ? 'Take the thought somewhere new…' : 'Leave a little room for someone else to riff.'} />

                {parent && <p className="mt-2 text-xs text-riff-faint">Your branch will appear under the original Riff.</p>}

                <section aria-labelledby="attachments-title" className="mt-5 rounded-card border border-riff-outline bg-riff-surface-low p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><h2 id="attachments-title" className="text-sm font-semibold text-riff-text">Media</h2><p className="mt-1 text-xs text-riff-muted">Add up to {maxFiles} files · 50 MB each</p></div>
                        <label htmlFor="riff-files" className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-control border border-riff-outline bg-riff-surface-2 px-3.5 py-2 text-sm font-medium text-riff-text transition hover:bg-riff-surface-3"><Icon name="upload" size={16} />Add files</label>
                        <input id="riff-files" type="file" multiple disabled={saving || files.length >= maxFiles} onChange={(event) => { addFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = '' }} className="sr-only" />
                    </div>
                    {files.length > 0 ? <div className="mt-4"><MediaStudio files={files} selectedId={selectedMediaId} onSelect={setSelectedMediaId} onUpdate={updateFile} onRemove={removeFile} onMove={moveFile} /></div> : <label htmlFor="riff-files" className="mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-control border border-dashed border-riff-outline px-4 py-6 text-center transition hover:border-riff-accent/40 hover:bg-riff-surface/60"><Icon name="image" size={22} className="text-riff-muted" /><span className="mt-2 text-sm font-medium text-riff-text">Add photos, video, or any file</span><span className="mt-1 text-xs text-riff-faint">Choose multiple files at once. Reorder them before posting.</span></label>}
                    <p className="mt-3 text-[11px] leading-5 text-riff-faint">Files are public and can be viewed or downloaded by anyone with the link.</p>
                </section>

                {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3.5 py-2.5 text-sm text-red-200">{error}</p>}

                <div className="mt-6 flex items-center justify-between gap-3">
                    {uploadStatus ? <p role="status" className="text-sm text-riff-muted">{uploadStatus}</p> : <span className="text-xs text-riff-faint">{content.length}/{1000}</span>}
                    <Button type="submit" disabled={saving || remaining < 0}>
                        {saving ? 'Posting…' : parent ? 'Post branch' : kind === 'black' ? 'Post Black Riff' : 'Post Riff'}
                        {!saving && <Icon name="arrow-up-right" size={16} />}
                    </Button>
                </div>
            </div>
        </form>
    )
}
