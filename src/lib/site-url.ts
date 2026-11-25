export function getSiteUrl() {
    const configured = process.env.SITE_URL || process.env.VERCEL_URL
    if (!configured) return new URL('http://localhost:3000')
    return new URL(configured.startsWith('http') ? configured : `https://${configured}`)
}
