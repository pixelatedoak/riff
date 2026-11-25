import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type RiffPreviewData = {
    id: string
    authorName: string
    content: string
    description: string
    kind: 'riff' | 'black'
    attachmentCount: number
    imageUrl: string | null
}

export const getRiffPreviewData = cache(async (id: string): Promise<RiffPreviewData | null> => {
    const supabase = await createClient()
    const { data: post } = await supabase.from('riffs')
        .select('id, author_id, kind, content, deleted_at')
        .eq('id', id)
        .maybeSingle()
    if (!post || post.deleted_at) return null

    const [{ data: author }, { data: attachments, count: attachmentCount }] = await Promise.all([
        supabase.from('profiles').select('username, full_name').eq('id', post.author_id).maybeSingle(),
        supabase.from('riff_attachments').select('public_url, mime_type', { count: 'exact' }).eq('riff_id', post.id).order('sort_order', { ascending: true }).limit(10),
    ])
    const authorName = author?.full_name || (author?.username ? `@${author.username}` : 'A Riff user')
    const content = String(post.content ?? '').replace(/\s+/g, ' ').trim()
    const description = content
        ? content.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/([*_~`>#])/g, '').slice(0, 220)
        : post.kind === 'black' ? 'A standalone thought on Riff.' : 'An open thought, ready to branch.'

    let imageUrl: string | null = null
    const firstImage = attachments?.find((attachment) => ['image/jpeg', 'image/png'].includes(attachment.mime_type.toLowerCase()))
    if (firstImage) {
        try {
            const mediaUrl = new URL(firstImage.public_url)
            const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ''
            if (storageOrigin && mediaUrl.origin === storageOrigin && mediaUrl.pathname.includes('/storage/v1/object/public/')) imageUrl = mediaUrl.toString()
        } catch {
            imageUrl = null
        }
    }
    return { id: post.id, authorName, content, description, kind: post.kind as 'riff' | 'black', attachmentCount: attachmentCount ?? 0, imageUrl }
})
