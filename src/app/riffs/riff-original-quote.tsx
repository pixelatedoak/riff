'use client'

import Link from 'next/link'
import { useOriginalRiff } from '@/app/riffs/riff-social-provider'
import { Icon } from '@/components/icon'

export function RiffOriginalQuote({ parentId }: { parentId: string }) {
    const original = useOriginalRiff(parentId)
    if (!original) return null

    const { post, author, attachments } = original
    const image = attachments.find((attachment) => attachment.mime_type.toLowerCase().startsWith('image/') && attachment.mime_type.toLowerCase() !== 'image/svg+xml')
    const gif = attachments.find((attachment) => attachment.mime_type === 'application/x-giphy')
    const gifId = gif?.storage_path.startsWith('external:giphy:') ? gif.storage_path.split(':').at(-1) : null
    const displayName = author?.full_name || (author?.username ? `@${author.username}` : 'Riff user')

    return <aside className="mt-3 overflow-hidden rounded-xl border border-riff-outline bg-riff-surface-low px-3.5 py-3">
        <div className="flex items-center gap-2 text-xs">
            {author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt="" className="size-5 shrink-0 rounded-full object-cover" />
            ) : <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-riff-surface-3 text-[9px] font-semibold text-riff-accent">{displayName.slice(0, 1).toUpperCase()}</span>}
            <span className="min-w-0 flex-1 truncate font-medium text-riff-text">{displayName}</span>
            <Link href={`/r/${post.id}`} className="inline-flex shrink-0 items-center gap-1 text-riff-faint transition hover:text-riff-accent"><Icon name="branch" size={12} />Original Riff</Link>
        </div>
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-5 text-riff-muted">{post.content || 'Shared media'}</p>
        {image && <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.public_url} alt={image.filename} loading="lazy" draggable={false} className="block max-h-40 max-w-full rounded-lg object-contain" />
        </div>}
        {gif && gifId && <div className="mt-2 overflow-hidden rounded-lg bg-black">
            <div className="relative aspect-video"><iframe src={`https://giphy.com/embed/${encodeURIComponent(gifId)}`} title="GIF via GIPHY" allow="autoplay; encrypted-media" allowFullScreen loading="lazy" className="absolute inset-0 size-full border-0" /></div>
            <a href="https://giphy.com" target="_blank" rel="noreferrer" className="block px-2 py-1 text-right text-[9px] font-semibold text-zinc-400">Powered by GIPHY</a>
        </div>}
    </aside>
}
