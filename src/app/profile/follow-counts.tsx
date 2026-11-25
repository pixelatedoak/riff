'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/icon'

type FollowTab = 'followers' | 'following'
type FollowProfile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }
const PAGE_SIZE = 40

export function FollowCounts({ profileId, username, followers, following }: {
    profileId: string
    username: string
    followers: number
    following: number
}) {
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<FollowTab>('followers')
    const [profiles, setProfiles] = useState<FollowProfile[]>([])
    const [loadedTab, setLoadedTab] = useState<FollowTab | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function load(tab: FollowTab, append = false) {
        if (loading) return
        setLoading(true)
        setError('')
        const offset = append && tab === loadedTab ? profiles.length : 0
        const supabase = createClient()
        const query = tab === 'followers'
            ? supabase.from('riff_follows').select('follower_id, followed_id, created_at').eq('followed_id', profileId)
            : supabase.from('riff_follows').select('follower_id, followed_id, created_at').eq('follower_id', profileId)
        const { data: rows, error: rowsError } = await query.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1)
        if (rowsError) {
            setError('Could not load this list. Try again.')
            setLoading(false)
            return
        }
        const ids = (rows ?? []).map((row) => tab === 'followers' ? row.follower_id : row.followed_id)
        const { data: people, error: peopleError } = ids.length
            ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids)
            : { data: [], error: null }
        if (peopleError) {
            setError('Could not load these profiles. Try again.')
            setLoading(false)
            return
        }
        const peopleById = new Map(((people ?? []) as FollowProfile[]).map((person) => [person.id, person]))
        const page = ids.flatMap((id) => {
            const person = peopleById.get(id)
            return person ? [person] : []
        })
        setProfiles((current) => append && tab === loadedTab ? [...current, ...page] : page)
        setLoadedTab(tab)
        setHasMore((rows ?? []).length === PAGE_SIZE)
        setLoading(false)
    }

    function openList(tab: FollowTab) {
        setActiveTab(tab)
        setOpen(true)
        if (loadedTab !== tab) void load(tab)
    }

    function changeTab(tab: FollowTab) {
        setActiveTab(tab)
        if (loadedTab !== tab) void load(tab)
    }

    return <>
        <div className="mt-4 flex items-center gap-5 text-sm">
            <button type="button" onClick={() => openList('followers')} className="text-riff-muted transition hover:text-riff-text"><strong className="font-semibold text-riff-text">{followers}</strong> followers</button>
            <button type="button" onClick={() => openList('following')} className="text-riff-muted transition hover:text-riff-text"><strong className="font-semibold text-riff-text">{following}</strong> following</button>
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-x-3 top-1/2 z-50 mx-auto max-h-[min(78dvh,38rem)] w-auto max-w-md -translate-y-1/2 overflow-hidden rounded-2xl border border-riff-outline bg-riff-surface shadow-2xl focus:outline-none sm:inset-x-0">
                    <div className="flex items-center justify-between border-b border-riff-outline px-4 py-3.5">
                        <div><Dialog.Title className="font-semibold text-riff-text">{username ? `@${username}` : 'Profile'} connections</Dialog.Title><Dialog.Description className="sr-only">Browse this profile’s followers and following.</Dialog.Description></div>
                        <Dialog.Close aria-label="Close list" className="flex size-9 items-center justify-center rounded-full text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="close" size={18} /></Dialog.Close>
                    </div>
                    <div role="tablist" aria-label="Connections" className="grid grid-cols-2 border-b border-riff-outline px-4">
                        {(['followers', 'following'] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => changeTab(tab)} className={`border-b-2 py-3 text-sm font-medium capitalize ${activeTab === tab ? 'border-riff-accent text-riff-accent-soft' : 'border-transparent text-riff-muted hover:text-riff-text'}`}>{tab} · {tab === 'followers' ? followers : following}</button>)}
                    </div>
                    <div className="max-h-[calc(min(78dvh,38rem)-8rem)] overflow-y-auto p-2">
                        {profiles.map((person) => {
                            const displayName = person.full_name || (person.username ? `@${person.username}` : 'Riff user')
                            const row = <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-riff-surface-2">
                                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-riff-surface-3 text-sm font-semibold text-riff-accent">{person.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={person.avatar_url} alt="" className="size-full object-cover" />
                                ) : displayName.slice(0, 1).toUpperCase()}</span>
                                <span className="min-w-0"><span className="block truncate text-sm font-medium text-riff-text">{displayName}</span><span className="block truncate text-xs text-riff-muted">{person.username ? `@${person.username}` : 'Riff member'}</span></span>
                            </div>
                            return <div key={person.id}>{person.username ? <Link href={`/u/${encodeURIComponent(person.username)}`} onClick={() => setOpen(false)}>{row}</Link> : row}</div>
                        })}
                        {loading && <p role="status" className="px-3 py-5 text-center text-sm text-riff-muted">Loading…</p>}
                        {error && <p role="alert" className="px-3 py-5 text-center text-sm text-rose-200">{error}</p>}
                        {!loading && !error && profiles.length === 0 && <p className="px-3 py-10 text-center text-sm text-riff-muted">No {activeTab} yet.</p>}
                        {!loading && !error && hasMore && <button type="button" onClick={() => void load(activeTab, true)} className="my-2 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-riff-accent hover:bg-riff-surface-2">Load more</button>}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    </>
}
