import type { InputHTMLAttributes, RefAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const fieldStyles = 'w-full rounded-xl border border-riff-outline bg-riff-surface-low px-3.5 py-3 text-sm text-riff-text outline-none placeholder:text-riff-faint transition focus:border-riff-accent/60 focus:ring-2 focus:ring-riff-accent/15 disabled:cursor-not-allowed disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn(fieldStyles, className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & RefAttributes<HTMLTextAreaElement>) {
    return <textarea className={cn(fieldStyles, 'resize-y leading-6', className)} {...props} />
}
