import Link from 'next/link'

type BottomNavigationProps = {
    active: 'feed' | 'profile' | 'none'
}

export function BottomNavigation({ active }: BottomNavigationProps) {
    const activeClass = 'bg-white/[0.06] text-violet-300'
    const idleClass = 'text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200'

    return (
        <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.65rem)]">
            <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-white/10 bg-[#19191e]/90 p-1 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <Link
                    href="/"
                    aria-label="Feed"
                    aria-current={active === 'feed' ? 'page' : undefined}
                    title="Feed"
                    className={`flex size-11 items-center justify-center rounded-full ${active === 'feed' ? activeClass : idleClass}`}
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.75h16M4 12h16M4 18.25h16" />
                    </svg>
                </Link>

                <Link href="/create" aria-label="Create a Riff" title="Create a Riff" className="flex size-11 items-center justify-center rounded-full bg-violet-300 text-[#17121f] shadow-[0_3px_14px_rgba(196,181,253,0.2)] transition hover:bg-violet-200">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[19px]" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                    </svg>
                </Link>

                <Link
                    href="/profile"
                    aria-label="Profile"
                    aria-current={active === 'profile' ? 'page' : undefined}
                    title="Profile"
                    className={`flex size-11 items-center justify-center rounded-full ${active === 'profile' ? activeClass : idleClass}`}
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="8" r="3.25" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 20a6.5 6.5 0 0113 0" />
                    </svg>
                </Link>
            </div>
        </nav>
    )
}
