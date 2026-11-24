export type RiffKind = 'riff' | 'black'

export type RiffRecord = {
    id: string
    author_id: string
    parent_riff_id: string | null
    root_riff_id: string
    kind: RiffKind
    content: string
    created_at: string
    deleted_at?: string | null
    comments_enabled?: boolean
    allow_branches?: boolean
}

export type RiffAttachment = {
    id: string
    riff_id: string
    filename: string
    storage_path: string
    public_url: string
    mime_type: string
    byte_size: number
}

export type RiffAuthor = {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
}
