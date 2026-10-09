import { createFileRoute } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";
import { useEffect, useState } from "react";
import { companies, MEETUP_COMPANIES } from "@/data/companies";
import { EVENT_VENUE, MEETUP_DAY_SHORT, MEETUP_TIME, MEETUP_VENUE, PROGRAM, TIMESLOTS, isSlotOffered, EVENT_NAME } from "@/data/timeslots";
import { fetchMeetingRoster, type RosterEntry } from "@/lib/booking.server";
import { LoadingNote } from "@/components/Spinner";
import { absUrl } from "@/lib/url";

// Unlisted internal page for programme stakeholders — intentionally not linked
// from any navbar/footer and marked noindex. Share by URL only.
export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
  head: () => ({
    meta: [
      { title: `Programme Schedule — ${EVENT_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Detailed day-by-day itinerary for participating startups and partners.",
      },
    ],
  }),
});

interface ScheduleItem {
  time?: string; // e.g. "10:00 – 12:30"
  title: string;
  venue?: string;
  note?: string;
  highlight?: boolean; // key session — filled chip
}

interface ScheduleDay {
  date: string; // "8/26"
  dow: string; // "Wed"
  theme: string; // main theme
  headcount?: string;
  transport?: string;
  items: ScheduleItem[];
  free?: boolean; // Free time
  joint?: boolean; // joint day
}

// Source: "Lodestart Internship" sheet, Schedule tab (9 Oct). Programme runs
// 26–30 Oct; only the two public days are confirmed so far. Add the other
// days here once the itinerary is final.
const DAYS: ScheduleDay[] = [
  {
    date: "10/28", dow: "Wed", theme: "Demo Day",
    joint: true,
    items: PROGRAM.filter((p) => p.id !== "meetups").map((p) => ({ time: p.time, title: p.title, venue: EVENT_VENUE, highlight: true })),
  },
  {
    date: "10/29", dow: "Thu", theme: "1:1 Business Meetings",
    items: TIMESLOTS.map((t) => ({ time: t.time, title: `1:1 meetings · ${t.label}`, venue: MEETUP_VENUE, highlight: true })),
  },
];

const TRACK_META = [
  {
    id: "t1",
    label: "Cohort",
    title: EVENT_NAME,
    companies: companies.map((c) => c.name).join(" · "),
    period: "Mon 26 Oct – Fri 30 Oct",
    days: DAYS,
    note: "Only the public days are shown. Venues and the full itinerary are still to be confirmed." as string | null,
  },
];

function SchedulePage() {
  const [trackId, setTrackId] = useState<"t1">("t1");
  const [selectedDay, setSelectedDay] = useState<ScheduleDay | null>(null);
  const [view, setView] = useState<"itinerary" | "roster">("itinerary");
  const track = TRACK_META.find((t) => t.id === trackId)!;

  return (
    <div className="min-h-screen bg-secondary/40">
      {/* Nav — logo only, deliberately no site links (unlisted page) */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Wordmark />
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {EVENT_NAME}
            </div>
            <div className="text-sm font-bold text-navy">Programme Schedule</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 pt-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-navy md:text-3xl">Programme Schedule</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Internal schedule for participating startups and partners · latest version, subject to change on the day
          </p>
        </div>

        {/* View menu */}
        <div className="mx-auto mt-6 flex w-fit rounded-full border border-border bg-card p-1 shadow-sm">
          {(
            [
              { id: "itinerary", label: "Itinerary" },
              { id: "roster", label: "1:1 Meeting Roster" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                view === v.id ? "bg-primary text-primary-foreground shadow-sm" : "text-navy/70 hover:text-navy"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === "roster" ? (
          <MeetingRoster />
        ) : (
          <>
        {/* Programme card (single cohort) */}
        <div className="mt-6 grid grid-cols-1 gap-2">
          {TRACK_META.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTrackId(t.id as "t1")}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                trackId === t.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-navy hover:border-primary/40"
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-widest ${trackId === t.id ? "text-primary-foreground/80" : "text-primary"}`}>
                {t.label}
              </div>
              <div className="mt-0.5 text-sm font-bold leading-snug">{t.title}</div>
              <div className={`mt-0.5 truncate text-[11px] ${trackId === t.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {t.period}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm">
          <span className="font-semibold text-navy">{track.title}</span> · {track.companies}
          {track.note && <span className="block mt-1">{track.note}</span>}
        </div>

        {/* Desktop: at-a-glance grid (whole track on one screen) */}
        <div className="mt-6 hidden gap-3 lg:grid lg:grid-cols-2">
          {track.days.map((d) => (
            <button
              type="button"
              onClick={() => setSelectedDay(d)}
              key={`${track.id}-g-${d.date}`}
              className={`flex flex-col overflow-hidden rounded-xl border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 cursor-pointer ${
                d.free
                  ? "border-dashed border-border bg-card/50"
                  : d.joint
                    ? "border-primary/50 bg-card ring-1 ring-primary/20"
                    : "border-border bg-card"
              }`}
            >
              <div className={`px-3 py-2 ${d.joint ? "bg-primary/10" : d.free ? "" : "bg-secondary/60"}`}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-navy">
                    {d.date} <span className="text-[10px] font-semibold text-muted-foreground">({d.dow})</span>
                  </span>
                </div>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold leading-none ${
                  d.joint ? "bg-primary text-primary-foreground" : d.free ? "bg-muted text-muted-foreground" : "bg-navy/90 text-white"
                }`}>
                  {d.theme}
                </span>
              </div>
              {d.free ? (
                <div className="px-3 py-3 text-[11px] text-muted-foreground">Free time</div>
              ) : (
                <div className="flex-1 space-y-1.5 px-3 py-2">
                  {d.items.map((it, i) => (
                    <div key={i} className="text-[11px] leading-snug">
                      {it.time && <span className="mr-1 font-bold text-primary">{it.time}</span>}
                      <span className={it.highlight ? "font-bold text-navy" : "text-navy/80"}>{it.title}</span>
                      {it.highlight && it.venue && (
                        <span className="block truncate text-[10px] font-semibold text-green-700" title={it.venue}>
                          📍 {it.venue}
                        </span>
                      )}
                      {it.note && <span className="block text-[10px] text-muted-foreground">{it.note}</span>}
                    </div>
                  ))}
                  {d.headcount && (
                    <div className="pt-1 text-[9px] text-muted-foreground">{d.headcount}</div>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Mobile: day-by-day timeline */}
        <div className="mt-6 space-y-4 lg:hidden">
          {track.days.map((d) => (
            <section
              key={`${track.id}-${d.date}`}
              className={`overflow-hidden rounded-2xl border shadow-sm ${
                d.free
                  ? "border-dashed border-border bg-card/60"
                  : d.joint
                    ? "border-primary/40 bg-card"
                    : "border-border bg-card"
              }`}
            >
              <header
                className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${
                  d.joint ? "bg-primary/10" : d.free ? "" : "bg-secondary/60"
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-navy">
                    {d.date} <span className="text-sm font-semibold text-muted-foreground">({d.dow})</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    d.joint ? "bg-primary text-primary-foreground" : d.free ? "bg-muted text-muted-foreground" : "bg-navy/90 text-white"
                  }`}>
                    {d.theme}
                  </span>
                </div>
                {d.headcount && (
                  <span className="text-[11px] font-medium text-muted-foreground">{d.headcount}</span>
                )}
              </header>

              {d.free ? (
                <div className="px-5 py-4 text-sm text-muted-foreground">Free time</div>
              ) : (
                <div className="divide-y divide-border/70">
                  {d.items.map((it, i) => (
                    <div key={i} className="flex gap-3 px-5 py-2.5">
                      <span className="w-24 shrink-0 pt-0.5 text-xs font-bold text-primary">
                        {it.time ?? ""}
                      </span>
                      <span className="min-w-0">
                        <span className={`text-sm ${it.highlight ? "font-bold text-navy" : "font-medium text-navy/90"}`}>
                          {it.title}
                        </span>
                        {it.venue && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.venue)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-0.5 block text-xs underline underline-offset-2 ${it.highlight ? "font-semibold text-green-700" : "text-muted-foreground"}`}
                          >
                            📍 {it.venue}
                          </a>
                        )}
                        {it.note && <span className="mt-0.5 block text-xs text-muted-foreground">{it.note}</span>}
                      </span>
                    </div>
                  ))}
                  {d.transport && (
                    <div className="bg-secondary/40 px-5 py-2 text-[11px] text-muted-foreground">
                      Transport: {d.transport}
                    </div>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Hosted by the Korea Institute of Startup &amp; Entrepreneurship Development (KISED) · Organized by LodestarT
        </footer>

          </>
        )}

        {selectedDay && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm"
            onClick={() => setSelectedDay(null)}
          >
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <header className={`flex items-start justify-between gap-3 px-6 py-4 ${selectedDay.joint ? "bg-primary/10" : "bg-secondary/60"}`}>
                <div>
                  <div className="text-lg font-bold text-navy">
                    {selectedDay.date} ({selectedDay.dow})
                    <span className={`ml-2 rounded-full px-2.5 py-0.5 align-middle text-[11px] font-semibold ${
                      selectedDay.joint ? "bg-primary text-primary-foreground" : "bg-navy/90 text-white"
                    }`}>
                      {selectedDay.theme}
                    </span>
                  </div>
                  {selectedDay.headcount && (
                    <div className="mt-1 text-xs text-muted-foreground">{selectedDay.headcount}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-navy"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </header>
              <div className="divide-y divide-border/70 px-6">
                {selectedDay.free ? (
                  <div className="py-5 text-sm text-muted-foreground">Free time</div>
                ) : (
                  selectedDay.items.map((it, i) => (
                    <div key={i} className="flex gap-3 py-3">
                      <span className="w-24 shrink-0 pt-0.5 text-xs font-bold text-primary">{it.time ?? ""}</span>
                      <span className="min-w-0">
                        <span className={`text-sm ${it.highlight ? "font-bold text-navy" : "font-medium text-navy/90"}`}>
                          {it.title}
                        </span>
                        {it.venue && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.venue)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-0.5 block text-xs underline underline-offset-2 transition hover:text-primary ${
                              it.highlight ? "font-semibold text-green-700" : "text-muted-foreground"
                            }`}
                          >
                            📍 {it.venue}
                          </a>
                        )}
                        {it.note && <span className="mt-0.5 block text-xs text-muted-foreground">{it.note}</span>}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {selectedDay.transport && (
                <div className="bg-secondary/40 px-6 py-2.5 text-xs text-muted-foreground">Transport: {selectedDay.transport}</div>
              )}
              <div className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


function LinkGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

function rosterInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rosterContactLabel(url: string): string {
  if (/linkedin\.com/i.test(url)) return "LinkedIn";
  if (/open\.kakao\.com/i.test(url)) return "KakaoTalk";
  return "Website";
}

// ── 1:1 Meeting Roster — who each startup meets, round by round ──
const INTEREST_CHIP: Record<string, string> = {
  Investment: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Distribution / partnership": "bg-sky-50 text-sky-700 ring-sky-600/20",
  "Pilot / trial opportunity": "bg-violet-50 text-violet-700 ring-violet-600/20",
  "General interest": "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const ROSTER_PW_KEY = "kised-roster-pw";

function MeetingRoster() {
  const [entries, setEntries] = useState<RosterEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<{ entry: RosterEntry; company: string; when: string } | null>(null);
  // The roster (with contacts) is password-gated; the password is remembered
  // on this device so it's asked once, not on every visit.
  const [pw, setPw] = useState<string | null>(null);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [checking, setChecking] = useState(false);

  const load = async (password: string) => {
    setError(false);
    setChecking(true);
    try {
      const res = await fetchMeetingRoster({ data: { password } });
      if (!res.ok) {
        setPw(null);
        setPwError(true);
        try { localStorage.removeItem(ROSTER_PW_KEY); } catch { /* ignore */ }
        return;
      }
      setPw(password);
      setPwError(false);
      try { localStorage.setItem(ROSTER_PW_KEY, password); } catch { /* ignore */ }
      setEntries(res.entries);
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(ROSTER_PW_KEY); } catch { /* ignore */ }
    if (saved) void load(saved);
  }, []);

  if (!pw) {
    return (
      <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="text-2xl">🔒</div>
        <div className="mt-2 text-base font-bold text-navy">1:1 Meeting Roster</div>
        <p className="mt-1 text-xs text-muted-foreground">
          For participating startups, interns and organisers. Enter the roster password to see meeting partners and their contact details.
        </p>
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (pwInput.trim()) void load(pwInput);
          }}
        >
          <input
            type="password"
            value={pwInput}
            onChange={(ev) => { setPwInput(ev.target.value); setPwError(false); }}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
          />
          {pwError && <p className="text-xs text-red-600">Wrong password. Please try again.</p>}
          {error && <p className="text-xs text-red-600">Couldn't load the roster. Please try again.</p>}
          <button
            type="submit"
            disabled={checking}
            className="rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {checking ? "Checking…" : "View roster"}
          </button>
        </form>
      </div>
    );
  }

  const byKey = new Map<string, RosterEntry>();
  for (const e of entries ?? []) byKey.set(`${e.company_id}:${e.timeslot_id}`, e);


  const ordered = [...MEETUP_COMPANIES].sort((a, b) => (a.track === b.track ? a.name.localeCompare(b.name) : a.track.localeCompare(b.track)));

  const Line = ({ e, company, when }: { e: RosterEntry | undefined; company: string; when: string }) =>
    e ? (
      <button
        type="button"
        onClick={() => setSelected({ entry: e, company, when })}
        className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-1 py-0.5 text-left transition hover:bg-primary/5"
      >
        <span className="truncate text-[13px] font-semibold text-navy group-hover:text-primary">{e.full_name}</span>
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {e.job_title} @ {e.organisation}
        </span>
        {e.primary_interest && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${
              INTEREST_CHIP[e.primary_interest] ?? "bg-secondary text-navy ring-border"
            }`}
          >
            {e.primary_interest}
          </span>
        )}
        {e.contact_url && <LinkGlyph className="h-3 w-3 shrink-0 text-primary" />}
        <span className="w-full truncate text-[11px] text-muted-foreground">
          {e.email}
          {e.phone ? ` · ${e.phone}` : ""}
        </span>
      </button>
    ) : (
      <span className="text-xs text-muted-foreground/60">— open</span>
    );

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-navy">1:1 Meeting Roster</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Who each startup is meeting, round by round
            {entries && <> · {entries.length} confirmed</>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => pw && void load(pw)}
          className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-navy transition hover:bg-muted"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
          Couldn't load the roster. Please refresh.
        </div>
      ) : !entries ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <LoadingNote text="Loading the roster…" />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">{MEETUP_DAY_SHORT}</span>
            <span className="text-sm font-semibold text-navy">1:1 Business Meetings</span>
            <span className="text-xs text-muted-foreground">{MEETUP_VENUE} · {MEETUP_TIME}</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {ordered.map((c) => {
              return (
                <section key={c.slug} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <header className={`flex items-center justify-between gap-3 border-b border-border px-5 py-3 bg-primary/5`}>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-navy">{c.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{c.sector}</div>
                    </div>
                  </header>
                  <ul className="divide-y divide-border/70">
                    {TIMESLOTS.filter((t) => isSlotOffered(c.slug, t.id)).map((t) => (
                      <li key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                        <div className="w-24 shrink-0">
                          <div className="text-[11px] font-bold text-primary">{t.label}</div>
                          <div className="text-[10px] tabular-nums text-muted-foreground">{t.time}</div>
                        </div>
                        <Line e={byKey.get(`${c.slug}:${t.id}`)} company={c.name} when={`${t.label} · ${t.time} · ${MEETUP_DAY_SHORT}`} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
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
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground ring-4 ring-background">
                {rosterInitials(selected.entry.full_name)}
              </div>
              <div className="mt-3 text-lg font-bold text-navy">{selected.entry.full_name}</div>
              {selected.entry.primary_interest && (
                <span
                  className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ${
                    INTEREST_CHIP[selected.entry.primary_interest] ?? "bg-background text-navy ring-border"
                  }`}
                >
                  {selected.entry.primary_interest}
                </span>
              )}
            </div>
            <div className="space-y-3 px-6 py-5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Organisation</div>
                <div className="mt-0.5 break-words text-sm font-semibold text-navy">{selected.entry.organisation}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title</div>
                <div className="mt-0.5 break-words text-sm text-navy/90">{selected.entry.job_title}</div>
              </div>
              <div className="rounded-lg bg-primary/5 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Meeting</div>
                <div className="mt-0.5 text-sm font-semibold text-navy">{selected.company}</div>
                <div className="text-xs text-muted-foreground">{selected.when}</div>
              </div>
              <div className="rounded-lg bg-secondary/60 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</div>
                <a href={`mailto:${selected.entry.email}`} className="mt-0.5 block break-all text-sm font-semibold text-primary hover:underline">
                  {selected.entry.email}
                </a>
                {selected.entry.phone ? (
                  <a href={`tel:${selected.entry.phone.replace(/[^+\d]/g, "")}`} className="block text-sm text-primary hover:underline">
                    {selected.entry.phone}
                  </a>
                ) : null}
              </div>
              {selected.entry.contact_url ? (
                <a
                  href={absUrl(selected.entry.contact_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-navy py-2.5 text-sm font-semibold text-white transition hover:bg-navy/85"
                >
                  <LinkGlyph className="h-4 w-4" />
                  Open {rosterContactLabel(selected.entry.contact_url)} profile
                </a>
              ) : (
                <p className="rounded-lg bg-secondary/60 px-3 py-2 text-center text-xs text-muted-foreground">
                  No profile link added
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
