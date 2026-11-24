import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig } from '@/lib/supabase/env';

export async function proxy(request: NextRequest) {
    const response = NextResponse.next({ request })
    const { url, publishableKey } = getSupabaseConfig()
    const supabase = createServerClient(
        url,
        publishableKey,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )
    await supabase.auth.getUser()
    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
