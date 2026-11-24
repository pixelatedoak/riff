import { redirect } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { ProfileEditor, type ProfileData } from '@/app/profile/profile-editor'
import { createClient } from '@/lib/supabase/server'
import type { RiffAuthor, RiffRecord } from '@/lib/riffs/types'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: moderator } = user.email
        ? await supabase.from('riff_moderators').select('email').eq('email', user.email.toLowerCase()).maybeSingle()
        : { data: null }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, pronouns, description, avatar_url, links')
        .eq('id', user.id)
        .maybeSingle()

    const { data: postData } = await supabase
        .from('riffs')
        .select('id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

    const profile: ProfileData = {
        id: user.id,
        username: data?.username ?? '',
        full_name: data?.full_name ?? String(user.user_metadata?.full_name ?? ''),
        pronouns: data?.pronouns ?? '',
        description: data?.description ?? '',
        avatar_url: data?.avatar_url ?? String(user.user_metadata?.avatar_url ?? ''),
        links: data?.links ?? [],
    }
    const posts = (postData ?? []) as RiffRecord[]
    const authors: RiffAuthor[] = [{
        id: user.id,
        username: profile.username || null,
        full_name: profile.full_name || null,
        avatar_url: profile.avatar_url || null,
    }]
    const { data: attachments } = posts.length > 0
        ? await supabase.from('riff_attachments').select('id, riff_id, filename, storage_path, public_url, mime_type, byte_size').in('riff_id', posts.map((post) => post.id))
        : { data: [] }

    return (
        <main className="min-h-screen bg-transparent pb-24 text-zinc-100">
            <ProfileEditor initialProfile={profile} loadError={error?.message ?? null} initialPosts={posts} authors={authors} initialAttachments={attachments ?? []} isModerator={Boolean(moderator)} />
            <BottomNavigation active="profile" />
        </main>
    )
}
