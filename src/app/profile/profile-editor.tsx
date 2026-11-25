'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SignOutButton } from '@/app/signout-button'
import { ProfileSections } from '@/app/profile/profile-sections'
import type { RiffAuthor, RiffRecord } from '@/lib/riffs/types'
import type { RiffAttachment } from '@/lib/riffs/types'
import { Icon } from '@/components/icon'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

export type ProfileData = {
    id: string
    username: string
    full_name: string
    pronouns: string
    description: string
    avatar_url: string
    links: string[]
}

type ProfileDraft = Omit<ProfileData, 'links'> & { linksText: string }

const sections = ['Posts', 'Riffs', 'Black Riffs', 'Reposts', 'Liked', 'Saved']
type SortOrder = 'Newest first' | 'Oldest first'

const fieldClassName = 'w-full rounded-control border border-riff-outline bg-riff-surface-low px-3 py-2.5 text-sm text-riff-text outline-none placeholder:text-riff-faint focus:border-riff-accent focus:ring-2 focus:ring-riff-accent/20'

function safeWebUrl(value: string) {
    const candidate = value.trim()
    if (!candidate) return null

    try {
        const url = new URL(candidate.includes('://') ? candidate : `https://${candidate}`)
        return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
    } catch {
        return null
    }
}

function getOwnedAvatarPath(value: string, userId: string) {
    try {
        const pathname = new URL(value).pathname
        const marker = '/storage/v1/object/public/avatars/'
        const markerIndex = pathname.indexOf(marker)
        if (markerIndex < 0) return null

        const path = decodeURIComponent(pathname.slice(markerIndex + marker.length))
        return path.startsWith(`${userId}/`) ? path : null
    } catch {
        return null
    }
}

function getInitials(profile: Pick<ProfileData, 'full_name' | 'username'>) {
    const source = profile.full_name || profile.username || 'Riff user'
    return source
        .split(/[\s_]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
}

function toDraft(profile: ProfileData): ProfileDraft {
    return { ...profile, linksText: profile.links.join('\n') }
}

function ProfilePreview({ profile }: { profile: ProfileDraft }) {
    const previewName = profile.full_name.trim() || (profile.username.trim() ? `@${profile.username.replace(/^@/, '')}` : 'Your name')
    const previewUsername = profile.username.trim().replace(/^@/, '').toLowerCase()
    const previewAvatar = safeWebUrl(profile.avatar_url)
    const previewLinks = profile.linksText
        .split(/\r?\n/)
        .map((link) => safeWebUrl(link))
        .filter((url): url is URL => url !== null)

    return (
        <aside className="rounded-card border border-riff-outline bg-riff-surface-low p-3.5 sm:p-4">
            <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Live preview</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-300/80"><span className="size-1.5 rounded-full bg-emerald-300" />Private</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-riff-outline bg-riff-surface">
                <div className="relative z-0 h-24 overflow-hidden bg-riff-surface-3">
                    <div aria-hidden="true" className="absolute -right-5 -top-16 size-48 rounded-full border border-white/15" />
                    <div aria-hidden="true" className="absolute right-7 -top-8 size-32 rounded-full border border-white/10" />
                    <svg aria-hidden="true" viewBox="0 0 160 80" fill="none" className="absolute bottom-0 right-0 h-16 w-32 text-white/35" stroke="currentColor" strokeWidth="1">
                        <path d="M12 70h48c14 0 16-30 32-30h40M12 70h48c14 0 16 20 32 20h40" />
                        <circle cx="12" cy="70" r="3" fill="currentColor" />
                        <circle cx="132" cy="40" r="3" fill="currentColor" />
                        <circle cx="132" cy="90" r="3" fill="currentColor" />
                    </svg>
                </div>

                <div className="relative z-10 px-4 pb-4">
                    <div className="relative z-20 -mt-8 flex size-16 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-riff-surface bg-riff-surface-3 text-base font-semibold text-riff-accent">
                        {previewAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewAvatar.toString()} alt="" className="size-full object-cover" />
                        ) : getInitials(profile)}
                    </div>
                    <h3 className="mt-3 truncate text-base font-semibold text-white">{previewName}</h3>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{previewUsername ? `@${previewUsername}` : '@yourname'}</p>
                    {profile.pronouns.trim() && <p className="mt-3 text-xs text-zinc-400">{profile.pronouns.trim()}</p>}
                    <p className="mt-3 line-clamp-4 min-h-10 whitespace-pre-wrap text-xs leading-5 text-zinc-400">
                        {profile.description.trim() || 'Your description will appear here.'}
                    </p>
                    {previewLinks.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {previewLinks.slice(0, 3).map((url) => (
                                <span key={url.toString()} className="rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-2 py-1 text-[10px] text-amber-200/90">{url.hostname}</span>
                            ))}
                            {previewLinks.length > 3 && <span className="px-1 py-1 text-[10px] text-zinc-500">+{previewLinks.length - 3}</span>}
                        </div>
                    )}
                </div>
            </div>
            <p className="mt-3 px-1 text-[11px] leading-5 text-zinc-600">This is how your profile header will look to other people.</p>
        </aside>
    )
}

