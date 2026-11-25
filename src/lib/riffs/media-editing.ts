import type { RiffAttachment } from '@/lib/riffs/types'

export type RiffMediaFilter = NonNullable<RiffAttachment['media_filter']>

export const RIFF_MEDIA_FILTERS: { id: RiffMediaFilter; label: string; css: string }[] = [
    { id: 'none', label: 'Original', css: 'none' },
    { id: 'mono', label: 'Mono', css: 'grayscale(1)' },
    { id: 'warm', label: 'Warm', css: 'sepia(.3) saturate(1.25)' },
    { id: 'cool', label: 'Cool', css: 'saturate(.85) hue-rotate(12deg)' },
    { id: 'fade', label: 'Fade', css: 'contrast(.82) brightness(1.08) saturate(.75)' },
    { id: 'contrast', label: 'Contrast', css: 'contrast(1.2) saturate(1.1)' },
]

export const RIFF_STICKERS = ['✨', '❤️', '🌱', '🔥', '⭐', '😂', '🌙', '🫶']

export function getRiffMediaFilter(id: RiffMediaFilter | null | undefined) {
    return RIFF_MEDIA_FILTERS.find((filter) => filter.id === id)?.css ?? 'none'
}
