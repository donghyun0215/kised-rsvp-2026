import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import mssLogo from "@/assets/logos/mss.png";
import kisedLogo from "@/assets/logos/kised.png";
import { Wordmark } from "@/components/Wordmark";
import { JUDGES } from "@/data/speakers";
import { companies } from "@/data/companies";
import { STARTUP_IMAGES, STARTUP_LOGOS } from "@/data/companyImages";
import {
  EVENT_ADDRESS,
  EVENT_DAY_SHORT,
  EVENT_MAP_URL,
  EVENT_NAME,
  EVENT_TIME,
  EVENT_VENUE,
  CREDITS,
  MEETUP_ADDRESS,
  MEETUP_DAY_SHORT,
  MEETUP_MAP_URL,
  MEETUP_TIME,
  MEETUP_VENUE,
  ONE_ON_ONE_OPEN,
} from "@/data/timeslots";

export const Route = createFileRoute("/")({
  component: Landing,
});

const ORGANIZER_EMAIL = "support@lodestart.ai";
const KISED_SITE = "https://www.kised.or.kr";
const MSS_SITE = "https://www.mss.go.kr";

// The page's one idea: every startup in the cohort turns something the
// economy throws away (waste, heat, CO₂, idle roofs) into something it buys.
// Wording condensed from each company's own one-pager tagline.
const LEDGER: Record<string, [from: string, to: string]> = {
  refeed: ["Used cooking oil", "verified aviation-fuel feedstock"],
  apexion: ["Unmeasured food waste", "biogas-ready routing data"],
  yulmix: ["Solvent-heavy synthesis", "room-temperature catalysts"],
  greenmrv: ["Biomass and CO₂", "certified carbon removal"],
  reblock: ["Ceramic waste", "permeable paving blocks"],
  mce: ["Waste plastic", "humic fertilizer"],
  gigaette: ["Waste heat", "carbon-free process heat"],
  theorigin: ["Captured CO₂", "biodegradable materials"],
  terracle: ["PET and textile waste", "high-purity monomers"],
  solarlease: ["Idle rooftops", "solar power plants"],
};

function ContactOrganizer() {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(ORGANIZER_EMAIL);
    } catch {
      // Locked-down browsers: the address is still shown below the button
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopy}
        title={ORGANIZER_EMAIL}
        className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 sm:px-4 sm:py-2 sm:text-sm"
      >
        {copied ? "Email copied" : "Contact"}
      </button>
      {copied && (
        <span className="absolute right-0 top-full z-40 mt-2 whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-medium text-navy shadow-elegant">
          {ORGANIZER_EMAIL}
        </span>
      )}
    </div>
  );
}

