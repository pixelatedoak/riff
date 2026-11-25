import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
    'inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-riff-accent focus-visible:ring-offset-2 focus-visible:ring-offset-riff-bg disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                primary: 'bg-riff-accent text-riff-accent-ink hover:bg-riff-accent-hover',
                secondary: 'border border-riff-outline bg-riff-surface-2 text-riff-text hover:bg-riff-surface-3',
                ghost: 'text-riff-muted hover:bg-riff-surface-2 hover:text-riff-text',
                danger: 'border border-rose-300/20 bg-rose-300/[0.06] text-rose-100 hover:bg-rose-300/[0.12]',
            },
            size: {
                default: 'px-4 py-2.5',
                compact: 'min-h-9 rounded-lg px-3 py-2 text-xs',
                icon: 'size-10 p-0',
            },
        },
        defaultVariants: { variant: 'primary', size: 'default' },
    },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
    return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
