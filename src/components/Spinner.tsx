// One loading language for the whole site: a spinner sized to the text it
// sits next to (1em) plus a short "…ing" label. Used inside every button
// that waits on the server, so a slow response never reads as a frozen page.
import type { ReactNode } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-[1em] w-[1em] shrink-0 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function BusyLabel({ busy, text, children }: { busy: boolean; text: string; children: ReactNode }) {
  if (!busy) return <>{children}</>;
  return (
    <span className="inline-flex items-center justify-center gap-2" role="status" aria-live="polite">
      <Spinner />
      {text}
    </span>
  );
}

export function LoadingNote({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center gap-2 ${className}`} role="status" aria-live="polite">
      <Spinner />
      {text}
    </span>
  );
}
