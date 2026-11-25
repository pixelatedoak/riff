'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/icon'
import { NotificationNavItem } from '@/app/notifications/notification-nav-item'
import { MessageNavItem } from '@/app/messages/message-nav-item'

type BottomNavigationProps = {
    active: 'feed' | 'explore' | 'messages' | 'profile' | 'notifications' | 'none'
}

export function BottomNavigation({ active }: BottomNavigationProps) {
    const [visible, setVisible] = useState(true)
    const navRef = useRef<HTMLElement>(null)
    const pathname = usePathname()
    const activeClass = 'bg-riff-surface-3 text-riff-accent'
    const idleClass = 'text-riff-muted transition hover:bg-white/5 hover:text-riff-text'
    const items = [
        { href: '/', label: 'Feed', icon: 'feed' as const, selected: active === 'feed' },
        { href: '/explore', label: 'Explore', icon: 'explore' as const, selected: active === 'explore' },
        { href: '/create', label: 'Create a Riff', icon: 'plus' as const, selected: false, create: true },
        { href: '/profile', label: 'Profile', icon: 'profile' as const, selected: active === 'profile' },
    ]

    useEffect(() => {
        let lastY = window.scrollY
        let downDistance = 0
        let upDistance = 0
        const onScroll = () => {
            const y = Math.max(0, window.scrollY)
            const delta = y - lastY
            lastY = y
            if (y < 64) {
                downDistance = 0
                upDistance = 0
                setVisible(true)
                return
            }
            if (navRef.current?.contains(document.activeElement)) {
                setVisible(true)
                return
            }
            if (delta > 0) {
                downDistance += delta
                upDistance = 0
                if (downDistance > 28) setVisible(false)
            } else if (delta < 0) {
                upDistance -= delta
                downDistance = 0
                if (upDistance > 14) setVisible(true)
            }
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        const reveal = window.requestAnimationFrame(() => setVisible(true))
        return () => window.cancelAnimationFrame(reveal)
    }, [pathname])

    return (
        <nav ref={navRef} aria-label="Main navigation" aria-hidden={!visible} onFocusCapture={() => setVisible(true)} className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}>
        <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-riff-outline bg-riff-surface/95 p-1 shadow-[0_8px_32px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                {items.slice(0, 3).map((item) => <Link key={item.href} href={item.href} aria-label={item.label} aria-current={item.selected ? 'page' : undefined} title={item.label} className={`flex size-10 items-center justify-center rounded-full ${item.create ? 'bg-riff-accent text-riff-accent-ink transition hover:bg-riff-accent-hover' : item.selected ? activeClass : idleClass}`}>
                    <Icon name={item.icon} size={item.create ? 19 : 18} strokeWidth={item.create ? 2 : 1.8} />
                </Link>)}
                <MessageNavItem selected={active === 'messages'} />
                <NotificationNavItem selected={active === 'notifications'} />
                {items.slice(3).map((item) => <Link key={item.href} href={item.href} aria-label={item.label} aria-current={item.selected ? 'page' : undefined} title={item.label} className={`flex size-10 items-center justify-center rounded-full ${item.selected ? activeClass : idleClass}`}>
                    <Icon name={item.icon} size={18} strokeWidth={1.8} />
                </Link>)}
            </div>
        </nav>
    )
}
