'use client'

import { useRouter } from 'next/navigation'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

export function ClickableRiffCard({ href, className, children }: { href: string; className: string; children: ReactNode }) {
    const router = useRouter()

    function openCard(event: MouseEvent<HTMLElement>) {
        const target = event.target
        if (!(target instanceof Element)) return
        if (target.closest('a, button, input, textarea, select, summary, [role="button"], [data-no-card-navigation]')) return
        const targetCard = target.closest('[data-riff-post-card]')
        if (targetCard && targetCard !== event.currentTarget) return
        router.push(href)
    }

    function openOnKey(event: KeyboardEvent<HTMLElement>) {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
        event.preventDefault()
        router.push(href)
    }

    return <article role="link" tabIndex={0} aria-label="Open Riff thread" data-riff-post-card onClick={openCard} onKeyDown={openOnKey} className={`${className} cursor-pointer transition-colors hover:border-riff-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-riff-accent`}>
        {children}
    </article>
}
