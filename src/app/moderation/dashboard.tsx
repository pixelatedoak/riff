'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/icon'
import { ReportInbox } from '@/app/moderation/report-inbox'
import type { ReportItem } from '@/app/moderation/page'

export type ModeratorUser = {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
}

const PAGE_SIZE = 40

function UserDirectory({ initialUsers, initialCount, initialError }: { initialUsers: ModeratorUser[]; initialCount: number; initialError: string | null }) {
    const supabase = useMemo(() => createClient(), [])
    const [users, setUsers] = useState(initialUsers)
    const [count, setCount] = useState(initialCount)
    const [search, setSearch] = useState('')
    const [appliedSearch, setAppliedSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(initialError ?? '')

    async function fetchUsers(term: string, offset: number, append: boolean) {
        setLoading(true)
        setError('')
        let query = supabase.from('profiles').select('id, username, full_name, avatar_url', { count: 'exact' })
        if (term) query = query.or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        const { data, count: total, error: queryError } = await query.order('username', { ascending: true, nullsFirst: false }).range(offset, offset + PAGE_SIZE - 1)
        if (queryError) setError('Could not load users. Check the profile table permissions and try again.')
        else {
            setUsers((current) => append ? [...current, ...((data ?? []) as ModeratorUser[])] : (data ?? []) as ModeratorUser[])
            setCount(total ?? 0)
            setAppliedSearch(term)
        }
        setLoading(false)
    }

    function submitSearch(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const term = search.trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 50)
        setSearch(term)
        void fetchUsers(term, 0, false)
    }

    return <section aria-label="User directory" className="mt-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-riff-text">User directory</h2><p className="mt-1 text-sm text-riff-muted">{count} {count === 1 ? 'account' : 'accounts'}</p></div>
            <form onSubmit={submitSearch} className="flex w-full gap-2 sm:w-auto">
                <label className="sr-only" htmlFor="moderator-user-search">Search users</label>
                <input id="moderator-user-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={50} placeholder="Search name or username" className="h-10 min-w-0 flex-1 rounded-xl border border-riff-outline bg-riff-surface px-3 text-sm text-riff-text outline-none placeholder:text-riff-faint focus:border-riff-accent sm:w-64" />
                <button type="submit" disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-riff-outline bg-riff-surface-2 px-3 text-sm font-medium text-riff-text hover:bg-riff-surface-3 disabled:opacity-50"><Icon name="search" size={15} />Search</button>
            </form>
        </div>
        {error && <p role="alert" className="mb-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] p-3 text-sm text-rose-100">{error}</p>}
        <div className="overflow-hidden rounded-2xl border border-riff-outline bg-riff-surface">
            {users.map((person) => {
                const name = person.full_name || (person.username ? `@${person.username}` : 'Riff user')
                const row = <div className="flex min-w-0 items-center gap-3 px-4 py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-riff-surface-3 text-sm font-semibold text-riff-accent">{person.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={person.avatar_url} alt="" className="size-full object-cover" />
                    ) : name.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-riff-text">{name}</span><span className="block truncate text-xs text-riff-muted">{person.username ? `@${person.username}` : `ID ${person.id}`}</span></span>
                    <span className="shrink-0 text-xs text-riff-faint">Member</span>
                </div>
                return <div key={person.id} className="border-b border-riff-outline last:border-b-0">{person.username ? <Link href={`/u/${encodeURIComponent(person.username)}`} className="block transition hover:bg-riff-surface-2">{row}</Link> : row}</div>
            })}
            {!users.length && !loading && <p className="px-4 py-10 text-center text-sm text-riff-muted">{appliedSearch ? 'No accounts matched that search.' : 'No user profiles yet.'}</p>}
            {loading && <p role="status" className="px-4 py-4 text-center text-sm text-riff-muted">Loading users…</p>}
        </div>
        {users.length < count && <button type="button" disabled={loading} onClick={() => void fetchUsers(appliedSearch, users.length, true)} className="mt-3 w-full rounded-xl border border-riff-outline px-4 py-2.5 text-sm font-medium text-riff-muted transition hover:bg-riff-surface hover:text-riff-text disabled:opacity-50">Load more users</button>}
    </section>
}

export function ModerationDashboard({ reports, users, userCount, reportError, userError }: {
    reports: ReportItem[]
    users: ModeratorUser[]
    userCount: number
    reportError: string | null
    userError: string | null
}) {
    const [section, setSection] = useState<'reports' | 'users'>('reports')
    return <>
        <div role="tablist" aria-label="Moderation sections" className="mt-6 inline-flex rounded-xl border border-riff-outline bg-riff-surface-low p-1">
            <button type="button" role="tab" aria-selected={section === 'reports'} onClick={() => setSection('reports')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${section === 'reports' ? 'bg-riff-surface-3 text-riff-text' : 'text-riff-muted hover:text-riff-text'}`}>Reports</button>
            <button type="button" role="tab" aria-selected={section === 'users'} onClick={() => setSection('users')} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${section === 'users' ? 'bg-riff-surface-3 text-riff-text' : 'text-riff-muted hover:text-riff-text'}`}>Users <span className="ml-1 text-xs text-riff-faint">{userCount}</span></button>
        </div>
        {section === 'reports'
            ? reportError ? <p role="alert" className="mt-5 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] p-4 text-sm text-rose-100">Could not load reports: {reportError}</p> : <ReportInbox initialReports={reports} />
            : <UserDirectory initialUsers={users} initialCount={userCount} initialError={userError} />}
    </>
}
