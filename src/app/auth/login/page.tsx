'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/app/auth/auth-shell'
import { createClient } from '@/lib/supabase/client'

function subscribeToAuthUrl(callback: () => void) {
    window.addEventListener('hashchange', callback)
    window.addEventListener('popstate', callback)
    return () => {
        window.removeEventListener('hashchange', callback)
        window.removeEventListener('popstate', callback)
    }
}

function getAuthUrlError() {
    const url = new URL(window.location.href)
    const params = new URLSearchParams(url.hash.slice(1))

    if (params.get('error_code') === 'otp_expired') {
        return 'This confirmation link has expired or was already used. Sign up again to get a fresh link.'
    }

    const description = params.get('error_description')
    if (description) return description
    if (url.searchParams.get('error') === 'auth_failed') {
        return 'We could not verify that link. Request a new confirmation email and try again.'
    }

    return ''
}

const inputClassName = 'w-full rounded-lg border border-white/10 bg-[#0c0c0f] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-riff-accent focus:ring-2 focus:ring-riff-accent/20'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()
    const authUrlError = useSyncExternalStore(subscribeToAuthUrl, getAuthUrlError, () => '')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')

        const formData = new FormData(e.currentTarget)
        const submittedEmail = String(formData.get('email') ?? '').trim()
        const submittedPassword = String(formData.get('password') ?? '')
        if (!submittedEmail) {
            setError('Enter your email address.')
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: submittedEmail,
                password: submittedPassword,
            })

            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }

            router.replace('/')
            router.refresh()
        } catch {
            setError('Could not reach the sign-in service. Check your connection and try again.')
            setLoading(false)
        }
    }

    return (
        <AuthShell
            title="Welcome back"
            description="Sign in to continue."
            footer={
                <p className="text-center text-sm text-zinc-400">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="font-medium text-riff-accent hover:text-riff-accent-hover">Sign up</Link>
                </p>
            }
        >
            {(error || authUrlError) && (
                <div role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm leading-5 text-red-300">
                    {error || authUrlError}
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
                        autoComplete="current-password"
                        placeholder="Your password"
                        className={inputClassName}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-riff-accent px-4 py-2.5 text-sm font-semibold text-riff-accent-ink transition hover:bg-riff-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-riff-accent disabled:cursor-wait disabled:opacity-60"
                >
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>
                <div className="text-right"><Link href="/auth/forgot-password" className="text-xs text-zinc-500 hover:text-riff-accent-hover">Forgot password?</Link></div>
            </form>
        </AuthShell>
    )
}
