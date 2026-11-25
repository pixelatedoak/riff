import { ImageResponse } from 'next/og'

export const alt = 'Riff — Ideas worth building on'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
    return new ImageResponse(
        <div style={{
            width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden',
            padding: '62px 72px', color: '#f3f1e9',
            background: 'linear-gradient(135deg, #10110e 0%, #191b16 58%, #101411 100%)',
            fontFamily: 'Arial, sans-serif',
        }}>
            <div style={{ position: 'absolute', width: 520, height: 520, right: -130, top: -190, borderRadius: 260, border: '1px solid rgba(214,189,130,0.22)' }} />
            <div style={{ position: 'absolute', width: 390, height: 390, right: -65, top: -125, borderRadius: 195, border: '1px solid rgba(214,189,130,0.12)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d6bd82', color: '#211d13', fontSize: 25, fontWeight: 800 }}>r</div>
                    <div style={{ fontSize: 29, fontWeight: 700, letterSpacing: 1 }}>riff</div>
                    <div style={{ marginLeft: 12, borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: 18, color: '#a9aa9f', fontSize: 16 }}>A social space for ideas</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 850 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: 68, lineHeight: 1.08, letterSpacing: -2.5, fontWeight: 700 }}><span>Start a thought.</span><span>Let it branch.</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', color: '#b4b4a8', fontSize: 23, lineHeight: 1.45 }}><span>Open Riffs grow through collaboration.</span><span>Black Riffs keep a thought yours.</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#d6bd82', fontSize: 15, letterSpacing: 2, textTransform: 'uppercase' }}>
                    <div style={{ width: 34, height: 1, background: '#d6bd82' }} />Make a thought worth building on
                </div>
            </div>
        </div>,
        { ...size },
    )
}
