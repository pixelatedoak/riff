'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/icon'

const THEMES = [
    { id: 'forest', name: 'Forest', detail: 'Riff’s original warm charcoal', colors: ['#0e110f', '#1b201c', '#d6bd82'] },
    { id: 'midnight', name: 'Midnight', detail: 'Cool blue on deep slate', colors: ['#0c1118', '#1a2531', '#91b8ee'] },
    { id: 'plum', name: 'Plum', detail: 'Soft violet on dark aubergine', colors: ['#120e15', '#251c2b', '#d0a6df'] },
    { id: 'ember', name: 'Ember', detail: 'Muted copper on charcoal', colors: ['#14100f', '#29201d', '#e5a987'] },
] as const

type ThemeId = typeof THEMES[number]['id']
const STORAGE_KEY = 'riff-theme'

function getThemeSnapshot(): ThemeId {
    const theme = document.documentElement.dataset.theme
    return THEMES.some((item) => item.id === theme) ? theme as ThemeId : 'forest'
}

function subscribeToTheme(callback: () => void) {
    window.addEventListener('riff:theme-changed', callback)
    return () => window.removeEventListener('riff:theme-changed', callback)
}

function applyTheme(theme: ThemeId) {
    if (theme === 'forest') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES.find((item) => item.id === theme)?.colors[0] ?? '#0e110f')
}

export function ThemePicker() {
    const selected = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => 'forest')

    function chooseTheme(theme: ThemeId) {
        applyTheme(theme)
        try { window.localStorage.setItem(STORAGE_KEY, theme) } catch { /* Keep the selected theme for this session. */ }
        window.dispatchEvent(new Event('riff:theme-changed'))
    }

    return <section className="rounded-card border border-riff-outline bg-riff-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
            <div><p className="riff-overline">Personalization</p><h2 className="mt-1 text-base font-semibold text-riff-text">Color theme</h2><p className="mt-1 text-sm text-riff-muted">Choose a dark palette for Riff. Your choice stays on this device.</p></div>
            <Icon name="palette" size={18} className="mt-1 shrink-0 text-riff-accent" />
        </div>
        <div role="group" aria-label="Choose a color theme" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEMES.map((theme) => <button key={theme.id} type="button" aria-pressed={selected === theme.id} onClick={() => chooseTheme(theme.id)} className={`rounded-xl border p-2.5 text-left transition ${selected === theme.id ? 'border-riff-accent/60 bg-riff-surface-2 ring-1 ring-riff-accent/20' : 'border-riff-outline bg-riff-surface-low hover:bg-riff-surface-2'}`}>
                <span aria-hidden="true" className="flex h-12 items-end gap-1 overflow-hidden rounded-lg border border-white/10 p-1.5" style={{ backgroundColor: theme.colors[0] }}>
                    <span className="h-6 w-1/3 rounded-sm" style={{ backgroundColor: theme.colors[1] }} />
                    <span className="h-8 w-1/3 rounded-sm" style={{ backgroundColor: theme.colors[1] }} />
                    <span className="h-2 w-1/3 self-center rounded-full" style={{ backgroundColor: theme.colors[2] }} />
                </span>
                <span className="mt-2 flex items-center justify-between gap-1 text-sm font-medium text-riff-text">{theme.name}{selected === theme.id && <Icon name="check" size={14} className="text-riff-accent" />}</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-riff-muted">{theme.detail}</span>
            </button>)}
        </div>
    </section>
}
