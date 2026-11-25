'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgress() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const routeKey = `${pathname}?${searchParams.toString()}`

    return <RouteProgress key={routeKey} routeKey={routeKey} />
}

function RouteProgress({ routeKey }: { routeKey: string }) {
    const [shownFor, setShownFor] = useState<string | null>(null)
    const showTimer = useRef<number | null>(null)
    const fallbackTimer = useRef<number | null>(null)

    useEffect(() => {
        function onClick(event: MouseEvent) {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            const target = event.target
            if (!(target instanceof Element)) return
            const link = target.closest('a[href]')
            if (!(link instanceof HTMLAnchorElement) || link.target && link.target !== '_self' || link.hasAttribute('download')) return

            const nextUrl = new URL(link.href, window.location.href)
            if (nextUrl.origin !== window.location.origin) return
            if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search && nextUrl.hash === window.location.hash) return

            if (showTimer.current !== null) window.clearTimeout(showTimer.current)
            if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current)
            showTimer.current = window.setTimeout(() => setShownFor(routeKey), 120)
            fallbackTimer.current = window.setTimeout(() => setShownFor(null), 12000)
        }

        document.addEventListener('click', onClick, true)
        return () => {
            document.removeEventListener('click', onClick, true)
            if (showTimer.current !== null) window.clearTimeout(showTimer.current)
            if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current)
        }
    }, [routeKey])

    if (shownFor !== routeKey) return null

    return (
        <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-white/[0.04]">
            <span className="block h-full w-[38%] rounded-r-full bg-riff-accent shadow-[0_0_12px_rgba(252,211,77,0.55)] motion-safe:animate-[riff-progress_1.1s_ease-in-out_infinite]" />
            <span className="sr-only">Loading page</span>
        </div>
    )
}
