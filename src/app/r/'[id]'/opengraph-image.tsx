import { ImageResponse } from 'next/og'
import { getRiffPreviewData } from '@/lib/riffs/preview'

export const alt = 'A Riff shared on Riff'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const preview = /^[0-9a-f-]{36}$/i.test(id) ? await getRiffPreviewData(id) : null
    const title = preview?.content || 'A thought, ready to branch.'
    const excerpt = title.length > 180 ? `${title.slice(0, 177).trimEnd()}…` : title
    const author = preview?.authorName ?? 'A Riff user'
    const label = preview?.kind === 'black' ? 'BLACK RIFF' : 'OPEN RIFF'
    const attachmentLabel = preview?.attachmentCount
        ? `${preview.attachmentCount} ${preview.attachmentCount === 1 ? 'attachment' : 'attachments'}`
        : 'A thought worth building on'

    return new ImageResponse(
        <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden', padding: '56px 66px', color: '#f3f1e9',
            background: 'linear-gradient(135deg, #10110e 0%, #1a1c17 65%, #111512 100%)',
            fontFamily: 'Arial, sans-serif',
        }}>
            <div style={{ position: 'absolute', width: 480, height: 480, right: -120, bottom: -245, borderRadius: 240, border: '1px solid rgba(214,189,130,0.2)' }} />
            <div style={{ position: 'absolute', width: 350, height: 350, right: -55, bottom: -180, borderRadius: 175, border: '1px solid rgba(214,189,130,0.12)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d6bd82', color: '#211d13', fontSize: 22, fontWeight: 800 }}>r</div>
                    <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: 1 }}>riff</div>
                </div>
                <div style={{ border: '1px solid rgba(214,189,130,0.3)', borderRadius: 20, padding: '9px 16px', color: '#ddca9c', fontSize: 13, letterSpacing: 1.5 }}>{label}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 38, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: preview?.imageUrl ? 660 : 1010, flex: 1 }}>
                    <div style={{ color: '#b4b5a9', fontSize: 19 }}>A thought from <span style={{ color: '#e6e4dc', fontWeight: 600 }}>{author}</span></div>
                    <div style={{ borderLeft: '3px solid #d6bd82', paddingLeft: 25, fontSize: preview?.imageUrl ? 41 : 47, fontWeight: 650, lineHeight: 1.17, letterSpacing: -1.2, maxHeight: 300, overflow: 'hidden' }}>{excerpt}</div>
                </div>
                {preview?.imageUrl && <img src={preview.imageUrl} alt="" width="320" height="350" style={{ width: 320, height: 350, objectFit: 'cover', borderRadius: 22, border: '1px solid rgba(255,255,255,0.16)' }} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#9b9d92', fontSize: 16, position: 'relative' }}>
                <span>{attachmentLabel}</span>
                <span style={{ color: '#d6bd82', letterSpacing: 1.4 }}>IDEAS WORTH BUILDING ON</span>
            </div>
        </div>,
        { ...size },
    )
}
