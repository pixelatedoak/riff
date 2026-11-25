import Link from 'next/link'
import type { ReactNode } from 'react'
import type { RiffAttachment, RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import { RiffAttachments } from '@/app/riffs/riff-attachments'
import { RiffFollowButton } from '@/app/riffs/riff-social-actions'
import { RiffOriginalQuote } from '@/app/riffs/riff-original-quote'
import { ClickableRiffCard } from '@/app/riffs/clickable-riff-card'
import { Icon } from '@/components/icon'
import { Badge } from '@/components/ui/badge'
import { RiffContent } from '@/components/riff-content'

export function RiffPostBody({ post, author, branchCount, compact, attachments }: { post: RiffRecord; author?: RiffAuthor; branchCount: number; compact: boolean; attachments: RiffAttachment[] }) {
    const date = new Date(post.created_at)
    const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const authorName = author?.full_name || author?.username || 'Riff user'
    const initials = authorName.split(/[\s_]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')

    return (
        <div className={compact ? 'py-2' : ''}>
            <div className="flex items-center gap-2.5">
                <span className={`flex ${compact ? 'size-7' : 'size-9'} shrink-0 items-center justify-center overflow-hidden rounded-full border border-riff-outline bg-riff-surface-3 text-xs font-semibold text-riff-accent`}>
                    {author?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatar_url} alt="" className="size-full object-cover" />
                    ) : initials}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {author?.username ? (
                        <Link href={`/u/${encodeURIComponent(author.username)}`} className="truncate text-sm font-medium text-zinc-200 hover:text-amber-200">{author.full_name || `@${author.username}`}</Link>
                    ) : <span className="truncate text-sm font-medium text-zinc-200">{author?.full_name || `Riff user ${post.author_id.slice(0, 6)}`}</span>}
                    <RiffFollowButton authorId={post.author_id} />
                    <span className="text-zinc-700">·</span>
                    <time dateTime={post.created_at} className="shrink-0 text-xs text-zinc-500">{dateLabel}</time>
                </div>
                {post.kind === 'black' ? <Badge tone="neutral"><Icon name="lock" size={12} />Black Riff</Badge> : post.parent_riff_id ? <Badge tone="neutral"><Icon name="branch" size={12} />Riffed</Badge> : <Badge tone="neutral"><Icon name="branch" size={12} />Open Riff</Badge>}
            </div>

            {post.parent_riff_id && !post.deleted_at && <RiffOriginalQuote parentId={post.parent_riff_id} />}
            {post.deleted_at ? <p className={`mt-4 italic text-zinc-500 ${compact ? 'text-sm leading-6' : 'text-[15px] leading-7'}`}>This Riff was deleted.</p> : <RiffContent content={post.content} className={compact ? 'mt-2 text-sm' : 'mt-4 text-[15px]'} />}
            {!post.deleted_at && <RiffAttachments attachments={attachments} />}
            {branchCount > 0 && <div className="mt-3 text-xs text-riff-faint">{branchCount} {branchCount === 1 ? 'branch' : 'branches'}</div>}
        </div>
    )
}

export function RiffPostCard({ post, author, branchCount, compact, attachments, className, children }: {
    post: RiffRecord
    author?: RiffAuthor
    branchCount: number
    compact: boolean
    attachments: RiffAttachment[]
    className: string
    children?: ReactNode
}) {
    return <ClickableRiffCard href={`/r/${post.id}`} className={className}>
        <div data-riff-post-content>
            <RiffPostBody post={post} author={author} branchCount={branchCount} compact={compact} attachments={attachments} />
            {children}
        </div>
    </ClickableRiffCard>
}
