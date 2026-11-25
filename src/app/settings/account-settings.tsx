'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth-errors'
import { SignOutButton } from '@/app/signout-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const fieldClassName = 'mt-2 w-full rounded-control border border-riff-outline bg-riff-surface-low px-3.5 py-3 text-sm text-riff-text outline-none focus:border-riff-accent/50 focus:ring-2 focus:ring-riff-accent/10'

export function AccountSettings({ email }: { email: string }) {
    const [nextEmail, setNextEmail] = useState(email)
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [busy, setBusy] = useState<'email' | 'password' | null>(null)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const supabase = createClient()

    async function updateEmail(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (nextEmail.trim().toLowerCase() === email.toLowerCase()) return
        setBusy('email')
        setError('')
        setMessage('')
        try {
            const { error: updateError } = await supabase.auth.updateUser({ email: nextEmail.trim() })
            if (updateError) setError(authErrorMessage(updateError, 'reset'))
            else setMessage('Check your email for a confirmation link to finish the change.')
        } catch {
            setError('Could not reach the account service. Try again when you are online.')
        } finally {
            setBusy(null)
        }
    }

    async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (password.length < 8) { setError('Use at least 8 characters for your password.'); return }
        if (password !== passwordConfirm) { setError('Those passwords do not match.'); return }
        setBusy('password')
        setError('')
        setMessage('')
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password })
            if (updateError) setError(authErrorMessage(updateError, 'reset'))
            else {
                setMessage('Your password has been changed.')
                setPassword('')
                setPasswordConfirm('')
            }
        } catch {
            setError('Could not reach the account service. Try again when you are online.')
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="space-y-4">
            {error && <p role="alert" className="rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-4 py-3 text-sm text-rose-200">{error}</p>}
            {message && <p role="status" className="rounded-xl border border-emerald-200/15 bg-emerald-200/[0.04] px-4 py-3 text-sm text-emerald-100">{message}</p>}

            <section className="rounded-card border border-riff-outline bg-riff-surface p-5 sm:p-6">
                <h2 className="text-base font-semibold text-riff-text">Email address</h2>
                <p className="mt-1 text-sm text-riff-muted">Used to sign in and recover your account.</p>
                <form onSubmit={updateEmail} className="mt-4">
                    <label htmlFor="account-email" className="block text-sm text-riff-muted">Email<Input id="account-email" type="email" autoComplete="email" required value={nextEmail} onChange={(event) => setNextEmail(event.target.value)} className={fieldClassName} /></label>
                    <Button variant="secondary" disabled={busy !== null || nextEmail.trim().toLowerCase() === email.toLowerCase()} className="mt-4">{busy === 'email' ? 'Sending…' : 'Update email'}</Button>
                </form>
            </section>

            <section className="rounded-card border border-riff-outline bg-riff-surface p-5 sm:p-6">
                <h2 className="text-base font-semibold text-riff-text">Password</h2>
                <p className="mt-1 text-sm text-riff-muted">Choose a new password with at least 8 characters.</p>
                <form onSubmit={updatePassword} className="mt-4 space-y-3">
                    <label htmlFor="settings-password" className="block text-sm text-riff-muted">New password<Input id="settings-password" type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClassName} /></label>
                    <label htmlFor="settings-password-confirm" className="block text-sm text-riff-muted">Confirm password<Input id="settings-password-confirm" type="password" minLength={8} autoComplete="new-password" required value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} className={fieldClassName} /></label>
                    <Button disabled={busy !== null}>{busy === 'password' ? 'Saving…' : 'Change password'}</Button>
                </form>
                <p className="mt-4 text-xs text-zinc-500">Forgot your current password? <Link href="/auth/forgot-password" className="text-riff-accent-soft hover:text-riff-accent-hover">Send a reset link</Link></p>
            </section>

            <section className="flex items-center justify-between gap-4 rounded-card border border-riff-outline bg-riff-surface p-5 sm:p-6">
                <div><h2 className="text-base font-semibold text-zinc-100">Sign out</h2><p className="mt-1 text-sm text-zinc-500">Sign out of this device.</p></div>
                <SignOutButton />
            </section>
        </div>
    )
}
