'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { RiffContent } from '@/components/riff-content'
import { Textarea } from '@/components/ui/input'

type FormatAction = { label: string; title: string; before: string; after: string; placeholder: string }
const formatActions: FormatAction[] = [
    { label: 'B', title: 'Bold', before: '**', after: '**', placeholder: 'bold text' },
    { label: 'I', title: 'Italic', before: '*', after: '*', placeholder: 'italic text' },
    { label: 'H', title: 'Heading', before: '## ', after: '', placeholder: 'Heading' },
    { label: '❝', title: 'Quote', before: '> ', after: '', placeholder: 'Quoted text' },
    { label: '</>', title: 'Inline code', before: '`', after: '`', placeholder: 'code' },
    { label: '•', title: 'Bullet list', before: '- ', after: '', placeholder: 'List item' },
    { label: '1.', title: 'Numbered list', before: '1. ', after: '', placeholder: 'List item' },
    { label: '↗', title: 'Link', before: '[', after: '](https://example.com)', placeholder: 'link text' },
]

export function MarkdownEditor({ id, value, onChange, maxLength = 1000, rows = 7, placeholder, compact = false }: {
    id: string
    value: string
    onChange: (value: string) => void
    maxLength?: number
    rows?: number
    placeholder?: string
    compact?: boolean
}) {
    const editorRef = useRef<HTMLTextAreaElement>(null)
    const [view, setView] = useState<'write' | 'preview'>('write')
    const [toolsOpen, setToolsOpen] = useState(false)

    function apply(action: FormatAction) {
        const editor = editorRef.current
        if (!editor) return
        const start = editor.selectionStart
        const end = editor.selectionEnd
        const selected = value.slice(start, end) || action.placeholder
        const insertion = `${action.before}${selected}${action.after}`
        const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`
        onChange(nextValue)
        requestAnimationFrame(() => {
            editor.focus()
            editor.setSelectionRange(start + action.before.length, start + action.before.length + selected.length)
        })
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
            event.preventDefault()
            apply(formatActions[0])
        } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i') {
            event.preventDefault()
            apply(formatActions[1])
        }
    }

    return (
        <section className={`overflow-hidden ${compact ? 'border-b border-riff-outline' : 'rounded-2xl border border-riff-outline bg-riff-surface-low'}`} aria-label="Post text editor">
            <div className={`flex flex-wrap items-center justify-between gap-2 ${compact ? 'py-2' : 'border-b border-riff-outline px-3 py-2'}`}>
                {compact ? <span className="text-xs font-medium text-riff-muted">Caption</span> : <div role="tablist" aria-label="Writing mode" className="flex rounded-lg bg-riff-bg p-1">
                    <button type="button" role="tab" aria-selected={view === 'write'} onClick={() => setView('write')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === 'write' ? 'bg-riff-surface-3 text-riff-text' : 'text-riff-muted'}`}>Write</button>
                    <button type="button" role="tab" aria-selected={view === 'preview'} onClick={() => setView('preview')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === 'preview' ? 'bg-riff-surface-3 text-riff-text' : 'text-riff-muted'}`}>Preview</button>
                </div>}
                {compact && <div className="flex items-center gap-1">
                    <button type="button" aria-pressed={toolsOpen} onClick={() => setToolsOpen((open) => !open)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${toolsOpen ? 'bg-riff-surface-3 text-riff-accent' : 'text-riff-muted hover:bg-riff-surface-3 hover:text-riff-text'}`}>Aa&nbsp; Format</button>
                    <button type="button" onClick={() => setView((current) => current === 'write' ? 'preview' : 'write')} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-riff-muted transition hover:bg-riff-surface-3 hover:text-riff-text">{view === 'write' ? 'Preview' : 'Write'}</button>
                </div>}
                {view === 'write' && (!compact || toolsOpen) && <div role="toolbar" aria-label="Text formatting" className={`flex items-center gap-1 ${compact ? 'w-full overflow-x-auto border-t border-riff-outline pt-2 sm:w-auto sm:border-0 sm:pt-0' : 'flex-wrap'}`}>
                    {formatActions.map((action) => <button key={action.title} type="button" title={action.title} aria-label={action.title} onClick={() => apply(action)} className="min-h-8 min-w-8 rounded-lg px-2 text-xs font-semibold text-riff-muted transition hover:bg-riff-surface-3 hover:text-riff-text">{action.label}</button>)}
                </div>}
            </div>
            {view === 'write' ? <Textarea
                ref={editorRef}
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={maxLength}
                rows={rows}
                placeholder={placeholder}
                className={`${compact ? 'min-h-36 px-0 py-3 text-lg leading-7' : 'min-h-40 px-4 py-4 text-[15px] leading-7'} rounded-none border-0 bg-transparent focus:ring-0`}
            /> : <div role="tabpanel" className="min-h-40 px-4 py-4 text-[15px] leading-7">
                {value.trim() ? <RiffContent content={value} /> : <p className="text-sm text-riff-faint">Nothing to preview yet.</p>}
            </div>}
            <div className={`flex items-center justify-between gap-3 ${compact ? 'py-2' : 'border-t border-riff-outline px-4 py-2.5'}`}>
                <p className="text-[11px] text-riff-faint">{compact ? 'Markdown is optional' : 'Markdown supported · bold, lists, quotes, links'}</p>
                <span className={`text-xs ${value.length > maxLength ? 'text-rose-300' : 'text-riff-faint'}`}>{value.length}/{maxLength}</span>
            </div>
        </section>
    )
}
