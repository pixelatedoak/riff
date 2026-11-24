'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RiffKind } from '@/lib/riffs/types'

type ParentRiff = {
    id: string
    author_id: string
    content: string
    kind: RiffKind
    author_name: string
}

const kindOptions: { kind: RiffKind; label: string; detail: string }[] = [
    { kind: 'riff', label: 'Open Riff', detail: 'People can branch from this.' },
    { kind: 'black', label: 'Black Riff', detail: 'A standalone post. No branches.' },
]

export function RiffComposer({ authorId, parent }: { authorId: string; parent: ParentRiff | null }) {
    const [kind, setKind] = useState<RiffKind>('riff')
    const [content, setContent] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const router = useRouter()
    const supabase = createClient()
    const remaining = 1000 - content.length

    async function submitRiff(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const text = content.trim()
        setError('')

        if (!text) {
            setError('Add a thought before you post.')
            return
        }
        if (text.length > 1000) {
            setError('Keep your Riff to 1,000 characters or less.')
            return
        }

        if (files.length > 5) {
            setError('Attach up to five files per Riff.')
            return
        }
        if (files.some((file) => file.size > 50 * 1024 * 1024)) {
            setError('Each file must be 50 MB or smaller.')
            return
        }

        const id = crypto.randomUUID()
        setSaving(true)
        const uploaded: { file: File; path: string; url: string }[] = []
        try {
            for (const file of files) {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180) || 'file'
                const path = `${authorId}/${id}/${crypto.randomUUID()}-${safeName}`
                const { error: uploadError } = await supabase.storage.from('riff-files').upload(path, file, {
                    contentType: file.type || 'application/octet-stream',
                    upsert: false,
                })
                if (uploadError) throw uploadError
                const { data: publicData } = supabase.storage.from('riff-files').getPublicUrl(path)
                uploaded.push({ file, path, url: publicData.publicUrl })
            }

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
                return
            }

            if (uploaded.length) {
                const { error: attachmentError } = await supabase.from('riff_attachments').insert(uploaded.map(({ file, path, url }) => ({
                    riff_id: id,
                    author_id: authorId,
                    filename: file.name.slice(0, 255),
                    storage_path: path,
                    public_url: url,
                    mime_type: file.type || 'application/octet-stream',
                    byte_size: file.size,
                })))
                if (attachmentError) {
                    await supabase.rpc('soft_delete_riff', { p_riff_id: id })
                    throw attachmentError
                }
            }

            router.replace(`/r/${id}`)
            router.refresh()
        } catch {
            if (uploaded.length) await supabase.storage.from('riff-files').remove(uploaded.map((file) => file.path))
            setError('Could not post your Riff. Check your connection and try again.')
            setSaving(false)
        }
    }

    return (
        <form onSubmit={submitRiff} className="overflow-hidden rounded-3xl border border-white/[0.09] bg-[#121216] shadow-[0_28px_90px_rgba(0,0,0,0.25)]">
            <div aria-hidden="true" className="h-1 bg-gradient-to-r from-violet-300 via-fuchsia-300/70 to-cyan-200/70" />
            <div className="p-5 sm:p-7">
                {parent ? (
                    <div className="mb-6 rounded-2xl border border-violet-300/15 bg-violet-300/[0.045] p-4">
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200/75">
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14m0-7h7m0 0c3.5 0 3.5-5 7-5m-7 5c3.5 0 3.5 5 7 5" /></svg>
                            Branching from {parent.author_name}
                        </div>
                        <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{parent.content}</p>
                    </div>
                ) : (
                    <fieldset className="mb-6">
                        <legend className="mb-2.5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Choose a post type</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {kindOptions.map((option) => (
                                <button
                                    key={option.kind}
                                    type="button"
                                    aria-pressed={kind === option.kind}
                                    onClick={() => setKind(option.kind)}
                                    className={`rounded-xl border p-3 text-left transition ${kind === option.kind ? 'border-violet-300/30 bg-violet-300/[0.08]' : 'border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.04]'}`}
                                >
                                    <span className={`block text-sm font-medium ${kind === option.kind ? 'text-violet-100' : 'text-zinc-300'}`}>{option.label}</span>
                                    <span className="mt-1 block text-xs leading-5 text-zinc-500">{option.detail}</span>
                                </button>
                            ))}
                        </div>
                    </fieldset>
                )}

                <label htmlFor="riff-content" className="mb-2 block text-sm font-medium text-zinc-200">
                    {parent ? 'Add your branch' : kind === 'black' ? 'What’s on your mind?' : 'Start a thought'}
                </label>
                <textarea
                    id="riff-content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={1000}
                    rows={7}
                    autoFocus
                    placeholder={parent ? 'Take the thought somewhere new…' : 'Leave a little room for someone else to riff.'}
                    className="w-full resize-y rounded-2xl border border-white/[0.08] bg-[#0c0c10] px-4 py-4 text-[15px] leading-7 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-300/35 focus:ring-4 focus:ring-violet-300/[0.06]"
                />

                <div className="mt-2 flex items-center justify-between gap-4">
                    <p className="text-xs text-zinc-600">{parent ? 'Your branch will appear under the original Riff.' : kind === 'black' ? 'Black Riffs can’t be branched.' : 'Open Riffs can grow into a branch tree.'}</p>
                    <span className={`shrink-0 text-xs ${remaining < 0 ? 'text-red-300' : 'text-zinc-600'}`}>{remaining}</span>
                </div>

                <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <label htmlFor="riff-files" className="block text-sm font-medium text-zinc-200">Attach files <span className="font-normal text-zinc-500">· images, video, audio, documents, and more</span></label>
                    <input id="riff-files" type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="mt-3 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-300/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-violet-100 hover:file:bg-violet-300/15" />
                    <p className="mt-2 text-xs text-zinc-600">Up to 5 files, 50 MB each. Browser-friendly files preview in the post. Files are public: anyone with a link can view or download them.</p>
                    {files.length > 0 && <ul className="mt-3 space-y-1 text-xs text-zinc-400">{files.map((file) => <li key={`${file.name}-${file.size}`} className="truncate">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</li>)}</ul>}
                </div>

                {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3.5 py-2.5 text-sm text-red-200">{error}</p>}

                <div className="mt-6 flex justify-end">
                    <button type="submit" disabled={saving || remaining < 0} className="inline-flex items-center gap-2 rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-semibold text-[#17121f] transition hover:bg-violet-200 disabled:cursor-wait disabled:opacity-50">
                        {saving ? 'Posting…' : parent ? 'Post branch' : kind === 'black' ? 'Post Black Riff' : 'Post Riff'}
                        {!saving && <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" /></svg>}
                    </button>
                </div>
            </div>
        </form>
    )
}