export function ProfileEditor({ initialProfile, loadError, initialPosts, authors, initialAttachments, isModerator = false }: {
    initialProfile: ProfileData
    loadError: string | null
    initialPosts: RiffRecord[]
    authors: RiffAuthor[]
    initialAttachments: RiffAttachment[]
    isModerator?: boolean
}) {
    const [profile, setProfile] = useState(initialProfile)
    const [draft, setDraft] = useState(() => toDraft(initialProfile))
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [uploadedAvatarPath, setUploadedAvatarPath] = useState<string | null>(null)
    const [error, setError] = useState(loadError)
    const [notice, setNotice] = useState('')
    const [sortOrder, setSortOrder] = useState<SortOrder>('Newest first')
    const [copied, setCopied] = useState(false)
    const supabase = createClient()

    function updateDraft(field: keyof Omit<ProfileDraft, 'id'>, value: string) {
        setDraft((current) => ({ ...current, [field]: value }))
    }

    function cancelEdit() {
        if (uploadedAvatarPath) {
            void supabase.storage.from('avatars').remove([uploadedAvatarPath]).catch(() => undefined)
            setUploadedAvatarPath(null)
        }
        setDraft(toDraft(profile))
        setEditing(false)
        setError(null)
    }

    async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
        const input = event.currentTarget
        const file = input.files?.[0]
        input.value = ''
        if (!file) return

        setError(null)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            setError('Choose a JPG, PNG, or WebP image.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Profile pictures must be 5 MB or smaller.')
            return
        }

        const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
        const path = `${profile.id}/${crypto.randomUUID()}.${extension}`
        setUploadingAvatar(true)

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false })

            if (uploadError) {
                setError(uploadError.message)
                return
            }

            if (uploadedAvatarPath) {
                await supabase.storage.from('avatars').remove([uploadedAvatarPath])
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(path)
            setUploadedAvatarPath(path)
            updateDraft('avatar_url', data.publicUrl)
        } catch {
            setError('Could not upload the image. Check your connection and try again.')
        } finally {
            setUploadingAvatar(false)
        }
    }

    async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setNotice('')

        const username = draft.username.trim().replace(/^@/, '').toLowerCase()
        if (!/^[a-z0-9_]{3,24}$/.test(username)) {
            setError('Username must be 3–24 characters using letters, numbers, or underscores.')
            return
        }

        const avatarUrl = draft.avatar_url.trim()
        if (avatarUrl && !safeWebUrl(avatarUrl)) {
            setError('Profile picture URL must start with http:// or https://.')
            return
        }

        const links = draft.linksText
            .split(/\r?\n/)
            .map((link) => link.trim())
            .filter(Boolean)
            .map((link) => safeWebUrl(link)?.toString() ?? null)

        if (links.some((link) => link === null)) {
            setError('Each link must be a valid web address.')
            return
        }

        setSaving(true)
        try {
            const previousAvatarPath = getOwnedAvatarPath(profile.avatar_url, profile.id)
            const updatedProfile: ProfileData = {
                id: profile.id,
                username,
                full_name: draft.full_name.trim(),
                pronouns: draft.pronouns.trim(),
                description: draft.description.trim(),
                avatar_url: avatarUrl ? safeWebUrl(avatarUrl)!.toString() : '',
                links: links as string[],
            }

            const { error: saveError } = await supabase
                .from('profiles')
                .upsert({
                    id: profile.id,
                    username: updatedProfile.username,
                    full_name: updatedProfile.full_name || null,
                    pronouns: updatedProfile.pronouns || null,
                    description: updatedProfile.description,
                    avatar_url: updatedProfile.avatar_url || null,
                    links: updatedProfile.links,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' })

            if (saveError) {
                setError(saveError.code === '23505' ? 'That username is already taken.' : saveError.message)
                return
            }

            if (uploadedAvatarPath && !updatedProfile.avatar_url.includes(uploadedAvatarPath)) {
                void supabase.storage.from('avatars').remove([uploadedAvatarPath]).catch(() => undefined)
            }
            if (previousAvatarPath && previousAvatarPath !== uploadedAvatarPath) {
                void supabase.storage.from('avatars').remove([previousAvatarPath]).catch(() => undefined)
            }

            setProfile(updatedProfile)
            setDraft(toDraft(updatedProfile))
            setUploadedAvatarPath(null)
            setEditing(false)
            setNotice('Profile saved.')
            window.setTimeout(() => setNotice(''), 3000)
        } catch {
            setError('Could not save your profile. Check your connection and try again.')
        } finally {
            setSaving(false)
        }
    }

    async function copyProfileLink() {
        if (!profile.username) {
            setError('Choose a username before copying your public profile link.')
            return
        }

        try {
            const publicProfileUrl = new URL(`/u/${encodeURIComponent(profile.username)}`, window.location.origin)
            await navigator.clipboard.writeText(publicProfileUrl.toString())
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
        } catch {
            setError('Could not copy the profile link from this browser.')
        }
    }

    const displayName = profile.full_name || (profile.username ? `@${profile.username}` : 'Your profile')
    const avatarUrl = safeWebUrl(profile.avatar_url)
    const validLinks = profile.links.map((link) => ({ link, url: safeWebUrl(link) })).filter((item) => item.url)

    return (
        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <p className="riff-overline">Your space / identity</p>
                    <h1 className="riff-page-heading mt-1 text-3xl sm:text-4xl">Profile</h1>
                </div>

                <details className="group relative">
                    <summary aria-label="Profile options" title="Profile options" className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white [&::-webkit-details-marker]:hidden">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-[18px]">
                            <circle cx="5" cy="12" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="19" cy="12" r="1.5" />
                        </svg>
                    </summary>
                    <div className="absolute right-0 top-11 z-10 min-w-48 rounded-xl border border-white/10 bg-[#19191e] p-2 shadow-xl">
                        <button type="button" onClick={copyProfileLink} disabled={!profile.username} className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-600">
                            {copied ? 'Link copied' : 'Copy profile link'}
                        </button>
                        <Link href="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"><Icon name="settings" size={15} />Account settings</Link>
                        {isModerator && <Link href="/moderation" className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">Moderation inbox</Link>}
                        <div className="my-1 border-t border-white/10" />
                        <SignOutButton />
                    </div>
                </details>
            </div>

            <section aria-label="Profile details" className="overflow-hidden rounded-card border border-riff-outline bg-riff-surface shadow-[0_24px_90px_rgba(0,0,0,0.2)]">
                {editing ? (
                    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
                    <form onSubmit={saveProfile} className="space-y-5">
                        <div className="mb-1">
                            <h2 className="text-base font-semibold text-white">Edit your details</h2>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">Make your corner of Riff feel like yours.</p>
                        </div>
                        <div className="flex items-center gap-4">
                                <div className="relative z-10 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#222228] text-lg font-semibold text-zinc-300">
                                {draft.avatar_url && safeWebUrl(draft.avatar_url) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={draft.avatar_url} alt="Profile picture preview" className="size-full object-cover" />
                                ) : getInitials(draft)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-200">Profile picture</p>
                                <p className="text-xs text-zinc-500">JPG, PNG, or WebP · max 5 MB</p>
                                <label htmlFor="avatar-upload" className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300/15 bg-amber-300/[0.06] px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-300/10 ${uploadingAvatar ? 'pointer-events-none opacity-50' : ''}`}>
                                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V14" /></svg>
                                    {uploadingAvatar ? 'Uploading…' : 'Upload image'}
                                </label>
                                <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={uploadingAvatar} className="sr-only" />
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm text-zinc-300">
                                Username
                                <Input value={draft.username} onChange={(event) => updateDraft('username', event.target.value)} className={`${fieldClassName} mt-1.5`} placeholder="yourname" maxLength={24} autoComplete="nickname" />
                            </label>
                            <label className="block text-sm text-zinc-300">
                                Name
                                <Input value={draft.full_name} onChange={(event) => updateDraft('full_name', event.target.value)} className={`${fieldClassName} mt-1.5`} placeholder="Your name" maxLength={80} autoComplete="name" />
                            </label>
                            <label className="block text-sm text-zinc-300">
                                Pronouns
                                <Input value={draft.pronouns} onChange={(event) => updateDraft('pronouns', event.target.value)} className={`${fieldClassName} mt-1.5`} placeholder="they/them" maxLength={40} />
                            </label>
                            <label className="block text-sm text-zinc-300">
                                Profile picture URL
                                <Input value={draft.avatar_url} onChange={(event) => updateDraft('avatar_url', event.target.value)} className={`${fieldClassName} mt-1.5`} placeholder="https://example.com/photo.jpg" type="url" />
                            </label>
                        </div>

                        <label className="block text-sm text-zinc-300">
                            Description
                            <Textarea value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} className={`${fieldClassName} mt-1.5 min-h-24 resize-y`} placeholder="A little about you" maxLength={280} />
                            <span className="mt-1 block text-right text-xs text-zinc-600">{draft.description.length}/280</span>
                        </label>

                        <label className="block text-sm text-zinc-300">
                            Links <span className="font-normal text-zinc-500">(one per line)</span>
                            <Textarea value={draft.linksText} onChange={(event) => updateDraft('linksText', event.target.value)} className={`${fieldClassName} mt-1.5 min-h-20 resize-y`} placeholder="https://example.com" />
                        </label>

                        {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}

                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving || uploadingAvatar}>Cancel</Button>
                            <Button type="submit" disabled={saving || uploadingAvatar}>{saving ? 'Saving…' : 'Save profile'}</Button>
                        </div>
                    </form>
                    <ProfilePreview profile={draft} />
                    </div>
                ) : (
                    <>
                        <div className="relative h-32 overflow-hidden bg-riff-surface-3 sm:h-40">
                            <div aria-hidden="true" className="absolute -right-10 -top-28 size-80 rounded-full border border-white/[0.08]" />
                            <div aria-hidden="true" className="absolute right-20 -top-20 size-64 rounded-full border border-white/[0.07]" />
                            <svg aria-hidden="true" viewBox="0 0 320 150" fill="none" className="absolute bottom-0 right-0 h-28 w-64 text-white/35 sm:h-36 sm:w-80" stroke="currentColor" strokeWidth="1">
                                <path d="M18 132h86c26 0 30-60 58-60h110M18 132h86c26 0 30 44 58 44h110" />
                                <circle cx="18" cy="132" r="4" fill="currentColor" />
                                <circle cx="272" cy="72" r="5" fill="currentColor" />
                                <circle cx="272" cy="176" r="5" fill="currentColor" />
                            </svg>
                            <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/75 backdrop-blur-sm">Riff profile</span>
                        </div>
                        <div className="px-5 pb-6 sm:px-7 sm:pb-8">
                            <div className="-mt-11 flex flex-wrap items-end justify-between gap-4">
                                <div className="relative z-10 flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#121216] bg-[#24212e] text-2xl font-semibold text-amber-100 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
                                    {avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={avatarUrl.toString()} alt={`${displayName} profile picture`} className="size-full object-cover" />
                                    ) : getInitials(profile)}
                                </div>
                                <button type="button" onClick={() => { setDraft(toDraft(profile)); setEditing(true); setError(null); setNotice('') }} className="mb-1 inline-flex items-center gap-2 rounded-control border border-riff-outline bg-riff-surface-2 px-4 py-2.5 text-sm font-medium text-riff-text transition hover:bg-riff-surface-3">
                                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4 11.5-11.5z" /></svg>
                                    Edit profile
                                </button>
                            </div>

                            <div className="mt-5">
                                <h2 className="text-2xl font-semibold tracking-tight text-white">{displayName}</h2>
                                <p className="mt-1 text-sm text-zinc-500">{profile.username ? `@${profile.username}` : 'Choose a username'}</p>
                                {profile.pronouns && <p className="mt-4 text-sm text-zinc-400">{profile.pronouns}</p>}
                                {profile.description ? <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-zinc-300">{profile.description}</p> : <p className="mt-3 text-sm text-zinc-600">Add a line or two about yourself.</p>}
                                {validLinks.length > 0 && (
                                    <ul className="mt-5 flex flex-wrap gap-2">
                                        {validLinks.map(({ link, url }) => (
                                            <li key={link}><a href={url!.toString()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-riff-accent/20 bg-riff-accent/5 px-3 py-1.5 text-xs text-riff-accent hover:bg-riff-accent/10">
                                                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.07 0l3-3A5 5 0 0013 2.93l-1.72 1.72M14 11a5 5 0 00-7.07 0l-3 3A5 5 0 0011 21.07l1.72-1.72" /></svg>
                                                {url!.hostname}
                                            </a></li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {loadError && !editing && <p role="alert" className="px-5 pb-5 text-sm text-red-300 sm:px-7">Could not load profile details. Run the profile SQL query, then reload.</p>}
            </section>

            {error && !editing && <p role="alert" className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-red-400/20 bg-[#231517] px-4 py-2.5 text-sm text-red-200 shadow-xl">{error}</p>}
            {notice && <p role="status" className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-emerald-300/15 bg-[#14221b] px-4 py-2.5 text-sm text-emerald-200 shadow-xl">{notice}</p>}

            <section aria-label="Profile posts" className="mt-7">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">Your activity</h2>
                        <p className="mt-1 text-sm text-zinc-500">Your posts and saved activity will live here.</p>
                    </div>
                    <label className="shrink-0 text-xs text-zinc-500">
                        <span className="sr-only">Sort activity</span>
                        <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)} className="rounded-lg border border-white/10 bg-[#141417] px-2.5 py-2 text-xs text-zinc-300 outline-none focus:border-amber-400">
                            <option>Newest first</option>
                            <option>Oldest first</option>
                        </select>
                    </label>
                </div>

                <ProfileSections sections={sections} profileId={initialProfile.id} posts={initialPosts} authors={authors} attachments={initialAttachments} sortOrder={sortOrder} />
            </section>
        </div>
    )
}
