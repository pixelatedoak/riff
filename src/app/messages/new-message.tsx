'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateConversation } from '@/lib/messages/client'

type UserResult = { id: string; username: string | null; full_name: string | null; avatar_url: string | null }

export function NewMessage({ userId }: { userId: string }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<UserResult[]>([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    async function search(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const username = query.trim().replace(/^@/, '').toLowerCase()
        if (!/^[a-z0-9_]{2,24}$/.test(username)) {
            setResults([])
            setError('Enter at least 2 letters, numbers, or underscores from a username.')
            return
        }
        setBusy(true)
        setError('')
        const { data, error: searchError } = await createClient().from('profiles')
            .select('id, username, full_name, avatar_url')
            .ilike('username', `${username}%`)
            .neq('id', userId)
            .limit(8)
        setBusy(false)
        if (searchError) {
            setError('Could not search users right now.')
            return
        }
        setResults((data ?? []) as UserResult[])
        if (!data?.length) setError('No matching users found.')
    }

    async function choose(user: UserResult) {
        setBusy(true)
        setError('')
        try {
            const id = await getOrCreateConversation(userId, user.id)
            router.push(`/messages/${id}`)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Could not start this conversation.')
            setBusy(false)
        }
    }

    return <div className="shrink-0">
        <button type="button" aria-expanded={open} onClick={() => { setOpen((value) => !value); setError(''); setResults([]) }} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-riff-accent px-4 text-sm font-semibold text-riff-accent-ink transition hover:bg-riff-accent-hover">
            <Icon name="plus" size={15} />New message
        </button>
        {open && <div className="absolute left-0 right-0 top-14 z-30 mx-auto max-w-md rounded-2xl border border-riff-outline bg-riff-surface p-4 shadow-2xl sm:left-auto sm:right-0 sm:w-[26rem]">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Start a conversation</h2><button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text"><Icon name="close" size={16} /></button></div>
            <form onSubmit={(event) => void search(event)} className="flex gap-2">
                <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find someone by username" className="min-w-0 flex-1 rounded-xl border border-riff-outline bg-riff-bg px-3 py-2.5 text-sm outline-none focus:border-riff-accent" />
                <button type="submit" disabled={busy} aria-label="Search users" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-riff-outline text-riff-text hover:bg-riff-surface-2 disabled:opacity-50"><Icon name="search" size={16} /></button>
            </form>
            {error && <p role="status" className="mt-3 text-xs text-riff-muted">{error}</p>}
            {results.length > 0 && <ul className="mt-3 divide-y divide-riff-outline">
                {results.map((user) => <li key={user.id}><button type="button" disabled={busy} onClick={() => void choose(user)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-riff-surface-2 disabled:opacity-50">
                    {user.avatar_url ? <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={user.avatar_url} alt="" className="size-9 rounded-full object-cover" />
                    </> : <span className="flex size-9 items-center justify-center rounded-full bg-riff-surface-3 text-sm text-riff-accent">{(user.full_name || user.username || '?').slice(0, 1).toUpperCase()}</span>}
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{user.full_name || `@${user.username}`}</span><span className="block truncate text-xs text-riff-muted">@{user.username}</span></span>
                    <Icon name="chevron-right" size={15} className="ml-auto text-riff-muted" />
                </button></li>)}
            </ul>}
        </div>}
    </div>
}
