import Link from 'next/link'
import { Icon } from '@/components/icon'

type BottomNavigationProps = {
    active: 'feed' | 'explore' | 'profile' | 'none'
}

export function BottomNavigation({ active }: BottomNavigationProps) {
    const activeClass = 'bg-riff-surface-3 text-riff-accent'
    const idleClass = 'text-riff-muted transition hover:bg-white/5 hover:text-riff-text'
    const items = [
        { href: '/', label: 'Feed', icon: 'feed' as const, selected: active === 'feed' },
        { href: '/explore', label: 'Explore', icon: 'explore' as const, selected: active === 'explore' },
        { href: '/create', label: 'Create a Riff', icon: 'plus' as const, selected: false, create: true },
        { href: '/profile', label: 'Profile', icon: 'profile' as const, selected: active === 'profile' },
    ]

    return (
        <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.65rem)]">
            <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-riff-outline bg-riff-surface/95 p-1 shadow-[0_8px_32px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                {items.map((item) => <Link key={item.href} href={item.href} aria-label={item.label} aria-current={item.selected ? 'page' : undefined} title={item.label} className={`flex size-11 items-center justify-center rounded-full ${item.create ? 'bg-riff-accent text-riff-accent-ink transition hover:bg-riff-accent-hover' : item.selected ? activeClass : idleClass}`}>
                    <Icon name={item.icon} size={item.create ? 19 : 18} strokeWidth={item.create ? 2 : 1.8} />
                </Link>)}
            </div>
        </nav>
    )
}
