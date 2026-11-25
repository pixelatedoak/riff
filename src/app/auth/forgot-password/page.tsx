'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/app/auth/auth-shell'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth-errors'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const supabase = createClient()

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setBusy(true)
        setMessage('')
        setError('')
        try {
            const redirectTo = new URL('/auth/callback?next=%2Fauth%2Freset-password', window.location.origin).toString()
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
            if (resetError) setError(authErrorMessage(resetError, 'reset'))
            else setMessage('If that address has an account, a password reset link is on its way.')
        } catch {
            setError('Could not reach the email service. Check your connection and try again.')
        } finally {
            setBusy(false)
        }
    }

    return <AuthShell title="Reset your password" description="We’ll email you a secure reset link." footer={<p className="text-center text-sm text-zinc-400"><Link href="/auth/login" className="font-medium text-amber-300 hover:text-amber-200">Back to sign in</Link></p>}>
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] px-3.5 py-2.5 text-sm text-emerald-200">{message}</p>}
        <form onSubmit={submit} className="space-y-4">
            <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-300">Email<input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0c0c0f] px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-400" /></label>
            <button disabled={busy} className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-60">{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
    </AuthShell>
}
