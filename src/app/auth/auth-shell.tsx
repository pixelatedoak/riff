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
        <main className="flex min-h-dvh items-center justify-center bg-transparent px-4 py-8 text-[#f4f4f5] sm:py-10">
            <div className="w-full max-w-[22rem]">
                <Link href="/" className="mb-6 inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400 sm:mb-7">
                    <Image src="/icons/riff-192.png" width={32} height={32} alt="" className="size-8 rounded-lg" /> riff
                </Link>

                <section className="rounded-2xl border border-white/[0.08] bg-[#121216]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-7">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    <p className="mt-1.5 text-sm leading-6 text-zinc-400">{description}</p>
                    <div className="mt-6">{children}</div>
                    <div className="mt-6 border-t border-white/10 pt-5">{footer}</div>
                </section>
                <PwaInstallPrompt />
            </div>
        </main>
    )
}
