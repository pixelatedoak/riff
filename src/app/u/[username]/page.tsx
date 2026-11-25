import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { ProfileSections } from '@/app/profile/profile-sections'
import { FollowProfileButton } from '@/app/profile/follow-profile-button'
import { createClient } from '@/lib/supabase/server'
import type { RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import { Icon } from '@/components/icon'

type PublicProfile = {
    id: string
    username: string
    full_name: string | null
    pronouns: string | null
    description: string | null
    avatar_url: string | null
    links: string[] | null
}

function safeImageUrl(value: string | null) {
    if (!value) return null
    try {
        const url = new URL(value)
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
    } catch {
        return null
    }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params
    const normalizedUsername = username.toLowerCase()
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) notFound()

    const supabase = await createClient()
    const [{ data: { user } }, { data: profileData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
            .from('profiles')
            .select('id, username, full_name, pronouns, description, avatar_url, links')
            .eq('username', normalizedUsername)
            .maybeSingle(),
    ])

    const profile = profileData as PublicProfile | null
    if (!profile) notFound()

    const [{ count: followerCount }, { data: postData }] = await Promise.all([
        supabase.from('riff_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', profile.id),
        supabase.from('riffs')
            .select('id, author_id, parent_riff_id, root_riff_id, kind, content, created_at, comments_enabled, allow_branches, deleted_at')
            .eq('author_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(100),
    ])

    const name = profile.full_name || `@${profile.username}`
    const initials = (profile.full_name || profile.username || 'R')
        .split(/[\s_]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase() ?? '')
        .join('')
    const avatarUrl = safeImageUrl(profile.avatar_url)
    const posts = (postData ?? []) as RiffRecord[]
    const authors: RiffAuthor[] = [{
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
    }]
    const { data: attachments } = posts.length > 0
        ? await supabase.from('riff_attachments').select('id, riff_id, filename, storage_path, public_url, mime_type, byte_size, media_filter, sticker, sort_order').in('riff_id', posts.map((post) => post.id)).order('sort_order', { ascending: true }).order('created_at', { ascending: true })
        : { data: [] }
    const links = (profile.links ?? []).flatMap((link: string) => {
        try {
            const url = new URL(link.includes('://') ? link : `https://${link}`)
            return url.protocol === 'https:' || url.protocol === 'http:' ? [{ link, url }] : []
        } catch {
            return []
        }
    })
    const sections = ['Posts', 'Riffs', 'Black Riffs', 'Reposts']

    return (
        <main className="min-h-dvh bg-riff-bg pb-24 text-riff-text">
            <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-12 lg:max-w-5xl lg:px-10 lg:pt-14">
                <div className="mb-5 flex items-center justify-between">
                    <Link href="/" className="text-lg font-semibold tracking-tight text-riff-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-riff-accent">
                        riff
                    </Link>
                    {user?.id === profile.id
                        ? <Link href="/profile" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5">Edit profile</Link>
                        : <FollowProfileButton profileId={profile.id} initialCount={followerCount ?? 0} />}
                </div>

                <section aria-label={`${name}'s profile`} className="overflow-hidden rounded-card border border-riff-outline bg-riff-surface shadow-[0_24px_90px_rgba(0,0,0,0.2)]">
                    <div className="relative h-32 overflow-hidden bg-riff-surface-3 sm:h-40">
                        <div aria-hidden="true" className="absolute -right-10 -top-28 size-80 rounded-full border border-white/[0.08]" />
                        <div aria-hidden="true" className="absolute right-20 -top-20 size-64 rounded-full border border-white/[0.07]" />
                        <svg aria-hidden="true" viewBox="0 0 320 150" fill="none" className="absolute bottom-0 right-0 h-28 w-64 text-white/35 sm:h-36 sm:w-80" stroke="currentColor" strokeWidth="1">
                            <path d="M18 132h86c26 0 30-60 58-60h110M18 132h86c26 0 30 44 58 44h110" />
                            <circle cx="18" cy="132" r="4" fill="currentColor" />
                            <circle cx="272" cy="72" r="5" fill="currentColor" />
                            <circle cx="272" cy="176" r="5" fill="currentColor" />
                        </svg>
                    </div>
                    <div className="px-5 pb-6 sm:px-7 sm:pb-8">
                        <div className="relative z-10 -mt-11 flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-riff-surface bg-riff-surface-3 text-2xl font-semibold text-riff-accent">
                            {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt={`${name} profile picture`} className="size-full object-cover" />
                            ) : initials}
                        </div>
                        <h1 className="riff-page-heading mt-5 text-3xl">{name}</h1>
                        <p className="mt-1 text-sm text-zinc-500">@{profile.username}</p>
                        {profile.pronouns && <p className="mt-4 text-sm text-zinc-400">{profile.pronouns}</p>}
                        {profile.description && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-zinc-300">{profile.description}</p>}
                        {links.length > 0 && (
                            <ul className="mt-5 flex flex-wrap gap-2">
                                {links.map(({ link, url }) => (
                                    <li key={link}><a href={url.toString()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-riff-accent/20 bg-riff-accent/5 px-3 py-1.5 text-xs text-riff-accent hover:bg-riff-accent/10"><Icon name="link" size={13} />{url.hostname}</a></li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                <section aria-label="Posts" className="mt-7">
                    <ProfileSections sections={sections} profileName={name} profileId={profile.id} posts={posts} authors={authors} attachments={attachments ?? []} />
                </section>
            </div>
            {user && <BottomNavigation active="profile" />}
        </main>
    )
}
