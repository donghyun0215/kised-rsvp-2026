// Programme wordmark (text until KISED supplies a logo). The leaf-loop mark
// matches the favicon. `compact`: mark only on phones, for crowded headers.
export function Wordmark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold tracking-tight ${light ? "text-white" : "text-navy"}`}>
      <svg viewBox="0 0 512 512" className="h-6 w-6 shrink-0" aria-hidden>
        <rect width="512" height="512" rx="104" fill={light ? "#ffffff" : "#12162B"} />
        <path d="M136 312a124 124 0 0 1 212-128" fill="none" stroke={light ? "#3B49C2" : "#7FD3F2"} strokeWidth="44" strokeLinecap="round" />
        <path d="M376 200a124 124 0 0 1-212 128" fill="none" stroke="#5B74E0" strokeWidth="44" strokeLinecap="round" />
      </svg>
      <span className={`text-[15px] leading-none sm:text-base ${compact ? "max-sm:sr-only" : ""}`}>
        Climate-tech Startup Challenge
        {!compact && <span className={`ml-1.5 hidden font-medium lg:inline ${light ? "text-white/70" : "text-muted-foreground"}`}>Global Demo Day</span>}
      </span>
    </span>
  );
}
