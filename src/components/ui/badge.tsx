import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = {
    neutral: 'border-white/10 bg-white/[0.04] text-riff-muted',
    open: 'border-emerald-200/20 bg-emerald-200/[0.06] text-emerald-100',
    black: 'border-riff-accent/25 bg-riff-accent/[0.08] text-riff-accent-soft',
    branch: 'border-sky-200/15 bg-sky-200/[0.05] text-sky-100',
} as const

export function Badge({ className, tone = 'neutral', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeVariants }) {
    return <span className={cn('inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none', badgeVariants[tone], className)} {...props} />
}
