import type { RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import type { RiffAttachment } from '@/lib/riffs/types'
import { RiffPostCard } from '@/app/riffs/riff-post-card'
import { RiffSocialActions } from '@/app/riffs/riff-social-actions'
import { RiffSocialProvider } from '@/app/riffs/riff-social-provider'
import { Icon } from '@/components/icon'

function BranchToggle({ count, children, defaultOpen = false }: { count: number; children: React.ReactNode; defaultOpen?: boolean }) {
    if (count === 0) return null
    return (
        <details open={defaultOpen || undefined} className="group/branch-toggle mt-3 border-t border-riff-outline pt-3">
            <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-xs font-medium text-riff-muted transition hover:bg-riff-surface-2 hover:text-riff-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-riff-accent [&::-webkit-details-marker]:hidden">
                <Icon name="branch" size={14} />
                Show {count} {count === 1 ? 'branch' : 'branches'}
                <Icon name="chevron-right" size={14} className="transition-transform group-open/branch-toggle:rotate-90" />
            </summary>
            <div className="mt-2">{children}</div>
        </details>
    )
}

export function RiffPosts({ riffs, authors, attachments = [] }: { riffs: RiffRecord[]; authors: RiffAuthor[]; attachments?: RiffAttachment[] }) {
    const visibleRiffs = riffs.filter((riff) => !riff.deleted_at)
    const authorMap = new Map(authors.map((author) => [author.id, author]))
    const attachmentMap = new Map<string, RiffAttachment[]>()
    for (const attachment of attachments) attachmentMap.set(attachment.riff_id, [...(attachmentMap.get(attachment.riff_id) ?? []), attachment])

    if (visibleRiffs.length === 0) return null

    return (
        <RiffSocialProvider riffIds={visibleRiffs.map((riff) => riff.id)} authorIds={[...new Set(visibleRiffs.map((riff) => riff.author_id))]} parentIds={visibleRiffs.flatMap((riff) => riff.parent_riff_id ? [riff.parent_riff_id] : [])}>
        <div className="space-y-3">
            {visibleRiffs.map((riff) => (
                <div key={riff.id} data-riff-post-layout className="grid grid-cols-1 gap-x-3 lg:grid-cols-[3rem_minmax(0,1fr)_3rem]">
                    <RiffPostCard post={riff} author={authorMap.get(riff.author_id)} branchCount={0} compact attachments={attachmentMap.get(riff.id) ?? []} className="col-start-1 row-start-1 self-start rounded-card border border-riff-outline bg-riff-surface px-4 py-3.5 lg:col-start-2" />
                    <RiffSocialActions riffId={riff.id} authorId={riff.author_id} content={riff.content} kind={riff.kind} commentsEnabled={riff.comments_enabled !== false} allowBranches={riff.kind === 'riff' && riff.allow_branches !== false} hasAttachments={(attachmentMap.get(riff.id) ?? []).length > 0} floating />
                </div>
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
        return depth === 0 ? (
            <div key={post.id} data-riff-post-layout className="grid grid-cols-1 gap-x-3 lg:grid-cols-[3rem_minmax(0,1fr)_3rem]">
                <RiffPostCard post={post} author={authorMap.get(post.author_id)} branchCount={countBranches(post.id)} compact={false} attachments={attachmentMap.get(post.id) ?? []} className="col-start-1 row-start-1 self-start rounded-card border border-riff-outline bg-riff-surface p-5 sm:p-6 lg:col-start-2">
                    {children.length > 0 && <BranchToggle count={children.length} defaultOpen={Boolean(rootId)}>{children.map((child) => renderPost(child, depth + 1))}</BranchToggle>}
                </RiffPostCard>
                {!post.deleted_at && <RiffSocialActions riffId={post.id} authorId={post.author_id} content={post.content} kind={post.kind} commentsEnabled={post.comments_enabled !== false} allowBranches={post.kind === 'riff' && post.allow_branches !== false} hasAttachments={(attachmentMap.get(post.id) ?? []).length > 0} floating />}
            </div>
        ) : (
            <div key={post.id} className="relative ml-2 border-l border-riff-outline pl-4 sm:ml-3 sm:pl-5">
                <span aria-hidden="true" className="absolute left-0 top-6 w-3 border-t border-riff-outline sm:w-4" />
                <RiffPostCard post={post} author={authorMap.get(post.author_id)} branchCount={countBranches(post.id)} compact attachments={attachmentMap.get(post.id) ?? []} className="relative border-b border-riff-outline last:border-b-0">
                    {!post.deleted_at && <RiffSocialActions riffId={post.id} authorId={post.author_id} content={post.content} kind={post.kind} commentsEnabled={post.comments_enabled !== false} allowBranches={post.kind === 'riff' && post.allow_branches !== false} hasAttachments={(attachmentMap.get(post.id) ?? []).length > 0} />}
                    {children.length > 0 && <BranchToggle count={children.length} defaultOpen={Boolean(rootId)}>{children.map((child) => renderPost(child, depth + 1))}</BranchToggle>}
                </RiffPostCard>
            </div>
        )
    }

    const roots = rootId ? riffs.filter((riff) => riff.id === rootId) : riffs.filter((riff) => riff.parent_riff_id === null)

    if (roots.length === 0) return null

    return <RiffSocialProvider riffIds={riffs.map((riff) => riff.id)} authorIds={[...new Set(riffs.map((riff) => riff.author_id))]} parentIds={riffs.flatMap((riff) => riff.parent_riff_id ? [riff.parent_riff_id] : [])}><div className="space-y-4">{roots.map((root) => renderPost(root, 0))}</div></RiffSocialProvider>
}
