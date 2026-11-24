import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: '/',
        name: 'Riff — thoughts branch here',
        short_name: 'Riff',
        description: 'A social space for ideas worth building on.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        background_color: '#0b0b10',
        theme_color: '#0b0b10',
        categories: ['social', 'lifestyle'],
        icons: [
            { src: '/icons/riff-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/riff-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/riff-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
            { name: 'Start a Riff', short_name: 'New Riff', url: '/create', icons: [{ src: '/icons/riff-192.png', sizes: '192x192', type: 'image/png' }] },
            { name: 'My profile', short_name: 'Profile', url: '/profile', icons: [{ src: '/icons/riff-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
    }
}
