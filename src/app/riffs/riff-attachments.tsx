'use client'

import { useState } from 'react'
import type { RiffAttachment } from '@/lib/riffs/types'

function readableSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function RiffAttachments({ attachments }: { attachments: RiffAttachment[] }) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    if (attachments.length === 0) return null

    return (
        <div className="mt-4 space-y-3">
            {attachments.map((file) => {
                const type = file.mime_type.toLowerCase()
                const previewable = type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/') || type === 'application/pdf' || type.startsWith('text/')
                const showPreview = previewable && (type !== 'text/html' || expanded[file.id])
                const downloadUrl = `${file.public_url}${file.public_url.includes('?') ? '&' : '?'}download=${encodeURIComponent(file.filename)}`

                return (
                    <section key={file.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
                        {showPreview && type.startsWith('image/') && type !== 'image/svg+xml' && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={file.public_url} alt={file.filename} loading="lazy" className="max-h-[34rem] w-full bg-black/30 object-contain" />
                        )}
                        {showPreview && type.startsWith('video/') && <video src={file.public_url} controls preload="metadata" className="max-h-[34rem] w-full bg-black" />}
                        {showPreview && type.startsWith('audio/') && <audio src={file.public_url} controls preload="metadata" className="w-full px-4 py-5" />}
                        {showPreview && type === 'application/pdf' && <iframe src={file.public_url} title={file.filename} sandbox="" className="h-[min(70vh,42rem)] w-full bg-white" />}
                        {showPreview && type.startsWith('text/') && type !== 'text/html' && <iframe src={file.public_url} title={file.filename} sandbox="" className="h-64 w-full bg-white" />}
                        {type === 'text/html' && expanded[file.id] && <iframe src={file.public_url} title={file.filename} sandbox="" className="h-72 w-full bg-white" />}
                        <div className="flex items-center gap-3 px-3.5 py-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-300/[0.08] text-violet-200" aria-hidden="true">{type.startsWith('image/') ? '▧' : type.startsWith('video/') ? '▶' : type.startsWith('audio/') ? '♫' : '↗'}</div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-zinc-200">{file.filename}</p>
                                <p className="mt-0.5 text-[11px] text-zinc-500">{type || 'Unknown type'} · {readableSize(file.byte_size)}</p>
                            </div>
                            {type === 'text/html' && <button type="button" onClick={() => setExpanded((value) => ({ ...value, [file.id]: !value[file.id] }))} className="rounded-lg px-2.5 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200">{expanded[file.id] ? 'Hide preview' : 'Preview'}</button>}
                            {type === 'application/pdf' && <a href={file.public_url} target="_blank" rel="noreferrer" className="rounded-lg px-2.5 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200">Open</a>}
                            {type === 'image/svg+xml' && <a href={file.public_url} target="_blank" rel="noreferrer" className="rounded-lg px-2.5 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200">Open</a>}
                            <a href={downloadUrl} className="rounded-lg border border-white/[0.09] px-2.5 py-2 text-xs font-medium text-violet-100 hover:bg-violet-300/[0.07]">Download</a>
                        </div>
                    </section>
                )
            })}
        </div>
    )
}
