'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform: string }
type InstallPromptEvent = Event & {
    prompt: () => Promise<void>
    userChoice: Promise<InstallChoice>
}

const dismissedKey = 'riff-install-prompt-dismissed'

export function PwaInstallPrompt() {
    const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
    const [visible, setVisible] = useState(false)
    const [showSteps, setShowSteps] = useState(false)
    const [installing, setInstalling] = useState(false)

    useEffect(() => {
        const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
        if (standalone) return

        try {
            if (window.localStorage.getItem(dismissedKey) === 'yes') return
        } catch { /* local storage may be unavailable in a restricted browser */ }

        const showTimer = window.setTimeout(() => setVisible(true), 0)

        function onBeforeInstallPrompt(event: Event) {
            event.preventDefault()
            setPromptEvent(event as InstallPromptEvent)
        }
        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
        return () => {
            window.clearTimeout(showTimer)
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
        }
    }, [])

    function dismiss() {
        setVisible(false)
        try { window.localStorage.setItem(dismissedKey, 'yes') } catch { /* optional preference */ }
    }

    async function install() {
        if (!promptEvent) {
            setShowSteps((current) => !current)
            return
        }
        setInstalling(true)
        try {
            await promptEvent.prompt()
            const result = await promptEvent.userChoice
            if (result.outcome === 'accepted') setVisible(false)
        } finally {
            setPromptEvent(null)
            setInstalling(false)
        }
    }

    if (!visible) return null

    return (
        <aside aria-label="Install Riff" className="my-5 overflow-hidden rounded-2xl border border-riff-accent/10 bg-[linear-gradient(110deg,rgba(167,139,250,0.09),rgba(17,17,22,0.82)_55%)] p-4 shadow-[0_16px_44px_rgba(0,0,0,0.18)] sm:hidden">
            <div className="flex items-center gap-3">
                <Image src="/icons/riff-192.png" width={44} height={44} alt="" className="size-11 rounded-xl" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-100">Keep Riff one tap away</p>
                    <p className="mt-0.5 text-xs text-zinc-500">Add it to your home screen.</p>
                </div>
                <button type="button" onClick={() => void install()} disabled={installing} className="shrink-0 rounded-xl bg-riff-accent px-3.5 py-2.5 text-xs font-bold text-[#17121f] transition hover:bg-riff-accent-hover disabled:opacity-60">
                    {installing ? 'Opening…' : promptEvent ? 'Install' : 'How?'}
                </button>
                <button type="button" aria-label="Dismiss install suggestion" onClick={dismiss} className="-mr-1 -mt-5 self-start rounded-full p-1 text-lg leading-none text-zinc-600 hover:text-zinc-300">×</button>
            </div>
            {showSteps && <p role="status" className="mt-3 border-t border-white/[0.07] pt-3 text-xs leading-5 text-zinc-400">{typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)) ? 'In Safari, tap Share, then choose “Add to Home Screen”.' : 'Open your browser menu and choose “Install app” or “Add to Home screen”.'}</p>}
        </aside>
    )
}
