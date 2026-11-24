'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    async function signOut() {
        setLoading(true)
        setError('')

        try {
            const { error } = await supabase.auth.signOut()
            if (error) {
                setError('Could not sign out. Please try again.')
                setLoading(false)
                return
            }

            router.replace('/auth/login')
            router.refresh()
        } catch {
            setError('Could not reach the sign-out service. Check your connection and try again.')
            setLoading(false)
        }
    }

    return (
        <div className="relative flex justify-center">
            <button
                type="button"
                onClick={signOut}
                disabled={loading}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-50"
            >
                {loading ? 'Signing out…' : 'Sign out'}
            </button>
            {error && <p role="alert" className="absolute bottom-full right-0 mb-2 w-52 rounded-lg border border-red-400/20 bg-[#19191e] p-2 text-xs text-red-300 shadow-lg">{error}</p>}
        </div>
    )
}
