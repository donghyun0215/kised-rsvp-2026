import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";
import { useMemo, useState } from "react";
import { EVENT_NAME } from "@/data/timeslots";
import { companies } from "@/data/companies";
import { STARTUP_LOGOS } from "@/data/companyImages";
import {
  listLoungeProfiles,
  updateContactUrl,
  markLoungeCheckIn,
  listMyContacts,
  addLoungeContact,
  removeLoungeContact,
  saveLoungeContactInfo,
  addCustomContact,
  updateCustomContact,
  removeCustomContact,
  listTeamContacts,
  type TeamContactEntry,
  type LoungeProfile,
  type WalletEntry,
} from "@/lib/booking.server";
import { BusyLabel, LoadingNote } from "@/components/Spinner";
import { absUrl } from "@/lib/url";

// Unlisted attendee wall — QR (?key=) on event day, RSVP-email gate after.
// Not linked from any nav; noindex. PII beyond name/org/title never reaches
// this page (enforced server-side).
export const Route = createFileRoute("/lounge")({
  component: LoungePage,
  validateSearch: (s: Record<string, unknown>): { key?: string } =>
    typeof s.key === "string" && s.key ? { key: s.key } : {},
  head: () => ({
    meta: [
      { title: "Virtual Networking Lounge — Climate Tech Startup Challenge Singapore" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: `Attendee networking lounge for the ${EVENT_NAME}.` },
    ],
  }),
});

// Matches the exact values offered on the RSVP form.
const CHIP_COLORS: Record<string, string> = {
  Investment: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Distribution / partnership": "bg-sky-50 text-sky-700 ring-sky-600/20",
  "Pilot / trial opportunity": "bg-violet-50 text-violet-700 ring-violet-600/20",
  "General interest": "bg-slate-100 text-slate-600 ring-slate-500/20",
};
const BAR_COLORS: Record<string, string> = {
  Investment: "bg-emerald-500",
  "Distribution / partnership": "bg-sky-500",
  "Pilot / trial opportunity": "bg-violet-500",
  "General interest": "bg-slate-400",
};

