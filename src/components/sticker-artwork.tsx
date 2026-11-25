import type { RiffStickerId } from '@/lib/riffs/media-editing'

export function StickerArtwork({ id, className = '' }: { id: RiffStickerId; className?: string }) {
    if (id === 'heart') return <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
        <path d="M50 84 17 52C-1 30 24 7 43 24l7 7 7-7c19-17 44 6 26 28L50 84Z" fill="#f17f90" stroke="#fff2e9" strokeWidth="5" strokeLinejoin="round" />
        <path d="M27 41c2-7 8-10 14-9" fill="none" stroke="#ffd5db" strokeWidth="5" strokeLinecap="round" />
    </svg>
    if (id === 'starburst') return <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
        <path d="m50 3 9 15 15-10 1 18 19-1-8 17 13 9-15 10 9 16-19-2-4 18-15-10-12 14-8-17-18 7 2-19L1 61l13-12-9-16 19-1 3-19 15 10L50 3Z" fill="#e9bd69" stroke="#fff2d6" strokeWidth="4" strokeLinejoin="round" />
        <path d="m50 24 4 17 17-4-12 12 12 12-17-4-4 17-4-17-17 4 12-12-12-12 17 4 4-17Z" fill="#fff0c6" />
    </svg>
    if (id === 'idea') return <svg viewBox="0 0 180 100" aria-hidden="true" className={className}>
        <path d="M21 20h138a12 12 0 0 1 12 12v38a12 12 0 0 1-12 12H79L57 96V82H21A12 12 0 0 1 9 70V32a12 12 0 0 1 12-12Z" fill="#d8c49b" stroke="#fff0d0" strokeWidth="4" strokeLinejoin="round" />
        <path d="M31 35h25M31 44h17" stroke="#9a8055" strokeWidth="3" strokeLinecap="round" />
        <text x="96" y="59" textAnchor="middle" fill="#28251e" fontSize="18" fontWeight="800" letterSpacing="1.2">GOOD IDEA</text>
    </svg>
    if (id === 'riff') return <svg viewBox="0 0 180 100" aria-hidden="true" className={className}>
        <path d="M20 15h140a13 13 0 0 1 13 13v44a13 13 0 0 1-13 13H20A13 13 0 0 1 7 72V28a13 13 0 0 1 13-13Z" fill="#d9e7dd" stroke="#f4fff7" strokeWidth="4" />
        <path d="M32 34h12v12m0-12-12 12m12 0v13m0-13 12 12" fill="none" stroke="#4e7760" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="105" y="58" textAnchor="middle" fill="#213a2b" fontSize="20" fontWeight="800" letterSpacing="1.5">RIFF IT</text>
    </svg>
    if (id === 'branch') return <svg viewBox="0 0 120 100" aria-hidden="true" className={className}>
        <path d="M28 18v46c0 10 6 16 17 16h10m0 0-10-10m10 10L45 90m14-10h17c10 0 16-6 16-16V35m0 0L80 45m12-10 11 10" fill="none" stroke="#dce7dc" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="18" r="12" fill="#d6bd82" stroke="#fff2d6" strokeWidth="4" />
        <circle cx="92" cy="35" r="10" fill="#99b6a1" stroke="#effaf0" strokeWidth="4" />
        <circle cx="55" cy="80" r="10" fill="#99b6a1" stroke="#effaf0" strokeWidth="4" />
    </svg>
    return <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
        <path d="M50 5 59 35 87 15 68 43 97 50 68 58 87 85 59 66 50 96 42 66 14 85 33 58 3 50 33 43 14 15 42 35 50 5Z" fill="#d6bd82" stroke="#fff0d0" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="50" cy="50" r="8" fill="#fff8e5" />
    </svg>
}
