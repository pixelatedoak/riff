'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/app/auth/auth-shell'
import { createClient } from '@/lib/supabase/client'

const inputClassName = 'w-full rounded-lg border border-white/10 bg-[#0c0c0f] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [resending, setResending] = useState(false)
    const [resendMessage, setResendMessage] = useState('')
    const supabase = createClient()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')

        const formData = new FormData(e.currentTarget)
        const normalizedEmail = String(formData.get('email') ?? '').trim()
        const submittedPassword = String(formData.get('password') ?? '')
        if (!normalizedEmail) {
            setError('Enter a valid email address.')
            return
        }

        setEmail(normalizedEmail)
        setLoading(true)

        try {
            const { error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password: submittedPassword,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) {
                setError(error.message)
                return
            }

            setSuccess(true)
        } catch {
            setError('Could not reach the signup service. Check your connection and try again.')
        } finally {
            setLoading(false)
        }
    }

    async function resendConfirmation() {
        setResending(true)
        setResendMessage('')

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            setResendMessage(error ? error.message : 'A new confirmation link has been sent.')
        } catch {
            setResendMessage('Could not reach the signup service. Check your connection and try again.')
        } finally {
            setResending(false)
        }
    }

    if (success) {
        return (
            <AuthShell
                title="Check your email"
                description={<>We sent a confirmation link to <strong className="font-medium text-zinc-200">{email}</strong>.</>}
                footer={
                    <p className="text-center text-sm text-zinc-400">
                        Already confirmed?{' '}
                        <Link href="/auth/login" className="font-medium text-violet-300 hover:text-violet-200">Sign in</Link>
                    </p>
                }
            >
                <div className="text-center">
                    <p className="text-sm leading-6 text-zinc-400">The link is single-use. If it expires, request another one.</p>
                    <button
                        type="button"
                        onClick={resendConfirmation}
                        disabled={resending}
                        className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-violet-300 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-wait disabled:opacity-60"
                    >
                        {resending ? 'Sending…' : 'Resend confirmation email'}
                    </button>
                    {resendMessage && <p role="status" className="mt-3 text-sm text-zinc-400">{resendMessage}</p>}
                </div>
            </AuthShell>
        )
    }

    return (
        <AuthShell
            title="Sign up"
            description="Create an account with your email."
            footer={
                <p className="text-center text-sm text-zinc-400">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="font-medium text-violet-300 hover:text-violet-200">Sign in</Link>
                </p>
            }
        >
            {error && (
                <div role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm leading-5 text-red-300">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        className={inputClassName}
                    />
                    <p className="mt-1.5 text-xs text-zinc-500">At least 8 characters.</p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-wait disabled:opacity-60"
                >
                    {loading ? 'Creating account…' : 'Create account'}
                </button>
            </form>
        </AuthShell>
    )
}
