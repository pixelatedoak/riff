'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function FollowProfileButton({ profileId, initialCount }: { profileId: string; initialCount: number }) {
    const supabase = useMemo(() => createClient(), [])
    const [userId, setUserId] = useState<string | null>(null)
    const [following, setFollowing] = useState(false)
    const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking')
    const [count, setCount] = useState(initialCount)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        let current = true
        void (async () => {
            try {
                const { data, error: authError } = await supabase.auth.getUser()
                if (authError) throw authError
                const id = data.user?.id ?? null
                if (!current) return
                setUserId(id)
                if (id && id !== profileId) {
                    const { data: row, error } = await supabase.from('riff_follows').select('followed_id').eq('follower_id', id).eq('followed_id', profileId).maybeSingle()
                    if (error) throw error
                    if (current) setFollowing(Boolean(row))
                }
                if (current) setStatus('ready')
            } catch {
                if (current) {
                    setError('Could not verify follow status. Refresh the page and try again.')
                    setStatus('error')
                }
            }
        })()
        return () => { current = false }
    }, [profileId, supabase])

    async function toggle() {
        if (!userId || userId === profileId) return
        setBusy(true)
        setError('')
        try {
            const result = following
                ? await supabase.from('riff_follows').delete().eq('follower_id', userId).eq('followed_id', profileId)
                : await supabase.from('riff_follows').insert({ follower_id: userId, followed_id: profileId })
            if (result.error?.code === '23505' && !following) setFollowing(true)
            else if (result.error) setError(result.error.message)
            else {
                setFollowing(!following)
                setCount((value) => Math.max(0, value + (following ? -1 : 1)))
                if (!following) window.dispatchEvent(new Event('riff:notifications-updated'))
            }
        } catch {
            setError('Could not update the follow. Check your connection and try again.')
        } finally {
            setBusy(false)
        }
    }

    return <div className="flex flex-col items-end">
        {userId === profileId ? <span className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-500">Your profile</span> : status === 'checking' ? <span role="status" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-500">Checking…</span> : status === 'error' ? <span role="status" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-500">Follow status unavailable</span> : userId ? <button type="button" disabled={busy} aria-pressed={following} onClick={() => void toggle()} className="rounded-full border border-riff-accent/20 bg-riff-accent/[0.07] px-4 py-2 text-sm font-medium text-riff-accent-soft hover:bg-riff-accent/[0.12] disabled:opacity-50">{busy ? 'Saving…' : following ? 'Following' : 'Follow'}</button> : <Link href="/auth/login" className="rounded-full border border-riff-accent/20 px-4 py-2 text-sm text-riff-accent-soft hover:bg-riff-accent/[0.07]">Sign in to follow</Link>}
        <span className="mt-1.5 text-xs text-zinc-500">{count} {count === 1 ? 'follower' : 'followers'}</span>
        {error && <span role="alert" className="mt-1 max-w-48 text-right text-xs text-rose-200">{error}</span>}
    </div>
}
