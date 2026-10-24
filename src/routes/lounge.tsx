import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";
import { useMemo, useState, type CSSProperties } from "react";
import sphereArt from "@/assets/ci/sphere.webp";
import horizonArt from "@/assets/ci/horizon.webp";
import { CREDITS, EVENT_NAME, pitchNumber } from "@/data/timeslots";
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
      { title: "Virtual Networking Lounge — Climate-tech Startup Challenge – Global Demo Day" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: `Attendee networking lounge for the ${EVENT_NAME}.` },
    ],
  }),
});

// Night palette: one hue per RSVP interest, legible on #0c1024.
const INTEREST_HUE: Record<string, string> = {
  Investment: "#7fd3f2",
  "Distribution / partnership": "#a5b4fc",
  "Pilot / trial opportunity": "#86efac",
  "General interest": "#94a3b8",
};

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

// Night palette — kept within one family so a full wall of avatars reads
// as one surface rather than a rainbow.
const AVATAR_COLORS = [
  "#1f2a5c", "#24356e", "#2b3f80", "#1d3a5e", "#263066", "#2e3a74", "#22406b", "#2a2f6a",
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

  // Night-sky palette for the wall: one hue per interest, read against #0c1024.
  const hueOf = (label: string | null) => INTEREST_HUE[label || "General interest"] ?? "#94a3b8";
  const viewTitle = view === "mine" ? "My Contacts" : view === "team" ? "Team view" : "Attendees";
  const roster = [...companies].sort((a, b) => pitchNumber(a.slug) - pitchNumber(b.slug));
  const enter = () => email.trim() && void load(key ? { key, email: email.trim() } : { email: email.trim() });

  return (
    <div className="lounge-night min-h-screen w-full overflow-x-hidden bg-background text-navy">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center">
            <Wordmark light compact />
          </Link>
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link to="/" className="rounded-full px-3 py-2 text-[13px] font-medium text-muted-foreground transition hover:text-navy">
              Home
            </Link>
            <Link to="/" hash="startups" className="hidden rounded-full px-3 py-2 text-[13px] font-medium text-muted-foreground transition hover:text-navy sm:block">
              Startups
            </Link>
            <Link to="/book" className="rounded-full border border-border px-3.5 py-2 text-[13px] font-semibold text-navy transition hover:border-yellow hover:text-yellow">
              RSVP<span className="hidden sm:inline"> · 28 Oct</span>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {!profiles ? (
          <>
            {/* ── GATE: the home page's night sky, with tonight's line-up as a ledger ── */}
            <section className="relative isolate overflow-hidden bg-hero-gradient text-white">
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <img src={sphereArt} alt="" className="orb orb-glow absolute -top-14 left-[44%] w-[150px] opacity-90 max-lg:left-auto max-lg:right-[-30px] max-lg:w-[120px]" />
                <img src={horizonArt} alt="" className="orb orb-slow orb-glow absolute -bottom-[1010px] left-1/2 w-[1700px] max-w-none -translate-x-1/2 opacity-70 max-lg:-bottom-[560px] max-lg:w-[960px]" />
              </div>
              <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-14 px-4 pb-28 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20 lg:pb-40 lg:pt-24">
                <div>
                  <p className="hero-in text-[13px] font-semibold text-yellow" style={{ "--i": 0 } as CSSProperties}>
                    Virtual Networking Lounge · Wed 28 Oct
                  </p>
                  <h1 className="hero-in mt-5 font-display text-[clamp(46px,6.4vw,88px)] font-bold leading-[0.96] tracking-[-0.035em]" style={{ "--i": 1 } as CSSProperties}>
                    Who's in
                    <br />
                    the room.
                  </h1>
                  <p className="hero-in mt-6 max-w-md text-[17px] leading-relaxed text-white/70" style={{ "--i": 2 } as CSSProperties}>
                    Investors, corporates and partners meeting Korea's climate-tech national team. Find the people you
                    came for, save the ones you meet, and follow up after.
                  </p>

                  <form
                    className="hero-in mt-12 max-w-md"
                    style={{ "--i": 3 } as CSSProperties}
                    onSubmit={(e) => { e.preventDefault(); enter(); }}
                  >
                    <label htmlFor="lounge-email" className="text-[13px] text-white/60">
                      {key ? "You're at the venue. Enter your RSVP email to check in." : "Enter with the email you RSVP'd with"}
                    </label>
                    <div className="mt-2 flex items-end gap-4 border-b border-white/25 transition-colors focus-within:border-yellow">
                      <input
                        id="lounge-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="min-w-0 flex-1 bg-transparent py-3 font-display text-[22px] font-medium tracking-tight text-white outline-none placeholder:text-white/25"
                      />
                      <button
                        type="submit"
                        disabled={!email.trim() || loading}
                        className="group mb-2.5 inline-flex shrink-0 items-center gap-2 rounded-full bg-yellow px-5 py-2.5 text-sm font-semibold text-yellow-foreground transition hover:brightness-110 disabled:opacity-40"
                      >
                        <BusyLabel busy={loading} text="Checking…">
                          Enter <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                        </BusyLabel>
                      </button>
                    </div>
                    {gateError ? (
                      <p role="alert" className="mt-3 text-[13px] leading-relaxed text-rose-300">
                        {gateError}{" "}
                        <a href="/book" className="font-semibold text-white underline underline-offset-4">RSVP here</a>
                      </p>
                    ) : (
                      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/45">
                        <LockGlyph className="h-3 w-3 shrink-0" /> RSVP attendees only
                      </p>
                    )}
                  </form>
                </div>

                <div className="hero-in self-end" style={{ "--i": 2 } as CSSProperties}>
                  <p className="text-[13px] text-white/50">In the room · pitch order</p>
                  <ol className="mt-3 border-t border-white/12">
                    {roster.map((c, i) => (
                      <li
                        key={c.slug}
                        style={{ "--d": `${200 + i * 55}ms` } as CSSProperties}
                        className="ledger-row grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-4 border-b border-white/12 py-[11px]"
                      >
                        <span className="font-display text-xs tabular-nums text-white/35">{String(pitchNumber(c.slug)).padStart(2, "0")}</span>
                        <span className="truncate font-display text-[17px] font-semibold tracking-tight">{c.name}</span>
                        <span className="max-w-[13rem] truncate text-right text-[13px] text-white/50 max-sm:hidden">{c.sector}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>

            {/* ── NOTICE: three plain statements, not a card ── */}
            <section className="border-t border-border">
              <div className="mx-auto grid max-w-7xl gap-x-12 gap-y-8 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1fr_1fr_1fr]">
                <h2 className="font-display text-xl font-semibold tracking-tight text-navy">About this lounge</h2>
                {[
                  ["Attendees only", "Strictly private, open only to verified attendees of the Demo Day."],
                  ["No contact details", "Names, organisations, roles and interests only. Emails and phone numbers are never shown."],
                  ["Your card, your call", "Add or update your link inside the lounge, or ask us to take it down."],
                ].map(([t, d]) => (
                  <div key={t}>
                    <h3 className="text-[15px] font-semibold text-navy">{t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                  </div>
                ))}
              </div>
            </section>

            <footer className="border-t border-border">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
                <Wordmark light />
                <span>Global Demo Day · Wed 28 Oct 2026 · Singapore</span>
                <a href="mailto:support@lodestart.ai" className="text-yellow hover:underline">support@lodestart.ai</a>
              </div>
            </footer>
          </>
        ) : (
          <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
            {/* ── title + views ── */}
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <div>
                <p className="text-[13px] font-semibold text-yellow">Virtual Networking Lounge</p>
                <h1 className="mt-2 font-display text-[clamp(36px,4.6vw,60px)] font-bold leading-none tracking-[-0.03em] text-navy">
                  {viewTitle}{" "}
                  <span className="font-light tabular-nums text-navy/30">
                    {view === "all" ? profiles.length : view === "mine" ? wallet?.length ?? "" : teamEntries?.length ?? ""}
                  </span>
                </h1>
              </div>
              {grantedEmail && (
                <nav className="flex gap-6 border-b border-border" aria-label="Lounge views">
                  {(
                    [
                      ["all", "Everyone"],
                      ["mine", `My Contacts${wallet?.length ? ` · ${wallet.length}` : ""}`],
                      ...(isTeam ? [["team", "Team view"]] : []),
                    ] as [typeof view, string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      aria-current={view === v ? "page" : undefined}
                      onClick={() => {
                        setView(v);
                        if (v === "mine" && grantedEmail) void refreshWallet(grantedEmail);
                        if (v === "team" && grantedEmail) void refreshTeam(grantedEmail);
                      }}
                      className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition ${
                        view === v ? "border-yellow text-navy" : "border-transparent text-muted-foreground hover:text-navy"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              )}
            </div>

            {view === "team" && isTeam ? (
              <div className="mt-10"><TeamContactsWall entries={teamEntries} /></div>
            ) : view === "mine" && grantedEmail ? (
              <div className="mt-10">
                <MyContactsWall
                  wallet={wallet}
                  ownerEmail={grantedEmail}
                  onSelect={(e) => (e.rsvp_id ? setWalletSelected(e) : setCustomEditor(e))}
                  onAddCustom={() => setCustomEditor("new")}
                  onBrowseAll={() => setView("all")}
                />
              </div>
            ) : (
              <>
                {/* ── who's here: one stacked bar, segments double as filters ── */}
                <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
                  <div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary" role="group" aria-label="Filter by interest">
                      {groups.map(([label, n]) => (
                        <button
                          key={label}
                          type="button"
                          title={`${label} · ${n}`}
                          onClick={() => setInterest(interest === label ? null : label)}
                          className="h-full transition-opacity first:rounded-l-full last:rounded-r-full"
                          style={{ width: `${(n / profiles.length) * 100}%`, background: hueOf(label), opacity: interest && interest !== label ? 0.25 : 1 }}
                        />
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                      {groups.map(([label, n]) => (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={interest === label}
                          onClick={() => setInterest(interest === label ? null : label)}
                          className={`inline-flex items-center gap-2 text-[13px] transition ${
                            interest && interest !== label ? "text-muted-foreground/60" : "text-navy"
                          } hover:text-navy`}
                        >
                          <i className="h-2 w-2 rounded-full" style={{ background: hueOf(label) }} />
                          {label}
                          <span className="tabular-nums text-muted-foreground">{n}</span>
                        </button>
                      ))}
                      <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground hover:text-navy">
                        <input type="checkbox" checked={linkedOnly} onChange={(e) => setLinkedOnly(e.target.checked)} className="h-3.5 w-3.5 accent-[color:var(--yellow)]" />
                        Has a link <span className="tabular-nums">{linkedCount}</span>
                      </label>
                      {filtersOn && (
                        <button type="button" onClick={clearFilters} className="text-[13px] font-semibold text-yellow hover:underline">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-b border-border pb-2 transition-colors focus-within:border-yellow">
                    <svg className="h-4 w-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3.5-3.5" />
                    </svg>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search name, company, role"
                      aria-label="Search attendees"
                      className="min-w-0 flex-1 bg-transparent py-1.5 text-base text-navy outline-none placeholder:text-muted-foreground sm:text-[15px]"
                    />
                  </div>
                </div>

                {/* ── ledger ── */}
                {shown.length === 0 ? (
                  <div className="mt-10 border-y border-border py-16 text-center">
                    <p className="font-display text-lg font-semibold text-navy">No one matches that</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try another name or company, or clear the filters.</p>
                    <button type="button" onClick={clearFilters} className="mt-5 text-sm font-semibold text-yellow hover:underline">
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <ul className="mt-8 border-t border-border">
                    {shown.map((p, i) => (
                      <li key={p.id} className="ledger-row" style={{ "--d": `${Math.min(i, 16) * 28}ms` } as CSSProperties}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelected(p)}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(p))}
                          className="group grid cursor-pointer grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border px-1 py-4 outline-none transition hover:bg-white/[0.03] focus-visible:bg-white/[0.05] md:grid-cols-[44px_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.85fr)_7.5rem] md:gap-x-6"
                        >
                          <span
                            className="row-span-2 flex h-10 w-10 items-center justify-center rounded-full font-display text-[13px] font-semibold text-navy md:row-span-1 md:h-11 md:w-11"
                            style={{ background: `color-mix(in srgb, ${hueOf(p.primary_interest)} 16%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${hueOf(p.primary_interest)} 45%, transparent)` }}
                          >
                            {initials(p.full_name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[16px] font-semibold text-navy transition-colors group-hover:text-yellow">{p.full_name}</span>
                            <span className="block truncate text-[13px] text-muted-foreground">{p.job_title}</span>
                          </span>
                          <span className="col-start-2 truncate text-[14px] text-navy/80 md:col-start-auto">{p.organisation}</span>
                          <span className="hidden items-center gap-2 text-[13px] text-muted-foreground md:inline-flex">
                            <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: hueOf(p.primary_interest) }} />
                            <span className="truncate">{p.primary_interest || "General interest"}</span>
                          </span>
                          <span className="col-start-3 row-span-2 row-start-1 flex justify-end md:col-start-auto md:row-span-1 md:row-start-auto">
                            {p.contact_url ? (
                              <a
                                href={absUrl(p.contact_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold text-navy transition hover:border-yellow hover:text-yellow"
                              >
                                {contactLabel(p.contact_url)} <span aria-hidden>↗</span>
                              </a>
                            ) : (
                              <span aria-hidden className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-yellow">→</span>
                            )}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* ── my card ── */}
                <div className="mt-12 grid gap-6 border-t border-border pt-8 md:grid-cols-[1fr_auto] md:items-start">
                  <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                    Visible to event attendees only. Emails are shared only between confirmed 1:1 meeting partners, inside
                    My Contacts. To update or remove your card, contact{" "}
                    <a href="mailto:support@lodestart.ai" className="text-yellow hover:underline">support@lodestart.ai</a>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactForm((v) => !v);
                      if (grantedEmail && !cEmail) setCEmail(grantedEmail);
                    }}
                    className="inline-flex items-center gap-2 justify-self-start rounded-full border border-border px-4 py-2.5 text-[13px] font-semibold text-navy transition hover:border-yellow hover:text-yellow"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    {showContactForm ? "Close" : "Add or update my link"}
                  </button>
                  {showContactForm && (
                    <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2 md:max-w-lg">
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        Add a LinkedIn profile, company page or open-chat link so others can reach you. No re-registration needed.
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="Email you RSVP'd with" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base sm:text-sm" />
                        <input value={cUrl} onChange={(e) => setCUrl(e.target.value)} placeholder="linkedin.com/in/yourname" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base sm:text-sm" />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <button type="button" disabled={cBusy || !cEmail.trim()} onClick={() => void submitContact()} className="rounded-full bg-yellow px-5 py-2 text-[13px] font-semibold text-yellow-foreground transition hover:brightness-110 disabled:opacity-50">
                          <BusyLabel busy={cBusy} text="Saving…">Save</BusyLabel>
                        </button>
                        {cMsg && <p className={`text-[13px] ${cMsg.ok ? "text-emerald-300" : "text-rose-300"}`}>{cMsg.text}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <footer className="mt-16 text-center text-xs text-muted-foreground">{CREDITS}</footer>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelected(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={selected.full_name}
              className="sheet-rise relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-border bg-card shadow-2xl sm:rounded-[28px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative isolate overflow-hidden px-7 pb-7 pt-10">
                <img src={sphereArt} alt="" aria-hidden className="pointer-events-none absolute -right-16 -top-20 -z-10 w-56 opacity-50" />
                <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:text-navy">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full font-display text-lg font-semibold text-navy"
                  style={{ background: `color-mix(in srgb, ${hueOf(selected.primary_interest)} 18%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${hueOf(selected.primary_interest)} 50%, transparent)` }}
                >
                  {initials(selected.full_name)}
                </span>
                <h2 className="mt-5 font-display text-[28px] font-bold leading-tight tracking-tight text-navy">{selected.full_name}</h2>
                <p className="mt-1 text-[15px] text-muted-foreground">{selected.job_title}</p>
                <p className="mt-0.5 text-[15px] text-navy/85">{selected.organisation}</p>
                <p className="mt-4 inline-flex items-center gap-2 text-[13px] text-navy">
                  <i className="h-2 w-2 rounded-full" style={{ background: hueOf(selected.primary_interest) }} />
                  {selected.primary_interest || "General interest"}
                </p>
              </div>
              <div className="grid gap-2 border-t border-border px-7 py-5">
                {selected.contact_url ? (
                  <a href={absUrl(selected.contact_url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-yellow py-3 text-sm font-semibold text-yellow-foreground transition hover:brightness-110">
                    <LinkIcon className="h-4 w-4" /> Connect on {contactLabel(selected.contact_url)}
                  </a>
                ) : (
                  <p className="py-2 text-center text-[13px] text-muted-foreground">No contact link added yet</p>
                )}
                {grantedEmail && (
                  <button type="button" disabled={addedIds.has(selected.id)} onClick={() => setAddTarget(selected)} className="rounded-full border border-border py-3 text-sm font-semibold text-navy transition hover:border-yellow hover:text-yellow disabled:opacity-60 disabled:hover:border-border disabled:hover:text-navy">
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
                ? "bg-yellow text-yellow-foreground hover:brightness-110"
                : "bg-yellow text-yellow-foreground hover:brightness-110"
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ring-1 ring-white/15"
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
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-300/25">
                  1:1 meeting
                </span>
              ) : w.rsvp_id ? (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-navy ring-1 ring-inset ring-border">
                  Saved
                </span>
              ) : (
                <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-300/25">
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 shadow-[0_-12px_32px_rgba(0,0,0,0.4)] backdrop-blur sm:p-4">
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
            <span className="mt-2 inline-block rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-300/25">
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
              className="flex w-full items-center justify-center gap-2 rounded-full bg-yellow py-2.5 text-sm font-semibold text-yellow-foreground transition hover:brightness-110"
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
              className="w-full rounded-full border border-border py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-rose-300"
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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
        {err && <p className="mt-2 text-[11px] text-rose-300">{err}</p>}
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
            className="mt-2 w-full rounded-full border border-border py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-rose-300"
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ring-1 ring-white/15"
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
                <span className="shrink-0 rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-300/25">
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
