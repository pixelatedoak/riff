import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const callbackUrl = new URL(request.url)
    const code = callbackUrl.searchParams.get('code')
    const tokenHash = callbackUrl.searchParams.get('token_hash')
    const otpType = callbackUrl.searchParams.get('type')
    const next = callbackUrl.searchParams.get('next')
    const destination = next === '/auth/reset-password' ? next : '/'
    const isRecovery = destination === '/auth/reset-password' || otpType === 'recovery'

    if (code || (tokenHash && otpType === 'recovery')) {
        const supabase = await createClient()
        const { error } = code
            ? await supabase.auth.exchangeCodeForSession(code)
            : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: 'recovery' })
        if (!error) {
            return NextResponse.redirect(new URL(destination, callbackUrl))
        }
    }

    if (isRecovery) {
        return NextResponse.redirect(new URL('/auth/reset-password?error=link_failed', callbackUrl))
    }

    return NextResponse.redirect(new URL('/auth/login?error=auth_failed', callbackUrl))
}
