'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/app/auth/auth-shell'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth-errors'

const inputClassName = 'w-full rounded-lg border border-white/10 bg-[#0c0c0f] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-riff-accent focus:ring-2 focus:ring-riff-accent/20'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
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
        const normalizedUsername = String(formData.get('username') ?? '').trim().replace(/^@/, '').toLowerCase()
        const submittedPassword = String(formData.get('password') ?? '')
        if (!normalizedEmail) {
            setError('Enter a valid email address.')
            return
        }
        if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
            setError('Choose a username with 3–24 letters, numbers, or underscores.')
            return
        }

        setEmail(normalizedEmail)
        setUsername(normalizedUsername)
        setLoading(true)

        try {
            const { data: existingUsername, error: lookupError } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', normalizedUsername)
                .maybeSingle()
            if (lookupError) {
                setError('Could not check that username. Please try again.')
                return
            }
            if (existingUsername) {
                setError('That username is already taken. Try another one.')
                return
            }

            const { error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password: submittedPassword,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                    data: { username: normalizedUsername },
                },
            })

            if (error) {
                setError(authErrorMessage(error, 'signup'))
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

            setResendMessage(error ? authErrorMessage(error, 'resend') : 'A new confirmation link has been sent.')
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
                        <Link href="/auth/login" className="font-medium text-riff-accent hover:text-riff-accent-hover">Sign in</Link>
                    </p>
                }
            >
                <div className="text-center">
                    <p className="text-sm leading-6 text-zinc-400">The link is single-use. If it expires, request another one.</p>
                    <button
                        type="button"
                        onClick={resendConfirmation}
                        disabled={resending}
                        className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-riff-accent transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-riff-accent disabled:cursor-wait disabled:opacity-60"
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
            description="Choose your username, then sign up with email."
            footer={
                <p className="text-center text-sm text-zinc-400">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="font-medium text-riff-accent hover:text-riff-accent-hover">Sign in</Link>
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
                    <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-zinc-300">Username</label>
                    <div className="flex items-center rounded-lg border border-riff-outline bg-riff-surface-low focus-within:border-riff-accent focus-within:ring-2 focus-within:ring-riff-accent/20">
                        <span aria-hidden="true" className="pl-3.5 text-sm text-zinc-500">@</span>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_@]/g, '').replace(/^@/, '').toLowerCase())}
                            required
                            minLength={3}
                            maxLength={24}
                            autoComplete="username"
                            autoCapitalize="none"
                            placeholder="yourname"
                            className="w-full rounded-r-lg bg-transparent px-2.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                        />
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-500">3–24 letters, numbers, or underscores. This is your public handle.</p>
                </div>

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
                    className="w-full rounded-lg bg-riff-accent px-4 py-2.5 text-sm font-semibold text-riff-accent-ink transition hover:bg-riff-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-riff-accent disabled:cursor-wait disabled:opacity-60"
                >
                    {loading ? 'Creating account…' : 'Create account'}
                </button>
            </form>
        </AuthShell>
    )
}
