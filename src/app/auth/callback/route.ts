import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const callbackUrl = new URL(request.url)
    const code = callbackUrl.searchParams.get('code')
    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const next = callbackUrl.searchParams.get('next')
            const destination = next === '/auth/reset-password' ? next : '/'
            return NextResponse.redirect(new URL(destination, callbackUrl))
        }
    }

    return NextResponse.redirect(new URL('/auth/login?error=auth_failed', callbackUrl))
}