function Place({ venue, address, map }: { venue: string; address: string; map: string }) {
  return (
    <div className="text-sm text-navy">
      {map ? (
        <a href={map} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-primary/30 underline-offset-2 hover:text-primary">
          {venue}
        </a>
      ) : (
        <span className="font-semibold">{venue}</span>
      )}
      <span className="text-muted-foreground">, {address}</span>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      {/* HERO — the ledger */}
      <section id="top" className="bg-hero-gradient text-white">
        {/* Phones: wordmark row, then the menu row (four items never fit
            beside the wordmark at 390px); from md they share one line. */}
        <header className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <a href="#top" className="min-w-0">
            <Wordmark light />
          </a>
          <nav className="-mx-2 flex items-center gap-1 text-sm font-semibold md:mx-0 md:gap-2">
            <a href="#startups" className="rounded-full px-2 py-1.5 text-white/85 hover:text-white md:px-3 md:py-2">Startups</a>
            <a href="#about" className="rounded-full px-2 py-1.5 text-white/85 hover:text-white md:px-3 md:py-2">About</a>
            <a href="/lounge" className="rounded-full px-2 py-1.5 text-white/85 hover:text-white md:px-3 md:py-2">Lounge</a>
            <span className="ml-auto md:ml-1"><ContactOrganizer /></span>
          </nav>
        </header>

        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:pb-24 lg:pt-14">
          <div className="lg:pt-4">
            <p className="text-sm font-medium text-lichen">Climate Tech IR / Demo Day · {EVENT_DAY_SHORT} 2026</p>
            <h1 className="hero-title mt-4 text-[clamp(2.6rem,9vw,5.2rem)] font-bold leading-[0.92] text-white">
              Ten Korean startups turning waste into markets
            </h1>
            <p className="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-white/80">
              Selected through the 2026 Climate Tech Startup Challenge, Korea's government-backed programme, they come to
              Singapore to meet investors, corporates and partners. Watch them pitch, then sit down with the ones that fit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/book" search={{ day: "7" }} className="btn-hero rounded-full px-6 py-3.5 text-sm font-semibold">
                RSVP for the Demo Day
              </Link>
              {ONE_ON_ONE_OPEN && (
                <Link to="/book" search={{ day: "5" }} className="btn-outline-hero rounded-full px-6 py-3.5 text-sm font-semibold">
                  Book a 1:1 meeting
                </Link>
              )}
            </div>
          </div>

          <ol className="ledger border-t border-white/15" aria-label="What each startup transforms">
            {companies.map((c, i) => {
              const [from, to] = LEDGER[c.slug] ?? ["", c.sector];
              return (
                <li key={c.slug} style={{ "--d": `${120 + i * 70}ms` } as CSSProperties} className="ledger-row border-b border-white/15">
                  <Link
                    to="/companies/$slug"
                    params={{ slug: c.slug }}
                    className="group grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-3 sm:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)_7rem] sm:py-3.5"
                  >
                    <span className="text-[15px] text-white/60 sm:text-base">{from}</span>
                    <span className="ledger-arrow hidden h-px self-center bg-yellow sm:block" aria-hidden />
                    <span className="col-start-1 font-display text-lg font-semibold leading-snug text-white sm:col-start-auto sm:text-xl">
                      <span className="sm:hidden" aria-hidden>→ </span>
                      {to}
                    </span>
                    <span className="col-start-2 row-span-2 row-start-1 self-center text-right text-xs font-semibold text-lichen transition group-hover:text-yellow sm:col-start-auto sm:row-auto sm:text-sm">
                      {c.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* JOIN — two days. One big line per card says what matters (day + time);
          everything else is small. Details repeat on the RSVP page. */}
      <section id="rsvp" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <h2 className="max-w-xl text-3xl font-bold text-navy md:text-4xl">Two days in Singapore</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          For investors, corporates and ecosystem partners. Register for either day or both.
        </p>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
          <article className="flex flex-col bg-card p-6 sm:p-8">
            <h3 className="text-xl font-semibold text-muted-foreground">Demo Day</h3>
            <p className="mt-2 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-none tracking-tight text-navy">
              {EVENT_DAY_SHORT}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-primary">{EVENT_TIME}</p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Ten startup pitches with an ecosystem talk and panel, then a networking dinner. Registration from 14:30.
            </p>
            <div className="mt-4">
              <Place venue={EVENT_VENUE} address={EVENT_ADDRESS} map={EVENT_MAP_URL} />
            </div>
            <div className="mt-auto pt-7">
              <Link to="/book" search={{ day: "7" }} className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                RSVP for the Demo Day
              </Link>
            </div>
          </article>

          <article className="flex flex-col bg-card p-6 sm:p-8">
            <h3 className="text-xl font-semibold text-muted-foreground">1:1 business meetings</h3>
            <p className="mt-2 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-none tracking-tight text-navy">
              {MEETUP_DAY_SHORT}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-primary">{MEETUP_TIME}</p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Four 25-minute rounds with the startups you pick, the morning after the pitches.
            </p>
            <div className="mt-4">
              <Place venue={MEETUP_VENUE} address={MEETUP_ADDRESS} map={MEETUP_MAP_URL} />
            </div>
            <div className="mt-auto pt-7">
              {ONE_ON_ONE_OPEN ? (
                <Link to="/book" search={{ day: "5" }} className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Book a 1:1 meeting
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">Booking opens soon.</span>
              )}
            </div>
          </article>
        </div>
      </section>

      {/* STARTUPS */}
      <section id="startups" className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <h2 className="text-3xl font-bold text-navy md:text-4xl">The startups</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Open a profile for the full one-pager, or book a 1:1 straight away.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {companies.map((c) => (
              <article key={c.slug} className="card-startup group flex flex-col overflow-hidden rounded-xl">
                <Link to="/companies/$slug" params={{ slug: c.slug }} className="block aspect-[3/2] overflow-hidden bg-muted">
                  <img
                    src={STARTUP_IMAGES[c.slug]}
                    alt={`${c.name}: ${c.sector}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                  <Link to="/companies/$slug" params={{ slug: c.slug }} className="flex h-8 items-center" title={c.name}>
                    <img src={STARTUP_LOGOS[c.slug]} alt={c.name} className="max-h-7 max-w-[120px] object-contain object-left sm:max-h-8 sm:max-w-[150px]" />
                  </Link>
                  <div className="text-xs font-semibold text-primary">{c.sector}</div>
                  <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">{c.tagline}</p>
                  <div className="mt-auto flex flex-col gap-2 pt-2">
                    <Link
                      to="/companies/$slug"
                      params={{ slug: c.slug }}
                      className="rounded-full border border-primary px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      View profile
                    </Link>
                    {ONE_ON_ONE_OPEN && (
                      <Link
                        to="/book"
                        search={{ day: "5", company: c.slug }}
                        className="rounded-full bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        Book a 1:1 meeting
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* JUDGES — shown once confirmed in src/data/speakers.ts */}
      {JUDGES.length > 0 && (
        <section id="judges" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <h2 className="text-3xl font-bold text-navy md:text-4xl">Judges</h2>
          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
            {JUDGES.map((j) => (
              <div key={j.name}>
                <img src={j.photo} alt={j.name} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                <div className="mt-3 font-display text-lg font-bold text-navy">{j.name}</div>
                <div className="text-sm text-muted-foreground">{j.title}, {j.org}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* HOSTS — MSS and KISED only for now (client request, 10 Oct) */}
      <section id="about" className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="max-w-2xl text-2xl font-bold md:text-3xl">About the 2026 Climate Tech Startup Challenge</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-white/80">
            A government-backed Korean programme that helps early-stage climate tech startups enter global markets, get
            investment-ready and build international partnerships. The ten startups selected in Korea spend 26–29 October in
            Singapore for ecosystem sessions, SWITCH, the IR / Demo Day and 1:1 business meetings.
          </p>

          <div className="mt-12 border-t border-white/15 pt-10">
            <p className="text-sm font-medium text-lichen">Hosted by</p>
            <div className="mt-4 grid gap-8 md:grid-cols-2">
              <div>
                <a href={MSS_SITE} target="_blank" rel="noopener noreferrer" className="flex h-20 items-center justify-center rounded-xl bg-white p-3">
                  <img src={mssLogo} alt="Ministry of SMEs and Startups" className="max-h-full max-w-full object-contain" />
                </a>
                <p className="mt-4 font-display text-lg font-semibold leading-snug">Ministry of SMEs and Startups (MSS)</p>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  The Korean government ministry for small and medium-sized enterprises, startups and venture companies,
                  and the policy home of the national startup programmes.
                </p>
              </div>
              <div>
                <a href={KISED_SITE} target="_blank" rel="noopener noreferrer" className="flex h-20 items-center justify-center rounded-xl bg-white p-3">
                  <img src={kisedLogo} alt="Korea Institute of Startup & Entrepreneurship Development (KISED)" className="max-h-full max-w-full object-contain" />
                </a>
                <p className="mt-4 font-display text-lg font-semibold leading-snug">Korea Institute of Startup &amp; Entrepreneurship Development (KISED)</p>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  KISED is Korea's public agency for startups under MSS. It runs the national programmes that take founders
                  from first idea to global expansion, and selected this cohort for the 2026 Climate Tech Startup Challenge.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-10 text-sm text-muted-foreground sm:px-6">
          <Wordmark />
          <div>
            <a href={`mailto:${ORGANIZER_EMAIL}`} className="font-semibold text-primary hover:underline">{ORGANIZER_EMAIL}</a>
          </div>
          <div className="w-full border-t border-border pt-6 text-xs">
            © {EVENT_NAME}. {CREDITS}.
          </div>
        </div>
      </footer>
    </div>
  );
}
