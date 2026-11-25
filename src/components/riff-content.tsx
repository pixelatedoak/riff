import ReactMarkdown, { type Components } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

const markdownComponents: Components = {
    p: ({ children }) => <p className="my-2 last:mb-0 leading-7">{children}</p>,
    h1: ({ children }) => <h2 className="mb-2 mt-4 text-xl font-semibold tracking-tight text-riff-text">{children}</h2>,
    h2: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-semibold tracking-tight text-riff-text">{children}</h3>,
    h3: ({ children }) => <h4 className="mb-2 mt-3 text-base font-semibold text-riff-text">{children}</h4>,
    strong: ({ children }) => <strong className="font-semibold text-riff-text">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => <del className="opacity-70">{children}</del>,
    blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-riff-accent/50 pl-3 text-riff-muted">{children}</blockquote>,
    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer noopener" className="text-riff-accent underline decoration-riff-accent/40 underline-offset-2 hover:decoration-current">{children}</a>,
    code: ({ children, className }) => className
        ? <code className="text-xs">{children}</code>
        : <code className="rounded bg-riff-surface-3 px-1.5 py-0.5 font-mono text-[0.9em] text-riff-accent-soft">{children}</code>,
    pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-control bg-riff-surface-low p-3 text-xs leading-5">{children}</pre>,
    hr: () => <hr className="my-4 border-riff-outline" />,
    table: ({ children }) => <table className="my-3 w-full border-collapse text-left text-sm">{children}</table>,
    th: ({ children }) => <th className="border border-riff-outline bg-riff-surface-2 px-2 py-1.5 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border border-riff-outline px-2 py-1.5">{children}</td>,
}

export function RiffContent({ content, className }: { content: string; className?: string }) {
    return <div className={cn('min-w-0 break-words text-riff-text [&>p:first-child]:mt-0', className)}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>{content}</ReactMarkdown>
    </div>
}
