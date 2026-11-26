import type { StickerDesign } from '@/lib/riffs/stickers'

function safeColor(value: string, fallback: string) {
    return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

export function CustomStickerArtwork({ sticker, className = '' }: { sticker: StickerDesign; className?: string }) {
    const fontSize = sticker.text.length > 12 ? 14 : sticker.text.length > 8 ? 17 : 21
    const background = safeColor(sticker.background, '#d8c49b')
    const foreground = safeColor(sticker.foreground, '#28251e')
    return <svg viewBox="0 0 220 100" role="img" aria-label={sticker.label} className={className}>
        <path d="M27 10h166a17 17 0 0 1 17 17v46a17 17 0 0 1-17 17H27A17 17 0 0 1 10 73V27A17 17 0 0 1 27 10Z" fill={background} stroke="white" strokeOpacity=".88" strokeWidth="5" />
        <path d="m26 23 7 5m153 44 8 5" stroke={foreground} strokeOpacity=".25" strokeWidth="4" strokeLinecap="round" />
        <text x="110" y="56" textAnchor="middle" dominantBaseline="middle" fill={foreground} fontSize={fontSize} fontWeight="900" letterSpacing="1.2">{sticker.text.slice(0, 18).toUpperCase()}</text>
    </svg>
}
