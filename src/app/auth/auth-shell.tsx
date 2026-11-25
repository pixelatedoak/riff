import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PwaInstallPrompt } from '@/app/pwa-install-prompt'

type AuthShellProps = {
    title: string
    description: ReactNode
    children: ReactNode
    footer: ReactNode
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
    return (
        <main className="grid min-h-dvh bg-riff-bg text-riff-text lg:grid-cols-[minmax(0,1fr)_minmax(25rem,0.8fr)]">
            <aside className="relative hidden overflow-hidden border-r border-riff-outline bg-riff-surface-low p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
                <div aria-hidden="true" className="absolute -right-40 top-1/4 size-[36rem] rounded-full border border-riff-outline" />
                <div aria-hidden="true" className="absolute -right-24 top-1/3 size-96 rounded-full border border-riff-outline" />
                <Link href="/" className="relative inline-flex w-fit items-center gap-3 text-xl font-semibold tracking-tight text-riff-text">
                    <Image src="/icons/riff-192.png" width={36} height={36} alt="" className="size-9 rounded-xl" /> Riff
                </Link>
                <div className="relative max-w-xl pb-8">
                    <p className="riff-overline">A social space for ideas in progress</p>
                    <h2 className="riff-page-heading mt-5 max-w-lg text-5xl leading-[1.08] xl:text-6xl">Start a thought.<br /><span className="text-riff-accent">Let it grow.</span></h2>
                </div>
                <p className="relative text-xs text-riff-faint">Write, share, and build together.</p>
            </aside>
            <div className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-8">
                <div className="w-full max-w-[26rem]">
                    <Link href="/" className="mb-8 inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-riff-text lg:hidden">
                        <Image src="/icons/riff-192.png" width={32} height={32} alt="" className="size-8 rounded-lg" /> Riff
                    </Link>
                    <section className="rounded-card border border-riff-outline bg-riff-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-8">
                        <p className="riff-overline">Welcome to Riff</p>
                        <h1 className="riff-page-heading mt-2 text-3xl">{title}</h1>
                        <p className="mt-2 text-sm leading-6 text-riff-muted">{description}</p>
                        <div className="mt-6">{children}</div>
                        <div className="mt-6 border-t border-riff-outline pt-5">{footer}</div>
                    </section>
                <PwaInstallPrompt />
            </div>
            </div>
        </main>
    )
}
