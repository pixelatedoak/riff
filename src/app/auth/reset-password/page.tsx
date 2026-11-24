'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/app/auth/auth-shell'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [ready, setReady] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        let current = true
        void supabase.auth.getSession().then(({ data }) => {
            if (!current) return
            setReady(Boolean(data.session))
            if (!data.session) setError('This reset link is invalid or expired. Request a new one.')
        })
        return () => { current = false }
    }, [supabase])

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setBusy(true)
        setError('')
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) {
            setError(updateError.message)
            setBusy(false)
            return
        }
        setMessage('Password updated. Taking you back to Riff…')
        window.setTimeout(() => { router.replace('/'); router.refresh() }, 800)
    }

    return <AuthShell title="Choose a new password" description="Use at least eight characters." footer={<p className="text-center text-sm text-zinc-400"><Link href="/auth/login" className="font-medium text-violet-300 hover:text-violet-200">Back to sign in</Link></p>}>
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="mb-4 text-sm text-emerald-200">{message}</p>}
        {ready && <form onSubmit={submit} className="space-y-4">
            <label htmlFor="new-password" className="block text-sm font-medium text-zinc-300">New password<input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0c0c0f] px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-violet-400" /></label>
            <button disabled={busy} className="w-full rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-60">{busy ? 'Updating…' : 'Update password'}</button>
        </form>}
    </AuthShell>
}
