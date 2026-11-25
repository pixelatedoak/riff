'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icon'
import { getOrCreateConversation } from '@/lib/messages/client'

export function MessageProfileButton({ currentUserId, profileId }: { currentUserId: string | null; profileId: string }) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    if (currentUserId === profileId) return null

    async function openConversation() {
        if (!currentUserId) {
            router.push('/auth/login')
            return
        }
        setBusy(true)
        setError('')
        try {
            const id = await getOrCreateConversation(currentUserId, profileId)
            router.push(`/messages/${id}`)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Could not open messages.')
        } finally {
            setBusy(false)
        }
    }

    return <div className="flex flex-col items-start gap-1">
        <button type="button" disabled={busy} onClick={() => void openConversation()} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-riff-outline bg-riff-surface px-4 text-sm font-medium text-riff-text transition hover:bg-riff-surface-2 disabled:opacity-50">
            <Icon name="message" size={15} />{busy ? 'Opening…' : 'Message'}
        </button>
        {error && <p role="alert" className="max-w-56 text-xs text-rose-300">{error}</p>}
    </div>
}
