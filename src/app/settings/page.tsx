import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BottomNavigation } from '@/app/bottom-navigation'
import { AccountSettings } from '@/app/settings/account-settings'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Account settings' }

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    return (
        <main className="min-h-dvh bg-riff-bg pb-24 text-riff-text">
            <div className="mx-auto max-w-3xl px-4 pt-7 sm:px-6 sm:pt-12 lg:max-w-4xl lg:px-10 lg:pt-14">
                <Link href="/profile" className="text-sm text-riff-muted hover:text-riff-text">← Back to profile</Link>
                <div className="mb-6 mt-6">
                    <p className="riff-overline">Your account</p>
                    <h1 className="riff-page-heading mt-1">Settings</h1>
                    <p className="mt-2 text-sm text-riff-muted">Manage your sign-in details and account security.</p>
                </div>
                <AccountSettings email={user.email ?? ''} />
            </div>
            <BottomNavigation active="none" />
        </main>
    )
}
