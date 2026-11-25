'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RiffKind } from '@/lib/riffs/types'
import { Icon } from '@/components/icon'
import { MarkdownEditor } from '@/components/markdown-editor'
import { RiffContent } from '@/components/riff-content'
import { Button } from '@/components/ui/button'
import { RIFF_MEDIA_FILTERS, RIFF_STICKERS, type RiffMediaFilter, type RiffStickerId } from '@/lib/riffs/media-editing'
import { StickerArtwork } from '@/components/sticker-artwork'
import { GifPicker } from '@/components/gif-picker'

type ParentRiff = {
    id: string
    author_id: string
    content: string
    kind: RiffKind
    author_name: string
}

type LayerPosition = { id: string; x: number; y: number; scale: number; rotation: number }
type CanvasLayer =
    | (LayerPosition & { type: 'sticker'; stickerId: RiffStickerId })
    | (LayerPosition & { type: 'text'; text: string; style: 'plain' | 'label' })
type PendingMedia = { id: string; file: File; previewUrl: string; mediaFilter: RiffMediaFilter; layers: CanvasLayer[]; giphyId: string | null; giphyPageUrl: string | null }

const kindOptions: { kind: RiffKind; label: string; detail: string }[] = [
    { kind: 'riff', label: 'Open Riff', detail: 'Branchable' },
    { kind: 'black', label: 'Black Riff', detail: 'Standalone' },
]
const maxFiles = 5
const maxFileSize = 50 * 1024 * 1024
const editablePhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function renderPhotoEdits(item: PendingMedia) {
    const canEdit = editablePhotoTypes.has(item.file.type)
    if (!canEdit || (item.mediaFilter === 'none' && item.layers.length === 0)) return item.file

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

        for (const layer of item.layers) {
            if (layer.type === 'sticker') drawSticker(context, layer.stickerId, layer.x * canvas.width, layer.y * canvas.height, Math.min(canvas.width, canvas.height) * 0.0016 * layer.scale, layer.rotation)
            else drawTextLayer(context, layer, canvas.width, canvas.height)
        }

        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not export this edited image.')), item.file.type, 0.92))
        return new File([blob], item.file.name, { type: blob.type || item.file.type, lastModified: item.file.lastModified })
    } finally {
        bitmap.close()
    }
}

function drawSticker(context: CanvasRenderingContext2D, id: RiffStickerId, centerX: number, centerY: number, unit: number, rotation: number) {
    context.save()
    context.translate(centerX, centerY)
    context.rotate(rotation * Math.PI / 180)
    context.scale(unit, unit)
    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.shadowColor = 'rgba(0,0,0,0.28)'
    context.shadowBlur = 8

    if (id === 'heart') {
        context.beginPath()
        context.moveTo(0, 36)
        context.bezierCurveTo(-10, 26, -39, 2, -35, -17)
        context.bezierCurveTo(-32, -36, -9, -36, 0, -19)
        context.bezierCurveTo(9, -36, 32, -36, 35, -17)
        context.bezierCurveTo(39, 2, 10, 26, 0, 36)
        context.closePath()
        context.fillStyle = '#f17f90'
        context.fill()
        context.strokeStyle = '#fff2e9'
        context.lineWidth = 5
        context.stroke()
    } else if (id === 'idea' || id === 'riff') {
        context.beginPath()
        context.roundRect(-83, -30, 166, 60, 15)
        context.fillStyle = id === 'idea' ? '#d8c49b' : '#d9e7dd'
        context.fill()
        context.strokeStyle = '#fff4dd'
        context.lineWidth = 4
        context.stroke()
        context.shadowBlur = 0
        context.fillStyle = id === 'idea' ? '#28251e' : '#213a2b'
        context.font = '800 19px system-ui, sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(id === 'idea' ? 'GOOD IDEA' : 'RIFF IT', 0, 1)
    } else if (id === 'branch') {
        context.beginPath()
        context.moveTo(-27, -30)
        context.lineTo(-27, 15)
        context.quadraticCurveTo(-27, 30, -12, 30)
        context.lineTo(23, 30)
        context.moveTo(23, 30)
        context.lineTo(10, 17)
        context.moveTo(23, 30)
        context.lineTo(10, 43)
        context.moveTo(-27, -2)
        context.lineTo(23, -2)
        context.lineTo(12, -13)
        context.moveTo(23, -2)
        context.lineTo(12, 9)
        context.strokeStyle = '#e9f0e7'
        context.lineWidth = 10
        context.stroke()
        for (const [x, y, color] of [[-27, -30, '#d6bd82'], [23, -2, '#99b6a1'], [23, 30, '#99b6a1']] as const) {
            context.beginPath()
            context.arc(x, y, 10, 0, Math.PI * 2)
            context.fillStyle = color
            context.fill()
            context.strokeStyle = '#fff7e5'
            context.lineWidth = 3
            context.stroke()
        }
    } else {
        const points = id === 'starburst' ? 16 : 8
        const outer = id === 'starburst' ? 48 : 42
        const inner = id === 'starburst' ? 38 : 7
        context.beginPath()
        for (let i = 0; i < points; i++) {
            const radius = i % 2 === 0 ? outer : inner
            const angle = (Math.PI * 2 * i) / points - Math.PI / 2
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            if (i === 0) context.moveTo(x, y)
            else context.lineTo(x, y)
        }
        context.closePath()
        context.fillStyle = id === 'starburst' ? '#e9bd69' : '#d6bd82'
        context.fill()
        context.strokeStyle = '#fff2d6'
        context.lineWidth = 4
        context.stroke()
        if (id === 'starburst') {
            context.shadowBlur = 0
            context.beginPath()
            context.arc(0, 0, 10, 0, Math.PI * 2)
            context.fillStyle = '#fff0c6'
            context.fill()
        }
    }
    context.restore()
}

