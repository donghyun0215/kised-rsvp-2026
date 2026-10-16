import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";
import sphereArt from "@/assets/ci/sphere.webp";
import { useState, type CSSProperties } from "react";
import { companies, getCompanyBySlug, type Company } from "@/data/companies";
import { HIGHLIGHTS } from "@/data/profileHighlights";
import { useShow } from "@/lib/useShow";
import { EVENT_DATE, EVENT_VENUE, ONE_ON_ONE_OPEN, MEETUP_DATE, EVENT_NAME, CREDITS } from "@/data/timeslots";
import { COMPANY_CI, STARTUP_IMAGES, STARTUP_LOGOS, TEAM_PHOTOS } from "@/data/companyImages";

export const Route = createFileRoute("/companies/$slug")({
  component: CompanyOnePager,
  loader: ({ params }) => {
    const company = getCompanyBySlug(params.slug);
    if (!company) throw notFound();
    return company;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — ${EVENT_NAME}` },
          { name: "description", content: loaderData.tagline },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div>
        <h1 className="text-3xl font-bold text-navy">Company not found</h1>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          ← Back to all startups
        </Link>
      </div>
    </div>
  ),
});

// A climate-tech profile reads as one transformation: what goes in, what
// comes out, the numbers that prove it, and who to meet. Order: hero with
// the from → into statement through the CI sphere; the story (problem →
// fix) beside a sticky "climate facts" label; the detail in an accordion;
// proof; the person you'll meet and what they're looking for; next startup.

// "Label: text" lines get their label set in bold.
function lead(s: string): [string | null, string] {
  const m = s.match(/^([^:]{2,42}):\s+(.+)$/);
  return m ? [m[1], m[2]] : [null, s];
}

function Points({ items, tone = "ink" }: { items: string[]; tone?: "ink" | "light" }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => {
        const [l, t] = lead(item);
        return (
          <li key={i} className={`flex gap-3 text-[15px] leading-relaxed ${tone === "light" ? "text-white/80" : "text-navy/80"}`}>
            <span aria-hidden className={`mt-[0.55rem] h-2 w-2 shrink-0 rounded-full ${tone === "light" ? "bg-yellow" : "bg-primary"}`} />
            <span>{l && <b className={tone === "light" ? "font-semibold text-white" : "font-semibold text-navy"}>{l}: </b>}{t}</span>
          </li>
        );
      })}
    </ul>
  );
}

// The eco-label: numbers on a printed label, like a carbon or energy label.
function FactsLabel({ company, bookSearch, bookLabel }: { company: Company; bookSearch: Record<string, string>; bookLabel: string }) {
  const hl = HIGHLIGHTS[company.slug];
  if (!hl) return null;
  return (
    <aside data-show className="facts-label" aria-label={`${company.name} in numbers`}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-[1.75rem] font-extrabold leading-none text-navy">Climate facts</h2>
        <img src={sphereArt} alt="" className="facts-orb h-9 w-9" />
      </div>
      <p className="mt-1.5 text-xs text-navy/60">{company.name} · {company.stage}</p>
      <div className="mt-3 h-2 bg-navy" />
      <dl>
        {hl.facts.map(([v, l], i) => (
          <div key={l} className="facts-row" style={{ "--i": i } as CSSProperties}>
            <dd className="font-display text-[1.6rem] font-extrabold leading-none tracking-tight text-navy">{v}</dd>
            <dt className="text-[13px] leading-snug text-navy/75">{l}</dt>
          </div>
        ))}
      </dl>
      <div className="h-1 bg-navy" />
      <p className="mt-2 text-[11px] leading-snug text-navy/55">From the company's one-pager, October 2026.</p>
      <Link to="/book" search={bookSearch} className="mt-5 flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">
        {bookLabel}
      </Link>
    </aside>
  );
}

function Accordion({ items }: { items: { title: string; body: string[] }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-navy/10 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.title}>
            <h3>
              <button
                type="button"
                aria-expanded={on}
                aria-controls={`acc-${i}`}
                onClick={() => setOpen(on ? -1 : i)}
                className="acc-btn flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-display text-lg font-bold text-navy md:text-xl">{it.title}</span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-navy/50">{it.body.length} points</span>
                  <span aria-hidden className={`acc-icon ${on ? "is-on" : ""}`} />
                </span>
              </button>
            </h3>
            <div id={`acc-${i}`} role="region" className={`acc-panel ${on ? "is-on" : ""}`}>
              <div className="min-h-0 overflow-hidden">
                <div className="px-6 pb-6"><Points items={it.body} /></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function initials(name: string) {
  return name.replace(/\(.*?\)/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
}

function CompanyOnePager() {
  const company = Route.useLoaderData();
  return <Profile key={company.slug} company={company} />;
}

function Profile({ company }: { company: Company }) {
  useShow([company.slug]);
  const logo = STARTUP_LOGOS[company.slug];
  const photo = STARTUP_IMAGES[company.slug];
  const ci = COMPANY_CI[company.slug];
  const onePager = company.onepager ?? null;
  const hasMeetups = ONE_ON_ONE_OPEN && company.track === "track1";
  const bookLabel = hasMeetups ? "Book a 1:1 meeting" : "RSVP for the Demo Day";
  const bookSearch: Record<string, string> = hasMeetups ? { day: "5", company: company.slug } : { day: "7" };
  const hl = HIGHLIGHTS[company.slug];
  const idx = companies.findIndex((c) => c.slug === company.slug);
  const next = companies[(idx + 1) % companies.length];
  const prev = companies[(idx - 1 + companies.length) % companies.length];
  const host = company.team.find((m) => TEAM_PHOTOS[m.name]) ?? company.team[0];
  const others = company.team.filter((m) => m !== host && m.name && !/^Advisors?$/.test(m.name));
  const site = company.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const details = [
    { title: "How it works", body: company.keyFeatures },
    { title: "Business model", body: company.businessModel },
    { title: "Who it's for", body: company.targetAudience },
  ].filter((d) => d.body.length);

  return (
    <div className="min-h-screen bg-background">
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px]">
        <div id="read-progress" className="h-full origin-left scale-x-0 bg-gradient-to-r from-primary to-yellow" />
      </div>

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-hero-gradient text-white">
        <img src={sphereArt} alt="" aria-hidden className="hero-sphere pointer-events-none absolute -right-28 -top-24 -z-10 w-[420px] opacity-60" />
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center"><Wordmark light compact /></Link>
          <nav className="flex shrink-0 items-center gap-1 text-sm font-semibold">
            <Link to="/companies/$slug" params={{ slug: prev.slug }} className="pager-btn" aria-label={`Previous startup: ${prev.name}`}>‹</Link>
            <span className="px-1 tabular-nums text-white/50">{idx + 1}/{companies.length}</span>
            <Link to="/companies/$slug" params={{ slug: next.slug }} className="pager-btn" aria-label={`Next startup: ${next.name}`}>›</Link>
            <Link to="/" hash="startups" className="ml-2 rounded-full border border-white/25 px-3.5 py-1.5 text-white/90 transition hover:bg-white/10">All startups</Link>
          </nav>
        </header>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-10 pt-6 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14 lg:pt-10">
          <div>
            <div className="hero-in flex flex-wrap items-center gap-3">
              {logo && (
                <span className="inline-flex h-14 items-center rounded-xl bg-white px-4 shadow-[var(--shadow-elegant)]">
                  <img src={logo} alt={`${company.name} logo`} className="h-8 w-auto max-w-[11rem] object-contain" />
                  {ci && (<><span aria-hidden className="mx-3 h-7 w-px bg-navy/15" /><img src={ci} alt="Company logo" className="h-7 w-auto object-contain" /></>)}
                </span>
              )}
              <span className="text-sm text-white/60">{company.sector}</span>
            </div>
            <h1 className="hero-in mt-6 font-display text-[clamp(2.5rem,6vw,4.4rem)] font-bold leading-[1.02] tracking-tight [--i:1]">{company.displayName}</h1>
            <p className="hero-in mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-white/75 [--i:2]">{company.tagline}</p>
            <div className="hero-in mt-8 flex flex-wrap gap-3 [--i:3]">
              <Link to="/book" search={bookSearch} className="btn-hero inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold">{bookLabel}</Link>
              {onePager && <a href={onePager} target="_blank" rel="noopener noreferrer" className="btn-outline-hero inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold">One-pager (PDF)</a>}
              {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" className="btn-outline-hero inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold">Website</a>}
            </div>
          </div>
          {photo && (
            <figure className="hero-in relative [--i:2]">
              <div className="photo-glow overflow-hidden rounded-[1.75rem] ring-1 ring-white/15">
                <img src={photo} alt={`${company.name} product`} className="aspect-[4/3] w-full object-cover" />
              </div>
            </figure>
          )}
        </div>

        {/* the transformation, set through the CI sphere */}
        {hl && (
          <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:pb-20">
            <div className="transform-band" aria-label={`From ${hl.from} into ${hl.into}`}>
              <div className="text-left">
                <p className="text-sm text-white/50">From</p>
                <p className="mt-1 font-display text-[clamp(1.4rem,3.2vw,2.3rem)] font-semibold leading-tight text-white/60">{hl.from}</p>
              </div>
              <div aria-hidden className="transform-core">
                <span className="flow flow-in" />
                <img src={sphereArt} alt="" className="core-orb" />
                <span className="flow flow-out" />
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-yellow">Into</p>
                <p className="mt-1 font-display text-[clamp(1.4rem,3.2vw,2.3rem)] font-bold leading-tight text-white">{hl.into}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* STORY + FACTS LABEL */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-16">
        <div className="order-2 lg:order-1">
          {company.problem.length > 0 && (
            <div data-show className="story-block">
              <p className="text-sm font-semibold text-navy/50">The problem</p>
              {hl && <p className="mt-2 font-display text-[1.65rem] font-semibold leading-snug text-navy/70 md:text-[2rem]">{hl.problem}</p>}
              <div className="mt-6"><Points items={company.problem} /></div>
            </div>
          )}
          <div aria-hidden className="story-turn my-10"><img src={sphereArt} alt="" className="h-10 w-10" /></div>
          {company.solution.length > 0 && (
            <div data-show className="story-block">
              <p className="text-sm font-semibold text-primary">What {company.name} does</p>
              {hl && <p className="mt-2 font-display text-[1.65rem] font-bold leading-snug text-navy md:text-[2rem]">{hl.fix}</p>}
              <div className="mt-6"><Points items={company.solution} /></div>
            </div>
          )}
        </div>
        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-8">
            <FactsLabel company={company} bookSearch={bookSearch} bookLabel={bookLabel} />
          </div>
        </div>
      </section>

      {details.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-24">
          <h2 data-show className="font-display text-3xl font-bold text-navy md:text-4xl">The detail</h2>
          <div data-show className="mt-8"><Accordion items={details} /></div>
        </section>
      )}

      {/* PROOF */}
      {company.businessSnapshot.length > 0 && (
        <section className="relative isolate overflow-hidden bg-hero-gradient text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 data-show className="font-display text-3xl font-bold md:text-4xl">Proof so far</h2>
            <ol data-show className="proof-list mt-10 grid gap-x-12 md:grid-cols-2">
              {company.businessSnapshot.map((item, i) => {
                const [l, t] = lead(item);
                return (
                  <li key={i} className="flex gap-4 border-t border-white/15 py-5" style={{ "--i": i } as CSSProperties}>
                    <span aria-hidden className="proof-dot mt-1.5" />
                    <span className="text-[15px] leading-relaxed text-white/80">
                      {l && <b className="block font-display text-base font-semibold text-yellow">{l}</b>}
                      {t}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* MEET */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <h2 data-show className="font-display text-3xl font-bold text-navy md:text-4xl">Meet {company.name} in Singapore</h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          {host && (
            <div data-show className="host-card">
              <div className="host-photo">
                {TEAM_PHOTOS[host.name] ? (
                  <img src={TEAM_PHOTOS[host.name]} alt={host.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-secondary font-display text-3xl font-bold text-primary">{initials(host.name)}</span>
                )}
              </div>
              <p className="mt-6 text-sm text-navy/55">You'll meet</p>
              <p className="font-display text-2xl font-bold text-navy">{host.name}</p>
              <p className="text-sm font-semibold text-primary">{host.role}</p>
              {host.bio.length > 0 && (
                <ul className="mt-4 space-y-1 text-[13px] leading-relaxed text-navy/65">
                  {host.bio.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              )}
              <Link to="/book" search={bookSearch} className="mt-6 flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">
                {hasMeetups ? `Book a 1:1 with ${host.name.split(" ")[0]}` : bookLabel}
              </Link>
              <p className="mt-3 text-center text-xs text-navy/50">{hasMeetups ? MEETUP_DATE : `${EVENT_DATE} · ${EVENT_VENUE}`}</p>
            </div>
          )}
          <div>
            <p data-show className="text-sm font-semibold text-navy/55">They're looking for</p>
            <ul data-show className="ask-list mt-3">
              {company.seekingOpportunities.map((item, i) => (
                <li key={i} style={{ "--i": i } as CSSProperties}>
                  <Link to="/book" search={bookSearch} className="ask-row group">
                    <span aria-hidden className="ask-orb" />
                    <span className="min-w-0">
                      <span className="block font-display text-lg font-bold text-navy">{hl?.asks[i] ?? item}</span>
                      {hl?.asks[i] && <span className="mt-1 block text-sm leading-relaxed text-navy/60">{item}</span>}
                    </span>
                    <span aria-hidden className="ask-go">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            {others.length > 0 && (
              <>
                <p data-show className="mt-10 text-sm font-semibold text-navy/55">Also on the team</p>
                <ul data-show className="mt-3 grid gap-3 sm:grid-cols-2">
                  {others.map((m) => (
                    <li key={m.name} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                      {TEAM_PHOTOS[m.name] ? (
                        <img src={TEAM_PHOTOS[m.name]} alt={m.name} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">{initials(m.name)}</span>
                      )}
                      <span className="min-w-0">
                        <span className="block font-semibold text-navy">{m.name}</span>
                        <span className="block text-xs text-navy/55">{m.role}</span>
                        {m.bio[0] && <span className="mt-1 block text-xs leading-relaxed text-navy/60">{m.bio[0]}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {(site || company.email || company.phone) && (
              <p className="mt-8 flex flex-wrap gap-x-6 gap-y-1 text-sm text-navy/80">
                {site && <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{site}</a>}
                {company.email && <a href={`mailto:${company.email}`} className="hover:underline">{company.email}</a>}
                {company.phone && <span>{company.phone}</span>}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* NEXT */}
      <Link to="/companies/$slug" params={{ slug: next.slug }} className="next-band group block bg-hero-gradient text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-4 py-12 sm:px-6 md:py-16">
          <span className="text-sm text-white/55">Next startup</span>
          <span className="font-display text-3xl font-bold md:text-4xl">{next.name}</span>
          {HIGHLIGHTS[next.slug] && (
            <span className="text-white/70">{HIGHLIGHTS[next.slug].from} <span aria-hidden className="text-yellow">→</span> {HIGHLIGHTS[next.slug].into}</span>
          )}
          <span aria-hidden className="next-orb ml-auto"><img src={sphereArt} alt="" /></span>
        </div>
      </Link>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <Wordmark />
          <div className="text-xs text-muted-foreground">© {EVENT_NAME}. {CREDITS}.</div>
        </div>
      </footer>
    </div>
  );
}
