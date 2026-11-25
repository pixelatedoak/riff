'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/client'

export function NotificationNavItem({ selected }: { selected: boolean }) {
    const [count, setCount] = useState(0)

    const refresh = useCallback(async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setCount(0); return }
        const { count: unread, error } = await supabase.from('riff_notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).is('read_at', null)
        if (!error) setCount(unread ?? 0)
    }, [])

    useEffect(() => {
        const initial = window.setTimeout(() => void refresh(), 0)
        const onUpdate = () => void refresh()
        window.addEventListener('riff:notifications-updated', onUpdate)
        const interval = window.setInterval(refresh, 60_000)
        return () => {
            window.clearTimeout(initial)
            window.removeEventListener('riff:notifications-updated', onUpdate)
            window.clearInterval(interval)
        }
    }, [refresh])

    return <Link href="/notifications" aria-label={count ? `Notifications, ${count} unread` : 'Notifications'} aria-current={selected ? 'page' : undefined} title="Notifications" className={`relative flex size-11 items-center justify-center rounded-full ${selected ? 'bg-riff-surface-3 text-riff-accent' : 'text-riff-muted transition hover:bg-white/5 hover:text-riff-text'}`}>
        <Icon name="bell" size={18} />
        {count > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-riff-accent px-1 text-center text-[10px] font-semibold leading-4 text-riff-accent-ink">{count > 99 ? '99+' : count}</span>}
    </Link>
}
