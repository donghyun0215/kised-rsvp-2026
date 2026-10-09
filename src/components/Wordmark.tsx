// Programme wordmark (text until KISED supplies a logo). The leaf-loop mark
// matches the favicon. `compact`: mark only on phones, for crowded headers.
export function Wordmark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold tracking-tight ${light ? "text-white" : "text-navy"}`}>
      <svg viewBox="0 0 512 512" className="h-6 w-6 shrink-0" aria-hidden>
        <rect width="512" height="512" rx="104" fill={light ? "#ffffff" : "#0F2F2A"} />
        <path d="M136 312a124 124 0 0 1 212-128" fill="none" stroke={light ? "#1E6B4F" : "#D7EBD9"} strokeWidth="44" strokeLinecap="round" />
        <path d="M376 200a124 124 0 0 1-212 128" fill="none" stroke="#E9A82B" strokeWidth="44" strokeLinecap="round" />
      </svg>
      <span className={`text-[15px] leading-none sm:text-base ${compact ? "max-sm:sr-only" : ""}`}>
        Climate Tech Startup Challenge
        {!compact && <span className={`ml-1.5 hidden font-medium sm:inline ${light ? "text-white/70" : "text-muted-foreground"}`}>Singapore 2026</span>}
      </span>
    </span>
  );
}
