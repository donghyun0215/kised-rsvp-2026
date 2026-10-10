import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";
import { getCompanyBySlug, TRACKS } from "@/data/companies";
import { EVENT_DATE, EVENT_VENUE, ONE_ON_ONE_OPEN, MEETUP_DATE, EVENT_NAME } from "@/data/timeslots";
import { STARTUP_LOGOS } from "@/data/companyImages";

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{children}</div>
  );
}

function Bullets({ items, compact = false }: { items: string[]; compact?: boolean }) {
  return (
    <ul className={compact ? "mt-2.5 space-y-1.5" : "mt-3 space-y-2"}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-foreground/85">
          <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <Eyebrow>{title}</Eyebrow>
      <Bullets items={items} compact />
    </div>
  );
}

function CompanyOnePager() {
  const company = Route.useLoaderData();
  const track = TRACKS[company.track];
  const logo = STARTUP_LOGOS[company.slug];
  const meetTarget = "/book" as const;
  const onePager = company.onepager ?? null;
  const irDeck = company.irdeck ?? null;
  // Only cohort companies take 1:1 bookings.
  const hasMeetups = ONE_ON_ONE_OPEN && company.track === "track1";
  const bookLabel = hasMeetups ? "Book a 1:1 Meeting" : "RSVP for Demo Day";
  const bookSearch = hasMeetups ? { day: "5" as const, company: company.slug } : { day: "7" as const };

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center">
            <Wordmark compact />
          </Link>
          <nav className="flex shrink-0 items-center">
            <Link
              to="/"
              hash="startups"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-muted sm:px-4 sm:py-2 sm:text-sm"
            >
              All startups
            </Link>
          </nav>
        </div>
      </header>

      {/* COMPACT HERO */}
      <section className="relative isolate overflow-hidden bg-hero-gradient text-primary-foreground">
        <div
          className="absolute inset-0 -z-10 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, oklch(0.68 0.18 245 / 0.5), transparent 45%), radial-gradient(circle at 85% 80%, oklch(0.35 0.18 265 / 0.6), transparent 45%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-7 sm:px-6 md:pb-16 md:pt-8">
          <div className="text-[11px] font-medium text-primary-foreground/75">
            {track.title} · {track.dates}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            {logo && (
              <div className="inline-flex items-center rounded-lg bg-white px-4 py-2.5 shadow-elegant">
                <img src={logo} alt={`${company.name} logo`} className="h-7 w-auto object-contain sm:h-8" />
              </div>
            )}
            <h1 className="bg-gradient-to-r from-white to-light-blue bg-clip-text text-3xl font-bold leading-[1.05] text-transparent sm:text-4xl">
              {company.displayName}
            </h1>
            <span className="hidden items-center gap-2 text-xs font-medium md:flex">
              <span className="rounded-full bg-primary-foreground/15 px-3 py-1">{company.sector}</span>
              <span className="rounded-full bg-primary-foreground/15 px-3 py-1">{company.stage}</span>
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-primary-foreground/90 sm:text-base">
            {company.tagline}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              to={meetTarget}
              search={bookSearch}
              className="btn-hero inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              {bookLabel}
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            {onePager && (
              <a
                href={onePager}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline-hero inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                ⬇ One-Pager (PDF)
              </a>
            )}
            {irDeck && (
              <a
                href={irDeck}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline-hero inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                ⬇ IR Deck (PDF)
              </a>
            )}
            {!onePager && !irDeck && (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-5 py-2.5 text-sm font-semibold text-primary-foreground/70">
                One-pager coming soon
              </span>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline-hero inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                Website ↗
              </a>
            )}
          </div>
        </div>
        <svg
          className="absolute bottom-0 left-0 right-0 h-8 w-full text-background"
          viewBox="0 0 1440 40"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          <path d="M0 20 Q 360 40 720 20 T 1440 20 L1440 40 L0 40 Z" />
        </svg>
      </section>

      {/* DENSE CONTENT GRID */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 md:py-10">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard title="Problem" items={company.problem} />
          <InfoCard title="Solution" items={company.solution} />
          <InfoCard title="Key Features" items={company.keyFeatures} />
          <InfoCard title="Target Audience" items={company.targetAudience} />
          <InfoCard title="Business Model" items={company.businessModel} />
          <InfoCard title="Seeking in Singapore" items={company.seekingOpportunities} />
        </div>
      </section>

      {/* SNAPSHOT — compact dark band */}
      <section className="bg-hero-gradient text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 md:py-10">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
            Business Snapshot — Traction & Milestones
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {company.businessSnapshot.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 p-3.5 text-[13px] leading-relaxed backdrop-blur-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM + CONTACT */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Team</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-navy">Who You'll Meet</h2>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-foreground/85">
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="hover:underline">
                {company.email}
              </a>
            )}
            {company.phone && <span>{company.phone}</span>}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {company.team.map((member) => (
            <div key={member.name} className="card-startup rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                  {member.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-navy">{member.name}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">{member.role}</div>
                </div>
              </div>
              <ul className="mt-2.5 space-y-1">
                {member.bio.map((line, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* INLINE CTA + FOOTER */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
          <div>
            <div className="text-base font-bold text-navy">Meet {company.name} in Singapore</div>
            <div className="text-xs text-muted-foreground">
              Private 1:1 · {ONE_ON_ONE_OPEN ? MEETUP_DATE : `Showcase · ${EVENT_DATE} · ${EVENT_VENUE}`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to={meetTarget}
              search={bookSearch}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              {bookLabel}
            </Link>
            <Link
              to="/"
              hash="startups"
              className="inline-flex items-center gap-2 rounded-full border border-primary bg-background px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              ← All Startups
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <Wordmark />
          <div className="text-xs text-muted-foreground">© {EVENT_NAME} · Hosted by MSS &amp; KISED · Organized by MYSC &amp; LodestarT</div>
        </div>
      </footer>
    </div>
  );
}
