import type { ReactNode } from 'react'
import Link from 'next/link'

type AuthShellProps = {
    title: string
    description: ReactNode
    children: ReactNode
    footer: ReactNode
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10 text-[#f4f4f5]">
            <div className="w-full max-w-[22rem]">
                <Link href="/" className="mb-7 inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400">
                    <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-violet-400/15 text-sm text-violet-300">r/</span>riff
                </Link>

                <section className="rounded-2xl border border-white/[0.08] bg-[#121216]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-7">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    <p className="mt-1.5 text-sm leading-6 text-zinc-400">{description}</p>
                    <div className="mt-6">{children}</div>
                    <div className="mt-6 border-t border-white/10 pt-5">{footer}</div>
                </section>
            </div>
        </main>
    )
}
