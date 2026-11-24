export default function Loading() {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="fixed inset-0 z-50 grid place-items-center bg-[#0b0b10]/55 px-6 backdrop-blur-[2px]"
        >
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#17171d]/95 px-5 py-3 shadow-[0_12px_48px_rgba(0,0,0,0.4)]">
                <span className="relative flex size-5 items-center justify-center" aria-hidden="true">
                    <span className="absolute size-5 animate-spin rounded-full border-2 border-violet-300/20 border-t-violet-200" />
                    <span className="size-1.5 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(165,243,252,0.7)]" />
                </span>
                <span className="text-sm font-medium tracking-wide text-zinc-200">Loading Riff</span>
            </div>
        </div>
    )
}