// Forest palette — kept within one family so a full wall of avatars reads
// as one surface rather than a rainbow.
const AVATAR_COLORS = [
  "#0F2F2A", "#1E6B4F", "#2F8F6A", "#3E6B5C", "#4A7A3F", "#24574A", "#5B7F2E", "#2C4F45",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function contactLabel(url: string): string {
  if (/linkedin\.com/i.test(url)) return "LinkedIn";
  if (/open\.kakao\.com/i.test(url)) return "KakaoTalk";
  return "Website";
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

function LockGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function DotGrid({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor">
      <defs>
        <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}

// Faint marine glyphs — the subject's own vocabulary, kept quiet enough that
// the type stays the loudest thing on the screen.
function MarineWatermark() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-navy opacity-[0.045]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <pattern id="marine" width="112" height="112" patternUnits="userSpaceOnUse">
          {/* waves */}
          <path d="M8 22c6-6 12-6 18 0s12 6 18 0" />
          <path d="M8 30c6-6 12-6 18 0s12 6 18 0" />
          {/* hull */}
          <path d="M70 34h26l-5 9H75z" />
          <path d="M83 34V20l12 6-12 4" />
          {/* buoy / sensor */}
          <circle cx="24" cy="80" r="9" />
          <path d="M24 71v-8M24 89v8" />
          {/* propeller-ish rotor */}
          <path d="M84 78l10-6M84 78l10 6M84 78l-11 0" />
          <circle cx="84" cy="78" r="3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#marine)" />
    </svg>
  );
}

function LoungePage() {
  const { key } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [profiles, setProfiles] = useState<LoungeProfile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [gateError, setGateError] = useState("");
  const [grantedEmail, setGrantedEmail] = useState<string | null>(null);

  const [selected, setSelected] = useState<LoungeProfile | null>(null);

  // browse controls
  const [query, setQuery] = useState("");
  const [interest, setInterest] = useState<string | null>(null);
  const [linkedOnly, setLinkedOnly] = useState(false);

  // contact mini-form
  const [showContactForm, setShowContactForm] = useState(false);
  const [cEmail, setCEmail] = useState("");
  const [cUrl, setCUrl] = useState("");
  const [cMsg, setCMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cBusy, setCBusy] = useState(false);

  // My Contacts wallet ("내 명함집")
  const [view, setView] = useState<"all" | "mine" | "team">("all");
  const [teamEntries, setTeamEntries] = useState<TeamContactEntry[] | null>(null);
  const [wallet, setWallet] = useState<WalletEntry[] | null>(null);
  const [walletSelected, setWalletSelected] = useState<WalletEntry | null>(null);
  const [addTarget, setAddTarget] = useState<LoungeProfile | null>(null);
  const [customEditor, setCustomEditor] = useState<WalletEntry | "new" | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const isTeam = Boolean(grantedEmail?.toLowerCase().endsWith("@lodestart.ai"));

  const refreshTeam = async (ownerEmail: string) => {
    const res = await listTeamContacts({ data: { email: ownerEmail } });
    if (res.ok) setTeamEntries(res.entries);
  };

  const refreshWallet = async (ownerEmail: string) => {
    const res = await listMyContacts({ data: { email: ownerEmail } });
    if (res.ok) {
      setWallet(res.entries);
      setAddedIds(new Set(res.entries.map((e) => e.rsvp_id).filter((id): id is string => Boolean(id))));
    }
  };

  // Any registered RSVP email enters, any time: the lounge URL is not
  // advertised to general attendees before the event (reminder emails omit
  // it), so a date lock only added friction for the startups and staff who
  // already hold the QR. Owner's call, 26 Aug.
  //
  // Entering through the on-site QR (key) now ALSO requires the email — the
  // entrance desk hands out badges only after seeing the lounge open, and
  // key+email together is what marks real attendance in the DB. Email-only
  // remote entry never checks anyone in.
  const load = async (auth: { key?: string; email?: string }) => {
    setLoading(true);
    setGateError("");
    const res = await listLoungeProfiles({ data: auth });
    setLoading(false);
    if (res.ok) {
      setProfiles(res.profiles);
      if (auth.email) {
        setGrantedEmail(auth.email);
        void refreshWallet(auth.email);
        void markLoungeCheckIn({ data: { key: auth.key, email: auth.email } });
      }
    } else {
      setProfiles(null);
      setGateError(
        auth.key
          ? "No RSVP found with this email — please RSVP first, then come back in."
          : "No RSVP found with this email — please RSVP first, then come back in.",
      );
    }
  };

  // A QR scan lands here holding a key, but we deliberately do not enter
  // automatically — the visitor gets a beat to read the notice and tap in.

  const submitContact = async () => {
    if (!cEmail.trim() || cBusy) return;
    setCBusy(true);
    setCMsg(null);
    const res = await updateContactUrl({ data: { email: cEmail.trim(), contactUrl: cUrl } });
    setCBusy(false);
    setCMsg(res.ok ? { ok: true, text: "Saved. Your card is updated." } : { ok: false, text: res.message ?? "Something went wrong." });
    if (res.ok) {
      void load(key ? { key } : grantedEmail ? { email: grantedEmail } : { email: cEmail.trim() });
    }
  };

  // "Who's here" composition — counts by interest, ordered by size.
  const groups = useMemo(() => {
    if (!profiles) return [];
    const m = new Map<string, number>();
    for (const p of profiles) {
      const k = p.primary_interest || "General interest";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [profiles]);

  const linkedCount = useMemo(() => profiles?.filter((p) => p.contact_url).length ?? 0, [profiles]);

  const shown = useMemo(() => {
    if (!profiles) return [];
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (interest && (p.primary_interest || "General interest") !== interest) return false;
      if (linkedOnly && !p.contact_url) return false;
      if (!q) return true;
      return `${p.full_name} ${p.organisation} ${p.job_title}`.toLowerCase().includes(q);
    });
  }, [profiles, query, interest, linkedOnly]);

  const filtersOn = Boolean(query.trim() || interest || linkedOnly);
  const clearFilters = () => {
    setQuery("");
    setInterest(null);
    setLinkedOnly(false);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-secondary/40">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center">
            <Wordmark compact />
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              to="/"
              className="rounded-full bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-secondary-foreground transition hover:bg-accent sm:px-4 sm:py-2 sm:text-sm"
            >
              Home
            </Link>
            <Link
              to="/"
              hash="startups"
              className="hidden rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-accent sm:block"
            >
              Startups
            </Link>
            <Link
              to="/book"
              className="rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
            >
              Event RSVP<span className="hidden sm:inline"> (28 Oct)</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        {!profiles ? (
          <>
            {/* ── HERO ── */}
            <section className="relative -mx-4 -mt-6 overflow-hidden bg-navy px-4 pb-14 pt-10 sm:-mx-6 sm:-mt-8 sm:px-6 sm:pb-16 sm:pt-12">
              {/* decorative field */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <DotGrid className="absolute left-6 top-8 h-20 w-32 text-white/25" />
                <DotGrid className="absolute bottom-10 left-1/3 h-16 w-24 text-white/15" />
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[10px] border-white/10" />
                <div className="absolute right-1/3 top-6 h-0 w-0 border-b-[26px] border-l-[16px] border-r-[16px] border-b-white/15 border-l-transparent border-r-transparent rotate-[24deg]" />
                <div className="absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-white/5" />
              </div>

              <div className="relative mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
                <div className="order-2 lg:order-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow">
                    {EVENT_NAME}
                  </div>
                  <h1
                    className="mt-3 text-[32px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[42px]"
                    style={{ fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif' }}
                  >
                    Welcome to
                    <br />
                    Virtual Networking Lounge
                  </h1>
                  <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
                    Connect, collaborate, and explore opportunities with innovators, investors, and
                    partners in the climate tech ecosystem.
                  </p>

                  {/* gate card — email is always required; the QR key on top
                      of it is what marks on-site attendance */}
                  <div className="mt-7 max-w-md rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                    <div className="text-sm font-bold text-white">
                      {key ? "You're at the event — enter your RSVP email to check in" : "To enter the lounge, input your email"}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && email.trim() && void load(key ? { key, email: email.trim() } : { email: email.trim() })}
                        placeholder="Enter your email address"
                        className="min-w-0 flex-1 rounded-lg border border-white/30 bg-white px-3 py-2.5 text-base text-navy placeholder:text-slate-400 sm:text-sm"
                      />
                      <button
                        type="button"
                        disabled={!email.trim() || loading}
                        onClick={() => void load(key ? { key, email: email.trim() } : { email: email.trim() })}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                      >
                        <BusyLabel busy={loading} text="Checking…">
                          Enter lounge <span aria-hidden="true">→</span>
                        </BusyLabel>
                      </button>
                    </div>
                    {gateError && (
                      <p className="mt-2.5 text-xs leading-relaxed text-rose-200">
                        {gateError}{" "}
                        <a href="/book" className="font-semibold text-white underline underline-offset-2">
                          RSVP here →
                        </a>
                      </p>
                    )}
                    <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/75">
                      <LockGlyph className="mt-0.5 h-3 w-3 shrink-0" />
                      RSVP attendees only. Please use the email you registered with.
                    </p>
                  </div>
                </div>

                {/* Who's in the room: the ten startup logos on white tiles */}
                <div className="relative order-1 mx-auto w-full max-w-[320px] lg:order-2 lg:max-w-[440px]">
                  <div className="grid grid-cols-5 gap-2 lg:grid-cols-2 lg:gap-3">
                    {companies.map((c) => (
                      <div key={c.slug} className="flex aspect-[3/2] items-center justify-center rounded-lg bg-white p-2 lg:aspect-[5/2] lg:p-3">
                        <img src={STARTUP_LOGOS[c.slug]} alt={c.name} className="max-h-full max-w-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── NOTICE ── */}
            <section className="mx-auto max-w-3xl py-10 sm:py-12">
              <div className="relative flex gap-4 overflow-hidden rounded-2xl border border-primary/15 bg-card p-5 shadow-sm sm:gap-5 sm:p-6">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-primary/10" />
                  <svg className="absolute -bottom-6 -right-4 h-20 w-20 text-primary/25" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <defs>
                      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse">
                        <path d="M0 6L6 0" />
                      </pattern>
                    </defs>
                    <circle cx="40" cy="40" r="38" fill="url(#hatch)" stroke="none" />
                  </svg>
                  <DotGrid className="absolute -left-1 bottom-3 h-12 w-20 text-primary/25" />
                </div>
                <div className="relative hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:flex">
                  <LockGlyph className="h-5 w-5 text-primary" />
                </div>
                <div className="relative min-w-0">
                  <h2 className="text-sm font-bold text-navy">{"<Networking Lounge Notice>"}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    To facilitate professional networking during the {EVENT_NAME},
                    this directory displays the name, organisation, designation and primary business
                    interests of registered attendees.
                  </p>
                  <dl className="mt-3 space-y-2 text-xs leading-relaxed">
                    <div>
                      <dt className="inline font-semibold text-navy">Exclusive access. </dt>
                      <dd className="inline text-muted-foreground">
                        This directory is strictly private and accessible only to verified attendees
                        present at the event.
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-navy">No direct contact info. </dt>
                      <dd className="inline text-muted-foreground">
                        Personal contact information such as email addresses and phone numbers is not
                        displayed or shared.
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-navy">Data management. </dt>
                      <dd className="inline text-muted-foreground">
                        To update your details or opt out of being listed, use “Add or update my
                        link” inside the lounge, or contact the organising team at{" "}
                        <a href="mailto:support@lodestart.ai" className="font-medium text-primary hover:underline">
                          support@lodestart.ai
                        </a>
                        .
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="relative -mx-4 -mb-16 overflow-hidden bg-navy px-4 py-8 sm:-mx-6 sm:px-6">
              <div className="relative mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <Wordmark light />
                <div>
                  <div className="text-sm font-bold text-white">2026 Climate Tech Startup Challenge</div>
                  <div className="mt-1 text-xs text-white/70">Singapore Demo Day · Wed 28 Oct</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Contact</div>
                  <a
                    href="mailto:support@lodestart.ai"
                    className="mt-1 block text-xs text-yellow hover:underline"
                  >
                    support@lodestart.ai
                  </a>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div className="lg:grid lg:grid-cols-[248px_1fr] lg:gap-8">
            {/* ── side rail ─────────────────────────────── */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="hidden lg:block">
                <h1 className="font-display text-2xl font-bold tracking-tight text-navy">Attendees</h1>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {profiles.length} people joined on 28 October.
                </p>
              </div>

              <div className="relative mt-4 lg:mt-5">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, company, role"
                  className="w-full rounded-full border border-input bg-background py-2.5 pl-9 pr-3 text-base outline-none ring-primary/30 transition focus:ring-2 sm:text-sm"
                />
              </div>

              {/* who's here — counts double as filters */}
              <div className="mt-4 hidden rounded-2xl border border-border bg-card p-4 shadow-sm lg:block">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Who's here
                </div>
                <div className="mt-3 space-y-2.5">
                  {groups.map(([label, n]) => {
                    const active = interest === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setInterest(active ? null : label)}
                        className="group w-full text-left"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`truncate text-xs transition ${
                              active ? "font-semibold text-navy" : "text-navy/70 group-hover:text-navy"
                            }`}
                          >
                            {label}
                          </span>
                          <span className={`text-xs tabular-nums ${active ? "font-semibold text-navy" : "text-muted-foreground"}`}>
                            {n}
                          </span>
                        </div>
                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${BAR_COLORS[label] ?? "bg-slate-400"} ${
                              active ? "opacity-100" : "opacity-60 group-hover:opacity-90"
                            }`}
                            style={{ width: `${Math.round((n / profiles.length) * 100)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-border pt-3 text-xs text-navy/70">
                  <input
                    type="checkbox"
                    checked={linkedOnly}
                    onChange={(e) => setLinkedOnly(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[color:var(--primary)]"
                  />
                  <span>Has a contact link ({linkedCount})</span>
                </label>

                {filtersOn && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 text-[11px] font-semibold text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* mobile: horizontal filter chips */}
              <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {groups.map(([label, n]) => {
                  const active = interest === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setInterest(active ? null : label)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                        active
                          ? "bg-navy text-white ring-navy"
                          : "bg-card text-navy/70 ring-border"
                      }`}
                    >
                      {label} <span className="tabular-nums opacity-70">{n}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowContactForm((v) => !v);
                  if (grantedEmail && !cEmail) setCEmail(grantedEmail);
                }}
                className="mt-4 w-full rounded-full border border-primary/40 bg-card px-4 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
              >
                {showContactForm ? "Close" : "Add or update my link"}
              </button>

              {showContactForm && (
                <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Add a LinkedIn profile, company page or open-chat link so others can reach you.
                    No re-registration needed.
                  </p>
                  <input
                    type="email"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    placeholder="Email you RSVP'd with"
                    className="mt-3 w-full rounded-lg border border-input px-3 py-2.5 text-base sm:text-sm"
                  />
                  <input
                    value={cUrl}
                    onChange={(e) => setCUrl(e.target.value)}
                    placeholder="linkedin.com/in/yourname"
                    className="mt-2 w-full rounded-lg border border-input px-3 py-2.5 text-base sm:text-sm"
                  />
                  <button
                    type="button"
                    disabled={cBusy || !cEmail.trim()}
                    onClick={() => void submitContact()}
                    className="mt-3 w-full rounded-full bg-primary py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    <BusyLabel busy={cBusy} text="Saving…">Save</BusyLabel>
                  </button>
                  {cMsg && (
                    <p className={`mt-2 text-[11px] ${cMsg.ok ? "text-green-700" : "text-red-600"}`}>{cMsg.text}</p>
                  )}
                </div>
              )}
            </aside>

            {/* ── card wall ─────────────────────────────── */}
            <section className="mt-6 lg:mt-0">
              {grantedEmail && (
                <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setView("all")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      view === "all" ? "bg-navy text-white" : "text-navy hover:bg-muted"
                    }`}
                  >
                    Everyone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView("mine");
                      if (grantedEmail) void refreshWallet(grantedEmail);
                    }}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      view === "mine" ? "bg-navy text-white" : "text-navy hover:bg-muted"
                    }`}
                  >
                    My Contacts{wallet?.length ? ` (${wallet.length})` : ""}
                  </button>
                  {isTeam && (
                    <button
                      type="button"
                      onClick={() => {
                        setView("team");
                        if (grantedEmail) void refreshTeam(grantedEmail);
                      }}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                        view === "team" ? "bg-navy text-white" : "text-navy hover:bg-muted"
                      }`}
                    >
                      Team view
                    </button>
                  )}
                </div>
              )}

              {view === "team" && isTeam ? (
                <TeamContactsWall entries={teamEntries} />
              ) : view === "mine" && grantedEmail ? (
                <MyContactsWall
                  wallet={wallet}
                  ownerEmail={grantedEmail}
                  onSelect={(e) => (e.rsvp_id ? setWalletSelected(e) : setCustomEditor(e))}
                  onAddCustom={() => setCustomEditor("new")}
                  onBrowseAll={() => setView("all")}
                />
              ) : (
                <>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-navy lg:hidden">Attendees</h2>
                <p className="text-xs text-muted-foreground">
                  {filtersOn ? `${shown.length} of ${profiles.length}` : `${profiles.length} people`}
                  {interest && <> · {interest}</>}
                </p>
                {filtersOn && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-semibold text-primary hover:underline lg:hidden"
                  >
                    Clear
                  </button>
                )}
              </div>

              {shown.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
                  <p className="text-sm font-semibold text-navy">No one matches that</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different name or company, or clear the filters.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-full border border-border px-4 py-2 text-xs font-semibold text-navy transition hover:bg-muted"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {shown.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p)}
                      className="group flex flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ring-2 ring-white"
                          style={{ backgroundColor: avatarColor(p.full_name) }}
                        >
                          {initials(p.full_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-navy">{p.full_name}</div>
                          <div className="line-clamp-2 break-words text-xs leading-snug text-muted-foreground">
                            {p.job_title}
                          </div>
                          <div className="mt-0.5 truncate text-xs font-medium text-navy/60">
                            {p.organisation}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-1 items-end justify-between gap-2">
                        {p.primary_interest ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${
                              CHIP_COLORS[p.primary_interest] ?? "bg-secondary text-navy ring-border"
                            }`}
                          >
                            {p.primary_interest}
                          </span>
                        ) : (
                          <span />
                        )}
                        {p.contact_url ? (
                          <a
                            href={absUrl(p.contact_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-navy/85"
                          >
                            <LinkIcon className="h-3 w-3" />
                            {contactLabel(p.contact_url)}
                          </a>
                        ) : (
                          <span className="shrink-0 text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                            View →
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
                Visible to event attendees only · emails are shared only between confirmed 1:1
                meeting partners inside My Contacts · to update or remove your card, contact{" "}
                <a href="mailto:support@lodestart.ai" className="font-medium text-primary hover:underline">
                  support@lodestart.ai
                </a>
              </p>
                </>
              )}
            </section>
          </div>
        )}

        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setSelected(null)}
          >
            <div
              className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card shadow-xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-secondary/60 px-6 pb-6 pt-8 text-center">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-background hover:text-navy"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
                <div
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white ring-4 ring-background"
                  style={{ backgroundColor: avatarColor(selected.full_name) }}
                >
                  {initials(selected.full_name)}
                </div>
                <div className="mt-3 text-lg font-bold text-navy">{selected.full_name}</div>
                {selected.primary_interest && (
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ${
                      CHIP_COLORS[selected.primary_interest] ?? "bg-background text-navy ring-border"
                    }`}
                  >
                    {selected.primary_interest}
                  </span>
                )}
              </div>
              <div className="space-y-3 px-6 py-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Organisation
                  </div>
                  <div className="mt-0.5 break-words text-sm font-semibold text-navy">{selected.organisation}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Role</div>
                  <div className="mt-0.5 break-words text-sm text-navy/90">{selected.job_title}</div>
                </div>
                {selected.contact_url ? (
                  <a
                    href={absUrl(selected.contact_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-navy py-2.5 text-sm font-semibold text-white transition hover:bg-navy/85"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Connect on {contactLabel(selected.contact_url)}
                  </a>
                ) : (
                  <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-center text-xs text-muted-foreground">
                    No contact link added yet
                  </p>
                )}
                {grantedEmail && (
                  <button
                    type="button"
                    disabled={addedIds.has(selected.id)}
                    onClick={() => setAddTarget(selected)}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm font-semibold text-navy transition hover:bg-muted disabled:opacity-60"
                  >
                    {addedIds.has(selected.id) ? "✓ In My Contacts" : "＋ Add to My Contacts"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {addTarget && grantedEmail && (
          <AddContactPopup
            profile={addTarget}
            onCancel={() => setAddTarget(null)}
            onAdd={async (note) => {
              const r = await addLoungeContact({
                data: { ownerEmail: grantedEmail, contactRsvpId: addTarget.id, note: note || undefined },
              });
              if (r.ok) {
                setAddedIds((s) => new Set(s).add(addTarget.id));
                void refreshWallet(grantedEmail);
              }
              setAddTarget(null);
            }}
          />
        )}

        {customEditor && grantedEmail && (
          <CustomContactModal
            entry={customEditor === "new" ? null : customEditor}
            ownerEmail={grantedEmail}
            onClose={() => setCustomEditor(null)}
            onDone={() => {
              setCustomEditor(null);
              void refreshWallet(grantedEmail);
            }}
          />
        )}

        {walletSelected && grantedEmail && (
          <WalletCardModal
            entry={walletSelected}
            ownerEmail={grantedEmail}
            onClose={() => setWalletSelected(null)}
            onChanged={() => void refreshWallet(grantedEmail)}
            onRemoved={() => {
              setWalletSelected(null);
              void refreshWallet(grantedEmail);
            }}
          />
        )}

        {profiles && (
          <footer className="mt-10 text-center text-xs text-muted-foreground">
            Hosted by the Korea Institute of Startup &amp; Entrepreneurship Development (KISED) · Organized by LodestarT
          </footer>
        )}
      </main>
    </div>
  );
}

// ── My Contacts ("내 명함집") ─────────────────────────────────────
// Personal follow-up wallet: 1:1 meeting partners appear automatically
// (computed from bookings server-side), everyone else is added by hand from
// the wall. Cards open a small editable template — email/phone the owner
// types here is private to them.

function MyContactsWall({
  wallet,
  ownerEmail,
  onSelect,
  onAddCustom,
  onBrowseAll,
}: {
  wallet: WalletEntry[] | null;
  ownerEmail: string;
  onSelect: (e: WalletEntry) => void;
  onAddCustom: () => void;
  onBrowseAll: () => void;
}) {
  // Multi-select → one email to everyone chosen. Opens the person's own
  // mail app via mailto: (no OAuth, no server, works on PC/Android/iOS);
  // recipients go in BCC so they never see each other. Web-Gmail/Outlook
  // and copy-to-clipboard fallbacks cover machines with no default client.
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const keyOf = (w: WalletEntry) => w.rsvp_id ?? w.entry_id ?? "";
  const emailOf = (w: WalletEntry) => w.meeting_email ?? w.saved_email ?? null;
  const togglePick = (w: WalletEntry) =>
    setPicked((s) => {
      const n = new Set(s);
      const k = keyOf(w);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const exitSelect = () => {
    setSelecting(false);
    setPicked(new Set());
  };

  if (!wallet) {
    return <p className="mt-6 text-center text-sm text-muted-foreground"><LoadingNote text="Loading your contacts…" /></p>;
  }
  if (wallet.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <p className="text-sm font-semibold text-navy">No contacts saved yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          People you meet in a 1:1 session appear here automatically. You can also add anyone from
          the attendee wall — open their card and tap “Add to My Contacts”.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={onBrowseAll}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-navy transition hover:bg-muted"
          >
            Browse attendees
          </button>
          <button
            type="button"
            onClick={onAddCustom}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            ＋ Add someone manually
          </button>
        </div>
      </div>
    );
  }
  const meetings = wallet.filter((w) => w.source === "meeting").length;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {wallet.length} saved{meetings ? ` · ${meetings} from your 1:1 meetings` : ""} · manually added cards are visible to you and the organizing team
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (selecting ? exitSelect() : setSelecting(true))}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition ${
              selecting
                ? "bg-navy text-white hover:bg-navy/85"
                : "bg-navy text-white hover:bg-navy/85"
            }`}
          >
            {selecting ? (
              "Done selecting"
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                Send a group email
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onAddCustom}
            className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-muted"
          >
            ＋ Add someone
          </button>
        </div>
      </div>
      {selecting && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          <strong className="text-navy">Step 1:</strong> tap the cards you want to email. <strong className="text-navy">Step 2:</strong> hit the button at the bottom — your own mail app opens with everyone in BCC. Cards without an email are greyed out.
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {wallet.map((w) => (
          <button
            key={w.rsvp_id ?? w.entry_id}
            type="button"
            onClick={() => (selecting ? togglePick(w) : onSelect(w))}
            className={`group relative flex flex-col rounded-2xl border bg-card p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-5 ${
              selecting && picked.has(keyOf(w))
                ? "border-primary ring-2 ring-primary/40"
                : "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            } ${selecting && !emailOf(w) ? "opacity-50" : ""}`}
          >
            {selecting && (
              <span
                className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
                  picked.has(keyOf(w)) ? "border-primary bg-primary text-white" : "border-border bg-background text-transparent"
                }`}
              >
                ✓
              </span>
            )}
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ring-2 ring-white"
                style={{ backgroundColor: avatarColor(w.full_name) }}
              >
                {initials(w.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-navy">{w.full_name}</div>
                <div className="line-clamp-2 break-words text-xs leading-snug text-muted-foreground">{w.job_title}</div>
                <div className="mt-0.5 truncate text-xs font-medium text-navy/60">{w.organisation}</div>
              </div>
            </div>
            {w.saved_note && (
              <p className="mt-2 line-clamp-1 text-[11px] italic text-muted-foreground">“{w.saved_note}”</p>
            )}
            <div className="mt-3 flex flex-1 items-end justify-between gap-2">
              {w.source === "meeting" ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  1:1 meeting
                </span>
              ) : w.rsvp_id ? (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-navy ring-1 ring-inset ring-border">
                  Saved
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  External
                </span>
              )}
              <span className="shrink-0 text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                Open →
              </span>
            </div>
          </button>
        ))}
      </div>
      {selecting && picked.size > 0 && (
        <BulkEmailBar
          entries={wallet.filter((w) => picked.has(keyOf(w)))}
          ownerEmail={ownerEmail}
          emailOf={emailOf}
          onDone={exitSelect}
        />
      )}
    </>
  );
}

// Sticky action bar for multi-select email. Builds mailto: with the owner
// in To (some clients drop a BCC-only compose) and everyone else in BCC.
// mailto URLs cap out around ~2,000 chars, so large picks are split into
// batches; web Gmail/Outlook links and a copy button cover PCs with no
// default mail client. Subject is prefilled with the event name for
// recipient context; body is left to the sender's own voice.
const BULK_SUBJECT = `Great meeting you at the ${EVENT_NAME}`;
const BULK_BATCH = 40;

function BulkEmailBar({
  entries,
  ownerEmail,
  emailOf,
  onDone,
}: {
  entries: WalletEntry[];
  ownerEmail: string;
  emailOf: (w: WalletEntry) => string | null;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const flashOpening = (label: string) => {
    setOpening(label);
    setTimeout(() => setOpening(null), 3500);
  };
  const emails = [...new Set(entries.map(emailOf).filter((e): e is string => Boolean(e)))];
  const missing = entries.length - emails.length;
  const batches: string[][] = [];
  for (let i = 0; i < emails.length; i += BULK_BATCH) batches.push(emails.slice(i, i + BULK_BATCH));
  const subj = encodeURIComponent(BULK_SUBJECT);

  const mailto = (list: string[]) =>
    list.length === 1
      ? `mailto:${list[0]}?subject=${subj}`
      : `mailto:${encodeURIComponent(ownerEmail)}?bcc=${encodeURIComponent(list.join(","))}&subject=${subj}`;
  const gmailWeb = (list: string[]) =>
    `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(list.join(","))}&su=${subj}`;
  const outlookWeb = (list: string[]) =>
    `https://outlook.office.com/mail/deeplink/compose?bcc=${encodeURIComponent(list.join(";"))}&subject=${subj}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — links still work */
    }
  };

  return (
    <>
      {opening && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-card px-6 py-4 shadow-xl">
            <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <div>
              <div className="text-sm font-bold text-navy">Opening {opening}…</div>
              <div className="text-[11px] text-muted-foreground">
                Recipients are in BCC. If nothing opens, use “Copy all emails” below.
              </div>
            </div>
          </div>
        </div>
      )}
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 shadow-[0_-8px_24px_rgba(10,33,99,0.08)] backdrop-blur sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-navy">
            <strong>{entries.length} selected</strong> · {emails.length} with email
            {missing > 0 && <span className="text-muted-foreground"> · {missing} without (skipped)</span>}
          </p>
          <button type="button" onClick={onDone} className="text-[11px] font-semibold text-muted-foreground hover:text-navy">
            Cancel
          </button>
        </div>
        {emails.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            None of the selected cards has an email yet. Open a card to add one, or pick 1:1 partners.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {batches.map((b, i) => (
                <a
                  key={i}
                  href={mailto(b)}
                  onClick={() => flashOpening("your email app")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  ✉ Open in my email app{batches.length > 1 ? ` (${i + 1}/${batches.length}, ${b.length})` : ` (${b.length})`}
                </a>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>No mail app on this device?</span>
              {batches.map((b, i) => (
                <span key={i} className="flex gap-3">
                  <a href={gmailWeb(b)} target="_blank" rel="noopener noreferrer" onClick={() => flashOpening("Gmail")} className="font-semibold text-primary hover:underline">
                    Gmail web{batches.length > 1 ? ` ${i + 1}` : ""}
                  </a>
                  <a href={outlookWeb(b)} target="_blank" rel="noopener noreferrer" onClick={() => flashOpening("Outlook")} className="font-semibold text-primary hover:underline">
                    Outlook web{batches.length > 1 ? ` ${i + 1}` : ""}
                  </a>
                </span>
              ))}
              <button type="button" onClick={() => void copy()} className="font-semibold text-primary hover:underline">
                {copied ? "Copied ✓" : "Copy all emails"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}

function WalletCardModal({
  entry,
  ownerEmail,
  onClose,
  onChanged,
  onRemoved,
}: {
  entry: WalletEntry;
  ownerEmail: string;
  onClose: () => void;
  onChanged: () => void;
  onRemoved: () => void;
}) {
  const [wEmail, setWEmail] = useState(entry.saved_email ?? "");
  const [wPhone, setWPhone] = useState(entry.saved_phone ?? "");
  const [wNote, setWNote] = useState(entry.saved_note ?? "");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const res = await saveLoungeContactInfo({
      data: { ownerEmail, contactRsvpId: entry.rsvp_id as string, email: wEmail, phone: wPhone, note: wNote },
    });
    setBusy(false);
    setMsg(res.ok ? "Saved." : "Couldn't save — try again.");
    if (res.ok) onChanged();
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setRemoving(true);
    const res = await removeLoungeContact({ data: { ownerEmail, contactRsvpId: entry.rsvp_id as string } }).catch(() => ({ ok: false as const }));
    setBusy(false);
    setRemoving(false);
    if (res.ok) onRemoved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-secondary/60 px-6 pb-6 pt-8 text-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-background hover:text-navy"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white ring-4 ring-background"
            style={{ backgroundColor: avatarColor(entry.full_name) }}
          >
            {initials(entry.full_name)}
          </div>
          <div className="mt-3 text-lg font-bold text-navy">{entry.full_name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {entry.job_title} · {entry.organisation}
          </div>
          {entry.source === "meeting" && (
            <span className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              Met in a 1:1 meeting
            </span>
          )}
        </div>
        <div className="space-y-3 px-6 py-5">
          {entry.meeting_email && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</div>
              <a
                href={`mailto:${entry.meeting_email}`}
                className="mt-0.5 block break-all text-sm font-semibold text-primary hover:underline"
              >
                {entry.meeting_email}
              </a>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                Shared because you two had a confirmed 1:1 meeting.
              </p>
            </div>
          )}
          {entry.contact_url && (
            <a
              href={absUrl(entry.contact_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-navy py-2.5 text-sm font-semibold text-white transition hover:bg-navy/85"
            >
              <LinkIcon className="h-4 w-4" />
              Connect on {contactLabel(entry.contact_url)}
            </a>
          )}

          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              My notes — only I can see these
            </div>
            <div className="mt-2 space-y-2">
              <input
                type="email"
                value={wEmail}
                onChange={(e) => setWEmail(e.target.value)}
                placeholder={entry.meeting_email ? "Alternative email (optional)" : "Their email (optional)"}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
              />
              <input
                type="tel"
                value={wPhone}
                onChange={(e) => setWPhone(e.target.value)}
                placeholder="Their phone (optional)"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
              />
              <textarea
                value={wNote}
                onChange={(e) => setWNote(e.target.value)}
                rows={2}
                placeholder="Note — where you met, follow-up ideas… (optional)"
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save()}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <BusyLabel busy={busy && !removing} text="Saving…">Save</BusyLabel>
                </button>
                {msg && <span className="text-[11px] text-muted-foreground">{msg}</span>}
              </div>
            </div>
          </div>

          {entry.source === "manual" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="w-full rounded-full border border-border py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-rose-600"
            >
              <BusyLabel busy={removing} text="Removing…">Remove from My Contacts</BusyLabel>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact add-to-contacts popup: one optional free-text note ("where we
// met" — Nuldam, Seafood Expo, an intro, anything), then Add. Tammy asked
// for free text over a venue dropdown, and saving must work with the note
// left empty (30 Aug).
function AddContactPopup({
  profile,
  onAdd,
  onCancel,
}: {
  profile: LoungeProfile;
  onAdd: (note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    await onAdd(note.trim());
  };
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: avatarColor(profile.full_name) }}
          >
            {initials(profile.full_name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-navy">Add {profile.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">{profile.organisation}</div>
          </div>
        </div>
        <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Note <span className="font-normal normal-case">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          autoFocus
          placeholder="Where did you meet? e.g. 1:1 meetup, site visit, introduced by…"
          className="mt-1 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold text-navy transition hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            <BusyLabel busy={busy} text="Adding…">Add to My Contacts</BusyLabel>
          </button>
        </div>
      </div>
    </div>
  );
}

// Create/edit modal for external cards — people who aren't in the RSVP
// list at all (Nuldam guests, Seafood Expo, personal intros). Only name is
// required. These exist solely inside the owner's wallet; the public wall
// renders from rsvps and never shows them.
function CustomContactModal({
  entry,
  ownerEmail,
  onClose,
  onDone,
}: {
  entry: WalletEntry | null;
  ownerEmail: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(entry?.full_name ?? "");
  const [org, setOrg] = useState(entry?.organisation ?? "");
  const [title, setTitle] = useState(entry?.job_title ?? "");
  const [cEmail, setCEmail] = useState(entry?.saved_email ?? "");
  const [cPhone, setCPhone] = useState(entry?.saved_phone ?? "");
  const [cNote, setCNote] = useState(entry?.saved_note ?? "");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    setErr(null);
    const payload = {
      ownerEmail,
      name,
      org: org || undefined,
      title: title || undefined,
      email: cEmail || undefined,
      phone: cPhone || undefined,
      note: cNote || undefined,
    };
    const res = entry?.entry_id
      ? await updateCustomContact({ data: { ...payload, entryId: entry.entry_id } })
      : await addCustomContact({ data: payload });
    setBusy(false);
    if (res.ok) onDone();
    else setErr("Couldn't save — try again.");
  };

  const remove = async () => {
    if (busy || !entry?.entry_id) return;
    setBusy(true);
    setRemoving(true);
    const res = await removeCustomContact({ data: { ownerEmail, entryId: entry.entry_id } }).catch(() => ({ ok: false as const }));
    setBusy(false);
    setRemoving(false);
    if (res.ok) onDone();
  };

  const field =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-bold text-navy">{entry ? "Edit contact" : "Add someone manually"}</div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          For people you met outside the attendee list — meetups, site visits, anywhere. Saved in
          your wallet and visible to the organizing team.
        </p>
        <div className="mt-4 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (required)" autoFocus className={field} />
          <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organisation (optional)" className={field} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title (optional)" className={field} />
          <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="Email (optional)" className={field} />
          <input type="tel" value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="Phone (optional)" className={field} />
          <textarea
            value={cNote}
            onChange={(e) => setCNote(e.target.value)}
            rows={2}
            placeholder="Note — where you met, follow-up ideas… (optional)"
            className={`${field} resize-none`}
          />
        </div>
        {err && <p className="mt-2 text-[11px] text-rose-600">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold text-navy transition hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !name.trim()}
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            <BusyLabel busy={busy && !removing} text="Saving…">{entry ? "Save changes" : "Add contact"}</BusyLabel>
          </button>
        </div>
        {entry?.entry_id && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="mt-2 w-full rounded-full border border-border py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-rose-600"
          >
            <BusyLabel busy={removing} text="Removing…">Remove from My Contacts</BusyLabel>
          </button>
        )}
      </div>
    </div>
  );
}

// Organizer-only read view: every manually saved card across all wallets,
// newest first, with owner attribution. Gated server-side to @lodestart.ai
// RSVP emails.
function TeamContactsWall({ entries }: { entries: TeamContactEntry[] | null }) {
  if (!entries) {
    return <p className="mt-6 text-center text-sm text-muted-foreground"><LoadingNote text="Loading team view…" /></p>;
  }
  if (entries.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <p className="text-sm font-semibold text-navy">No manually added contacts yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          When attendees save cards by hand — attendee-wall adds or external people — they'll show
          up here with who saved them.
        </p>
      </div>
    );
  }
  const externals = entries.filter((e) => e.is_external).length;
  return (
    <>
      <p className="text-xs text-muted-foreground">
        {entries.length} manually saved across all attendees{externals ? ` · ${externals} external` : ""} · organizer view
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {entries.map((e, i) => (
          <div key={i} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ring-2 ring-white"
                style={{ backgroundColor: avatarColor(e.full_name) }}
              >
                {initials(e.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-navy">{e.full_name}</div>
                {e.job_title && (
                  <div className="line-clamp-2 break-words text-xs leading-snug text-muted-foreground">{e.job_title}</div>
                )}
                {e.organisation && <div className="mt-0.5 truncate text-xs font-medium text-navy/60">{e.organisation}</div>}
              </div>
              {e.is_external ? (
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  External
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-navy ring-1 ring-inset ring-border">
                  Attendee
                </span>
              )}
            </div>
            {(e.contact_email || e.contact_phone) && (
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {e.contact_email && <div className="break-all">✉ {e.contact_email}</div>}
                {e.contact_phone && <div>☎ {e.contact_phone}</div>}
              </div>
            )}
            {e.note && <p className="mt-2 line-clamp-2 text-[11px] italic text-muted-foreground">“{e.note}”</p>}
            <div className="mt-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
              Saved by <span className="font-semibold text-navy/70">{e.owner_email}</span> ·{" "}
              {new Date(e.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
