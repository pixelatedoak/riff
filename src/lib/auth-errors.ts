type AuthErrorLike = { message?: string; code?: string } | null | undefined

export function authErrorMessage(error: AuthErrorLike, action: 'signup' | 'resend' | 'reset') {
    const message = error?.message ?? 'Something went wrong. Please try again.'
    const code = error?.code ?? ''

    if (code === 'over_email_send_rate_limit' || /email rate limit|email.*rate.*limit/i.test(message)) {
        return 'Supabase has temporarily limited email sending. Wait a little before retrying. For regular signups, connect a custom email provider in Supabase Auth.'
    }

    if (action === 'signup' && /database error saving new user/i.test(message)) {
        return 'That username may already be taken. Try another username.'
    }

    if (action === 'reset' && /rate limit/i.test(message)) {
        return 'A reset email was requested recently. Wait a little, then try again.'
    }

    return message
}
