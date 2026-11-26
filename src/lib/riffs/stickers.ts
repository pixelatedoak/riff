export type StickerDesign = {
    id: string
    label: string
    text: string
    background: string
    foreground: string
}

// Original Riff sticker pack: drawn in the app and free to use in chats and posts.
export const FUNNY_STICKERS: StickerDesign[] = [
    { id: 'pack-bruh', label: 'Bruh', text: 'BRUH.', background: '#d8c49b', foreground: '#28251e' },
    { id: 'pack-cook', label: 'Let him cook', text: 'LET HIM COOK', background: '#a9c7b1', foreground: '#19251d' },
    { id: 'pack-plot', label: 'Plot twist', text: 'PLOT TWIST', background: '#d3a0aa', foreground: '#311e22' },
    { id: 'pack-minute', label: 'Need a minute', text: 'I NEED A MINUTE', background: '#aabfda', foreground: '#1c2636' },
    { id: 'pack-notes', label: 'No notes', text: 'NO NOTES', background: '#e2c46e', foreground: '#2a2518' },
    { id: 'pack-sus', label: 'A little sus', text: 'A LITTLE SUS', background: '#c2a9d5', foreground: '#281e31' },
]

export const STICKER_PALETTES = [
    { label: 'Paper', background: '#e6d9b8', foreground: '#28251e' },
    { label: 'Mint', background: '#b7d2bd', foreground: '#1c2a20' },
    { label: 'Rose', background: '#e2b7be', foreground: '#321d22' },
    { label: 'Blue', background: '#b6c9e3', foreground: '#1c2636' },
    { label: 'Lilac', background: '#d0b8df', foreground: '#281e31' },
    { label: 'Lemon', background: '#ead98b', foreground: '#302a17' },
] as const