function drawTextLayer(context: CanvasRenderingContext2D, layer: Extract<CanvasLayer, { type: 'text' }>, width: number, height: number) {
    context.save()
    context.translate(layer.x * width, layer.y * height)
    context.rotate(layer.rotation * Math.PI / 180)
    context.scale(layer.scale, layer.scale)
    const fontSize = Math.max(24, Math.min(width, height) * 0.07)
    context.font = `800 ${fontSize}px system-ui, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const metrics = context.measureText(layer.text)
    if (layer.style === 'label') {
        const padX = fontSize * 0.55
        const padY = fontSize * 0.3
        const boxWidth = metrics.width + padX * 2
        const boxHeight = fontSize + padY * 2
        context.beginPath()
        context.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, boxHeight / 2)
        context.fillStyle = '#181a18cc'
        context.fill()
        context.strokeStyle = '#f1f0e866'
        context.lineWidth = Math.max(2, fontSize * 0.04)
        context.stroke()
    }
    context.shadowColor = 'rgba(0,0,0,0.7)'
    context.shadowBlur = fontSize * 0.16
    context.fillStyle = '#fffdf5'
    context.fillText(layer.text, 0, 0, Math.min(width * 0.85, 1400))
    context.restore()
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
    const [activeTool, setActiveTool] = useState<'filters' | 'stickers' | 'text' | 'layers'>('filters')
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
    const [newText, setNewText] = useState('')
    const item = files.find((file) => file.id === selectedId) ?? files[0]
    if (!item) return null
    const index = files.findIndex((file) => file.id === item.id)
    const isPhoto = editablePhotoTypes.has(item.file.type)
    const isImage = item.file.type.startsWith('image/') && item.file.type !== 'image/svg+xml'
    const isVideo = item.file.type.startsWith('video/')
    const filter = RIFF_MEDIA_FILTERS.find((option) => option.id === item.mediaFilter)?.css ?? 'none'
    const activeLayer = item.layers.find((layer) => layer.id === selectedLayerId) ?? item.layers[item.layers.length - 1] ?? null

    function updateLayer(layerId: string, patch: Partial<CanvasLayer>) {
        onUpdate(item.id, { layers: item.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } as CanvasLayer : layer) })
    }

    function moveLayer(layer: CanvasLayer, event: React.PointerEvent<HTMLElement>) {
        const stage = stageRef.current?.getBoundingClientRect()
        if (!stage || !event.currentTarget.hasPointerCapture(event.pointerId)) return
        updateLayer(layer.id, { x: Math.max(0.02, Math.min(0.98, (event.clientX - stage.left) / stage.width)), y: Math.max(0.02, Math.min(0.98, (event.clientY - stage.top) / stage.height)) })
    }

    function addSticker(stickerId: RiffStickerId) {
        const layer: CanvasLayer = { id: crypto.randomUUID(), type: 'sticker', stickerId, x: 0.5 + (item.layers.length % 3 - 1) * 0.08, y: 0.5 + (item.layers.length % 3 - 1) * 0.08, scale: 1, rotation: 0 }
        onUpdate(item.id, { layers: [...item.layers, layer] })
        setSelectedLayerId(layer.id)
    }

    function addText() {
        const text = newText.trim().slice(0, 80)
        if (!text) return
        const layer: CanvasLayer = { id: crypto.randomUUID(), type: 'text', text, style: 'label', x: 0.5, y: 0.5, scale: 1, rotation: 0 }
        onUpdate(item.id, { layers: [...item.layers, layer] })
        setSelectedLayerId(layer.id)
        setNewText('')
    }

    function reorderLayer(layerId: string, direction: -1 | 1) {
        const from = item.layers.findIndex((layer) => layer.id === layerId)
        const to = from + direction
        if (from < 0 || to < 0 || to >= item.layers.length) return
        const layers = [...item.layers]
        ;[layers[from], layers[to]] = [layers[to], layers[from]]
        onUpdate(item.id, { layers })
    }

    return (
        <article className="overflow-hidden rounded-2xl border border-riff-outline bg-riff-surface">
            <div className="relative flex min-h-48 max-h-[58dvh] items-center justify-center overflow-hidden bg-riff-surface-low p-3 sm:p-5">
                {isPhoto && item.previewUrl ? <div ref={stageRef} className="relative inline-block max-h-[52dvh] max-w-full select-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={`Editing ${item.file.name}`} draggable={false} className="block max-h-[52dvh] max-w-full object-contain" style={{ filter }} />
                    {item.layers.map((layer) => <button key={layer.id} type="button" aria-label={`Move ${layer.type === 'sticker' ? RIFF_STICKERS.find((sticker) => sticker.id === layer.stickerId)?.label ?? 'sticker' : layer.text}`} onClick={() => setSelectedLayerId(layer.id)} onPointerDown={(event) => { setSelectedLayerId(layer.id); event.currentTarget.setPointerCapture(event.pointerId); moveLayer(layer, event) }} onPointerMove={(event) => moveLayer(layer, event)} style={{ left: `${layer.x * 100}%`, top: `${layer.y * 100}%`, transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})` }} className={`absolute touch-none cursor-move select-none focus-visible:outline-2 focus-visible:outline-riff-accent ${selectedLayerId === layer.id ? 'ring-1 ring-white/70 ring-offset-4 ring-offset-transparent' : ''} ${layer.type === 'sticker' ? (layer.stickerId === 'idea' || layer.stickerId === 'riff' ? 'w-36' : 'w-24') : `whitespace-nowrap px-3 py-1.5 text-lg font-extrabold drop-shadow-[0_2px_5px_rgba(0,0,0,0.75)] ${layer.style === 'label' ? 'rounded-full border border-white/20 bg-black/70 text-white backdrop-blur-sm' : 'text-white'}`}`}>{layer.type === 'sticker' ? <StickerArtwork id={layer.stickerId} className="h-auto w-full overflow-visible" /> : layer.text}</button>)}
                </div> : isImage && item.previewUrl ? <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={`Preview of ${item.file.name}`} className="max-h-[52dvh] max-w-full object-contain" />
                </> : isVideo && item.previewUrl ? <video src={item.previewUrl} controls muted className="max-h-[52dvh] max-w-full" /> : <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-riff-muted"><span className="flex size-14 items-center justify-center rounded-2xl bg-riff-surface-2"><Icon name="file" size={26} /></span><span className="max-w-56 truncate text-sm">{item.file.name}</span></div>}
                {files.length > 1 && <>
                    <button type="button" aria-label="Previous attachment" onClick={() => onSelect(files[index === 0 ? files.length - 1 : index - 1].id)} className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur transition hover:bg-black/75"><Icon name="arrow-left" size={16} /></button>
                    <button type="button" aria-label="Next attachment" onClick={() => onSelect(files[(index + 1) % files.length].id)} className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur transition hover:bg-black/75"><Icon name="chevron-right" size={16} /></button>
                    <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">{index + 1} / {files.length}</span>
                </>}
            </div>

            {files.length > 1 && <div aria-label="Attachments in this post" className="flex gap-2 overflow-x-auto border-t border-riff-outline px-3 py-2.5">
                {files.map((file, fileIndex) => <button key={file.id} type="button" aria-current={file.id === item.id ? 'true' : undefined} aria-label={`Select attachment ${fileIndex + 1}: ${file.file.name}`} onClick={() => onSelect(file.id)} className={`relative size-14 shrink-0 overflow-hidden rounded-lg border transition ${file.id === item.id ? 'border-riff-accent ring-2 ring-riff-accent/20' : 'border-riff-outline opacity-75 hover:opacity-100'}`}>
                    {file.previewUrl && file.file.type.startsWith('image/') ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={file.previewUrl} alt="" className="size-full object-cover" style={{ filter: RIFF_MEDIA_FILTERS.find((option) => option.id === file.mediaFilter)?.css ?? 'none' }} />
                    </> : file.previewUrl && file.file.type.startsWith('video/') ? <video src={file.previewUrl} className="size-full object-cover" /> : <span className="flex size-full items-center justify-center bg-riff-surface-2 text-riff-muted"><Icon name="file" size={17} /></span>}
                    <span className="absolute bottom-0.5 right-1 rounded bg-black/65 px-1 text-[9px] leading-4 text-white">{fileIndex + 1}</span>
                </button>)}
            </div>}

            <div className="border-t border-riff-outline">
                <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-riff-text">{item.file.name}</p><p className="mt-0.5 text-xs text-riff-muted">{item.giphyId ? 'GIF hosted by GIPHY' : `${(item.file.size / 1024 / 1024).toFixed(1)} MB`}{files.length > 1 ? ` · Item ${index + 1} of ${files.length}` : ''}</p></div>
                    <button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => onRemove(item.id)} className="flex size-9 shrink-0 items-center justify-center rounded-full text-riff-muted transition hover:bg-rose-300/10 hover:text-rose-200"><Icon name="trash" size={15} /></button>
                </div>
                {isPhoto && <div role="tablist" aria-label="Edit attachment" className="flex gap-1 border-b border-riff-outline px-3 sm:px-4">
                    {([{ id: 'filters', label: 'Filters', icon: 'image' }, { id: 'stickers', label: 'Stickers', icon: 'plus' }, { id: 'text', label: 'Text', icon: 'image' }, { id: 'layers', label: 'Layers', icon: 'repost' }] as const).map((tool) => <button key={tool.id} type="button" role="tab" aria-selected={activeTool === tool.id} onClick={() => setActiveTool(tool.id)} className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition ${activeTool === tool.id ? 'border-riff-accent text-riff-accent-soft' : 'border-transparent text-riff-muted hover:text-riff-text'}`}><Icon name={tool.icon} size={14} />{tool.label}</button>)}
                </div>}
                <div className="p-3.5 sm:p-4">
                    {isPhoto && activeTool === 'filters' && <fieldset>
                        <legend className="sr-only">Choose a filter for this image</legend>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{RIFF_MEDIA_FILTERS.map((option) => <button key={option.id} type="button" aria-pressed={item.mediaFilter === option.id} onClick={() => onUpdate(item.id, { mediaFilter: option.id })} className={`overflow-hidden rounded-xl border text-left transition ${item.mediaFilter === option.id ? 'border-riff-accent/60 ring-1 ring-riff-accent/20' : 'border-riff-outline hover:border-riff-muted'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.previewUrl} alt="" className="h-12 w-full object-cover sm:h-14" style={{ filter: option.css }} />
                            <span className="block truncate px-2 py-1.5 text-[10px] font-medium text-riff-muted">{option.label}</span>
                        </button>)}</div>
                    </fieldset>}
                    {isPhoto && activeTool === 'stickers' && <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {RIFF_STICKERS.map((sticker) => <button key={sticker.id} type="button" aria-label={`Add ${sticker.label} sticker`} onClick={() => addSticker(sticker.id)} className="group flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border border-riff-outline bg-riff-surface-low px-1.5 py-2 transition hover:border-riff-muted hover:bg-riff-surface-2">
                            <span className="flex h-10 w-full items-center justify-center"><StickerArtwork id={sticker.id} className={`${sticker.id === 'idea' || sticker.id === 'riff' ? 'w-14' : 'w-9'} h-auto transition-transform group-hover:scale-110`} /></span>
                            <span className="text-[10px] font-medium text-riff-muted">{sticker.label}</span>
                        </button>)}
                    </div>}
                    {isPhoto && activeTool === 'text' && <div className="flex gap-2"><input value={newText} maxLength={80} onChange={(event) => setNewText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addText() }} placeholder="Write something on your image" className="min-w-0 flex-1 rounded-xl border border-riff-outline bg-riff-surface-low px-3 py-2.5 text-sm text-riff-text outline-none focus:border-riff-accent" /><Button type="button" variant="secondary" size="compact" disabled={!newText.trim()} onClick={addText}><Icon name="plus" size={14} />Add text</Button></div>}
                    {isPhoto && activeTool === 'layers' && <div className="space-y-2">
                        {item.layers.length === 0 && <p className="text-xs text-riff-muted">Add text and stickers to build up your image. Drag anything on the canvas to place it.</p>}
                        {[...item.layers].reverse().map((layer) => <div key={layer.id} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${activeLayer?.id === layer.id ? 'border-riff-accent/50 bg-riff-accent/[0.06]' : 'border-riff-outline bg-riff-surface-low'}`}><button type="button" onClick={() => setSelectedLayerId(layer.id)} className="min-w-0 flex-1 truncate text-left text-xs text-riff-text">{layer.type === 'sticker' ? `Sticker · ${RIFF_STICKERS.find((sticker) => sticker.id === layer.stickerId)?.label}` : `Text · ${layer.text}`}</button><button type="button" aria-label="Move layer forward" onClick={() => reorderLayer(layer.id, 1)} className="rounded-md p-1.5 text-xs text-riff-muted hover:text-riff-text">↑</button><button type="button" aria-label="Move layer backward" onClick={() => reorderLayer(layer.id, -1)} className="rounded-md p-1.5 text-xs text-riff-muted hover:text-riff-text">↓</button><button type="button" aria-label="Remove layer" onClick={() => { onUpdate(item.id, { layers: item.layers.filter((entry) => entry.id !== layer.id) }); if (selectedLayerId === layer.id) setSelectedLayerId(null) }} className="rounded-md p-1.5 text-riff-muted hover:text-rose-300"><Icon name="trash" size={14} /></button></div>)}
                        {activeLayer && <div className="grid gap-3 border-t border-riff-outline pt-3 sm:grid-cols-2"><label className="space-y-1 text-[11px] text-riff-muted"><span>Size</span><input aria-label="Layer size" type="range" min="0.4" max="2.5" step="0.05" value={activeLayer.scale} onChange={(event) => updateLayer(activeLayer.id, { scale: Number(event.target.value) })} className="w-full accent-riff-accent" /></label><label className="space-y-1 text-[11px] text-riff-muted"><span>Rotate</span><input aria-label="Layer rotation" type="range" min="-180" max="180" step="1" value={activeLayer.rotation} onChange={(event) => updateLayer(activeLayer.id, { rotation: Number(event.target.value) })} className="w-full accent-riff-accent" /></label>{activeLayer.type === 'text' && <div className="flex gap-2 sm:col-span-2"><input aria-label="Edit overlay text" value={activeLayer.text} maxLength={80} onChange={(event) => updateLayer(activeLayer.id, { text: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-riff-outline bg-riff-surface px-3 py-2 text-xs text-riff-text" /><button type="button" onClick={() => updateLayer(activeLayer.id, { style: activeLayer.style === 'label' ? 'plain' : 'label' })} className="rounded-lg border border-riff-outline px-3 text-xs text-riff-muted">{activeLayer.style === 'label' ? 'Label style' : 'Plain style'}</button></div>}</div>}
                    </div>}
                    {activeTool === 'layers' && !isPhoto && <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-riff-muted">Attachment {index + 1} of {files.length}</p>
                        <div className="flex gap-2"><Button type="button" variant="secondary" size="compact" disabled={index === 0} onClick={() => onMove(item.id, -1)}><Icon name="arrow-left" size={14} />Move left</Button><Button type="button" variant="secondary" size="compact" disabled={index === files.length - 1} onClick={() => onMove(item.id, 1)}>Move right<Icon name="chevron-right" size={14} /></Button></div>
                    </div>}
                    {!isPhoto && <div className="flex items-center justify-between gap-3"><p className="text-xs text-riff-muted">This file will be attached as-is.</p><div className="flex gap-2"><Button type="button" variant="secondary" size="compact" disabled={index === 0} onClick={() => onMove(item.id, -1)}>Move left</Button><Button type="button" variant="secondary" size="compact" disabled={index === files.length - 1} onClick={() => onMove(item.id, 1)}>Move right</Button></div></div>}
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
    const [draggingFiles, setDraggingFiles] = useState(false)
    const objectUrls = useRef(new Set<string>())
    const router = useRouter()
    const supabase = createClient()
    const remaining = 1000 - content.length

    useEffect(() => () => {
        for (const url of objectUrls.current) URL.revokeObjectURL(url)
        objectUrls.current.clear()
    }, [])

    function addFiles(selected: File[], externalGif?: { id: string; previewUrl: string; pageUrl: string }): boolean {
        setError('')
        if (files.length + selected.length > maxFiles) {
            setError(`Choose up to ${maxFiles} files per Riff.`)
            return false
        }
        if (selected.some((file) => file.size > maxFileSize)) {
            setError('Each file must be 50 MB or smaller.')
            return false
        }
        const additions = selected.map((file, index) => {
            const previewable = (file.type.startsWith('image/') && file.type !== 'image/svg+xml') || file.type.startsWith('video/')
            const isExternalGif = Boolean(externalGif && index === 0)
            const previewUrl = isExternalGif ? externalGif!.previewUrl : previewable ? URL.createObjectURL(file) : ''
            if (previewUrl && !isExternalGif) objectUrls.current.add(previewUrl)
            return { id: crypto.randomUUID(), file, previewUrl, mediaFilter: 'none' as const, layers: [], giphyId: isExternalGif ? externalGif!.id : null, giphyPageUrl: isExternalGif ? externalGif!.pageUrl : null }
        })
        setFiles((current) => [...current, ...additions])
        setSelectedMediaId((current) => current ?? additions[0]?.id ?? null)
        return true
    }

    function addGiphyGif(gif: { id: string; previewUrl: string; pageUrl: string }) {
        if (!/^[a-zA-Z0-9]+$/.test(gif.id)) {
            setError('That GIF could not be added. Choose another one.')
            return false
        }
        return addFiles([new File([], 'GIPHY GIF.gif', { type: 'image/gif' })], gif)
    }

    function removeFile(id: string) {
        const item = files.find((entry) => entry.id === id)
        if (item?.previewUrl && !item.giphyId) {
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
        const uploaded: { item: PendingMedia; file: File; path: string; url: string; external: boolean }[] = []
        try {
            for (const [index, item] of files.entries()) {
                if (item.giphyId) {
                    uploaded.push({ item, file: item.file, path: `external:giphy:${id}:${crypto.randomUUID()}:${item.giphyId}`, url: item.giphyPageUrl ?? `https://giphy.com/gifs/${item.giphyId}`, external: true })
                    continue
                }
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
                uploaded.push({ item, file: preparedFile, path, url: publicData.publicUrl, external: false })
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
                const storedPaths = uploaded.filter((file) => !file.external).map((file) => file.path)
                if (storedPaths.length) await supabase.storage.from('riff-files').remove(storedPaths)
                setError(insertError.message)
                setSaving(false)
                setUploadStatus('')
                return
            }

            if (uploaded.length) {
                const { error: attachmentError } = await supabase.from('riff_attachments').insert(uploaded.map(({ item, file, path, url }, index) => ({
                    riff_id: id,
                    author_id: authorId,
                    filename: item.giphyId ? 'GIF via GIPHY' : file.name.slice(0, 255),
                    storage_path: path,
                    public_url: url,
                    mime_type: item.giphyId ? 'application/x-giphy' : file.type || 'application/octet-stream',
                    byte_size: item.giphyId ? 0 : file.size,
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
            const storedPaths = uploaded.filter((file) => !file.external).map((file) => file.path)
            if (storedPaths.length) await supabase.storage.from('riff-files').remove(storedPaths)
            setError(caught instanceof Error ? `Could not post your Riff: ${caught.message}` : 'Could not post your Riff. Check your connection and try again.')
            setSaving(false)
            setUploadStatus('')
        }
    }

    return (
        <form onSubmit={submitRiff} className="mx-auto w-full max-w-4xl space-y-6">
            <div className="space-y-6">
                {parent ? <div className="border-l-2 border-riff-accent/40 pl-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-riff-muted"><Icon name="branch" size={14} />Replying to {parent.author_name}</div>
                    {parent.content && <RiffContent content={parent.content} className="line-clamp-3 text-sm" />}
                </div> : <fieldset>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-riff-faint">Post type</legend>
                    <div role="group" aria-label="Post type" className="flex flex-wrap items-center gap-2">
                        {kindOptions.map((option) => <button key={option.kind} type="button" aria-pressed={kind === option.kind} onClick={() => setKind(option.kind)} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${kind === option.kind ? 'border-riff-accent/45 bg-riff-accent/[0.08] text-riff-accent-soft' : 'border-riff-outline text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text'}`}><Icon name={option.kind === 'riff' ? 'branch' : 'lock'} size={15} />{option.label}</button>)}
                        <span className="ml-1 text-xs text-riff-muted">{kind === 'riff' ? 'Others can branch from it.' : 'A standalone post.'}</span>
                    </div>
                </fieldset>}

                <MarkdownEditor compact id="riff-content" value={content} onChange={setContent} rows={5} placeholder={parent ? 'Add your take…' : kind === 'black' ? 'What’s on your mind?' : 'Start with a thought…'} />

                <section aria-labelledby="attachments-title" onDragEnter={(event) => { event.preventDefault(); setDraggingFiles(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingFiles(false) }} onDrop={(event) => { event.preventDefault(); setDraggingFiles(false); addFiles(Array.from(event.dataTransfer.files)) }} className={`space-y-3 transition ${draggingFiles ? 'rounded-2xl bg-riff-accent/[0.06] p-3 ring-1 ring-riff-accent/50' : ''}`}>
                    <div className="flex items-center justify-between gap-3 border-t border-riff-outline py-3">
                        <div className="min-w-0"><h2 id="attachments-title" className="text-sm font-medium text-riff-text">Add media <span className="ml-1 text-xs font-normal text-riff-faint">{files.length}/{maxFiles}</span></h2><p className="mt-0.5 text-xs text-riff-muted">Photos, video, or any file · up to 50 MB each</p></div>
                        <div className="flex shrink-0 items-center gap-2"><label htmlFor="riff-files" className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-riff-outline px-3.5 text-xs font-semibold text-riff-text transition hover:bg-riff-surface-2 ${files.length >= maxFiles || saving ? 'pointer-events-none opacity-45' : ''}`}><Icon name="plus" size={14} />Choose files</label><GifPicker apiKey={process.env.NEXT_PUBLIC_GIPHY_API_KEY} keyName="NEXT_PUBLIC_GIPHY_API_KEY" disabled={saving || files.length >= maxFiles} onAddGif={addGiphyGif} /></div>
                        <input id="riff-files" type="file" multiple disabled={saving || files.length >= maxFiles} onChange={(event) => { addFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = '' }} className="sr-only" />
                    </div>
                    {files.length > 0 ? <MediaStudio files={files} selectedId={selectedMediaId} onSelect={setSelectedMediaId} onUpdate={updateFile} onRemove={removeFile} onMove={moveFile} /> : <div className={`flex min-h-20 items-center gap-3 rounded-xl px-4 py-3 transition ${draggingFiles ? 'bg-riff-accent/[0.08]' : 'bg-riff-surface-low/60'}`}><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-riff-surface-2 text-riff-muted"><Icon name="upload" size={16} /></span><span className="text-sm text-riff-muted">{draggingFiles ? 'Drop to attach' : 'Or drag files here'}</span><span className="ml-auto hidden text-xs text-riff-faint sm:inline">Files are visible to people who can see your post.</span></div>}
                </section>

                {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3.5 py-2.5 text-sm text-red-200">{error}</p>}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-riff-outline pt-4">
                    <div className="min-w-0">{uploadStatus ? <p role="status" className="text-sm text-riff-muted">{uploadStatus}</p> : <p className="text-xs text-riff-faint">{parent ? 'This branch joins the original thread.' : kind === 'riff' ? 'Your post can grow into a thread.' : 'Your post will stand on its own.'}</p>}</div>
                    <Button type="submit" disabled={saving || remaining < 0} className="min-h-11 rounded-full px-5">
                        {saving ? 'Posting…' : parent ? 'Post branch' : 'Share post'}
                        {!saving && <Icon name="arrow-up-right" size={16} />}
                    </Button>
                </div>
            </div>
        </form>
    )
}
