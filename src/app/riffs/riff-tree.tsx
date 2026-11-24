import Link from 'next/link'
import type { RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import type { RiffAttachment } from '@/lib/riffs/types'
import { RiffAttachments } from '@/app/riffs/riff-attachments'
import { RiffSocialActions } from '@/app/riffs/riff-social-actions'
import { RiffSocialProvider } from '@/app/riffs/riff-social-provider'

function AuthorAvatar({ author, size = 'size-8' }: { author: RiffAuthor | undefined; size?: string }) {
    const name = author?.full_name || author?.username || 'Riff user'
    const initials = name.split(/[\s_]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
    const avatarUrl = author?.avatar_url

    return (
        <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#292632] text-xs font-semibold text-violet-100`}>
            {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : initials}
        </span>
    )
}

function AuthorLink({ author, authorId }: { author: RiffAuthor | undefined; authorId: string }) {
    const name = author?.full_name || (author?.username ? `@${author.username}` : `Riff user ${authorId.slice(0, 6)}`)

    return author?.username ? (
        <Link href={`/u/${encodeURIComponent(author.username)}`} className="truncate text-sm font-medium text-zinc-200 hover:text-violet-200">{name}</Link>
    ) : (
        <span className="truncate text-sm font-medium text-zinc-200">{name}</span>
    )
}

function PostBody({ post, author, branchCount, compact, attachments }: { post: RiffRecord; author?: RiffAuthor; branchCount: number; compact: boolean; attachments: RiffAttachment[] }) {
    const date = new Date(post.created_at)
    const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

    return (
        <div className={compact ? 'py-2' : ''}>
            <div className="flex items-center gap-2.5">
                <AuthorAvatar author={author} size={compact ? 'size-7' : 'size-9'} />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <AuthorLink author={author} authorId={post.author_id} />
                    <span className="text-zinc-700">·</span>
                    <time dateTime={post.created_at} className="shrink-0 text-xs text-zinc-500">{dateLabel}</time>
                </div>
                {post.kind === 'black' ? (
                    <span className="rounded-full border border-rose-300/15 bg-rose-300/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-rose-200/80">Black Riff</span>
                ) : post.parent_riff_id ? (
                    <span className="rounded-full border border-violet-300/15 bg-violet-300/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-200/80">Riffed</span>
                ) : (
                    <span className="rounded-full border border-cyan-200/10 bg-cyan-200/[0.04] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-100/70">Open Riff</span>
                )}
            </div>

            {post.deleted_at ? (
                <p className={`mt-4 italic text-zinc-500 ${compact ? 'text-sm leading-6' : 'text-[15px] leading-7'}`}>This Riff was deleted.</p>
            ) : <p className={`whitespace-pre-wrap break-words text-zinc-200 ${compact ? 'mt-2 text-sm leading-6' : 'mt-4 text-[15px] leading-7'}`}>{post.content}</p>}

            {!post.deleted_at && <RiffAttachments attachments={attachments} />}

            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                {post.kind === 'riff' && post.allow_branches !== false && (
                    <Link href={`/create?parent=${post.id}`} className="inline-flex items-center gap-1.5 transition hover:text-violet-200">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14m0-7h7m0 0c3.5 0 3.5-5 7-5m-7 5c3.5 0 3.5 5 7 5" /></svg>
                        Riff off
                    </Link>
                )}
                <Link href={`/r/${post.id}`} className="transition hover:text-violet-200">
                    {branchCount > 0 ? `${branchCount} ${branchCount === 1 ? 'branch' : 'branches'}` : 'Open thread'}
                </Link>
            </div>
            {!post.deleted_at && <RiffSocialActions riffId={post.id} authorId={post.author_id} content={post.content} kind={post.kind} commentsEnabled={post.comments_enabled !== false} allowBranches={post.kind === 'riff' && post.allow_branches !== false} />}
        </div>
    )
}

export function RiffPosts({ riffs, authors, attachments = [] }: { riffs: RiffRecord[]; authors: RiffAuthor[]; attachments?: RiffAttachment[] }) {
    const authorMap = new Map(authors.map((author) => [author.id, author]))
    const attachmentMap = new Map<string, RiffAttachment[]>()
    for (const attachment of attachments) attachmentMap.set(attachment.riff_id, [...(attachmentMap.get(attachment.riff_id) ?? []), attachment])

    if (riffs.length === 0) return null

    return (
        <RiffSocialProvider riffIds={riffs.map((riff) => riff.id)} authorIds={[...new Set(riffs.map((riff) => riff.author_id))]}>
        <div className="space-y-3">
            {riffs.map((riff) => (
                <article key={riff.id} className="rounded-xl border border-white/[0.07] bg-[#131318]/75 px-4 py-3.5">
                    <PostBody post={riff} author={authorMap.get(riff.author_id)} branchCount={0} compact attachments={attachmentMap.get(riff.id) ?? []} />
                </article>
            ))}
        </div>
        </RiffSocialProvider>
    )
}

export function RiffTree({ riffs, authors, rootId, attachments = [] }: { riffs: RiffRecord[]; authors: RiffAuthor[]; rootId?: string; attachments?: RiffAttachment[] }) {
    const authorMap = new Map(authors.map((author) => [author.id, author]))
    const attachmentMap = new Map<string, RiffAttachment[]>()
    for (const attachment of attachments) attachmentMap.set(attachment.riff_id, [...(attachmentMap.get(attachment.riff_id) ?? []), attachment])
    const childrenMap = new Map<string, RiffRecord[]>()

    for (const riff of riffs) {
        if (!riff.parent_riff_id) continue
        const children = childrenMap.get(riff.parent_riff_id) ?? []
        children.push(riff)
        childrenMap.set(riff.parent_riff_id, children)
    }
    for (const children of childrenMap.values()) {
        children.sort((left, right) => left.created_at.localeCompare(right.created_at))
    }

    function countBranches(id: string): number {
        const children = childrenMap.get(id) ?? []
        return children.reduce((count, child) => count + 1 + countBranches(child.id), 0)
    }

    function renderPost(post: RiffRecord, depth: number): React.ReactNode {
        const children = childrenMap.get(post.id) ?? []
        const body = <PostBody post={post} author={authorMap.get(post.author_id)} branchCount={countBranches(post.id)} compact={depth > 0} attachments={attachmentMap.get(post.id) ?? []} />

        return depth === 0 ? (
            <article key={post.id} className="rounded-2xl border border-white/[0.08] bg-[#131318]/95 p-5 shadow-[0_14px_42px_rgba(0,0,0,0.18)] sm:p-6">
                {body}
                {children.length > 0 && <div className="mt-4">{children.map((child) => renderPost(child, depth + 1))}</div>}
            </article>
        ) : (
            <div key={post.id} className="relative ml-2 border-l border-violet-300/20 pl-4 sm:ml-3 sm:pl-5">
                <span aria-hidden="true" className="absolute left-0 top-6 w-3 border-t border-violet-300/25 sm:w-4" />
                <article className="border-b border-white/[0.05] last:border-b-0">
                    {body}
                    {children.length > 0 && <div className="mt-1">{children.map((child) => renderPost(child, depth + 1))}</div>}
                </article>
            </div>
        )
    }

    const roots = rootId ? riffs.filter((riff) => riff.id === rootId) : riffs.filter((riff) => riff.parent_riff_id === null)

    if (roots.length === 0) return null

    return <RiffSocialProvider riffIds={riffs.map((riff) => riff.id)} authorIds={[...new Set(riffs.map((riff) => riff.author_id))]}><div className="space-y-4">{roots.map((root) => renderPost(root, 0))}</div></RiffSocialProvider>
}
