import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import mssLogo from "@/assets/ci/mss-white.png";
import kisedLogo from "@/assets/ci/kised-white.png";
import sphereArt from "@/assets/ci/sphere.webp";
import horizonArt from "@/assets/ci/horizon.webp";
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

// Scroll reveal: marks [data-reveal] elements visible as they enter.
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("is-visible"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Pointer parallax for the hero art and scroll parallax for the dome:
// writes --mx/--my (−1..1) and --sy (px) on #top; CSS does the moving.
function useHeroParallax() {
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, mx = 0, my = 0;
    const paint = () => {
      hero.style.setProperty("--mx", mx.toFixed(3));
      hero.style.setProperty("--my", my.toFixed(3));
      hero.style.setProperty("--sy", `${Math.min(scrollY, 900) * 0.25}px`);
      raf = 0;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const onMove = (e: PointerEvent) => { mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; queue(); };
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("scroll", queue, { passive: true });
    return () => { removeEventListener("pointermove", onMove); removeEventListener("scroll", queue); cancelAnimationFrame(raf); };
  }, []);
}

// 3D tilt + light sheen for [data-tilt] cards, magnetic pull for [data-magnet].
function useTiltAndMagnet() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(hover: none)").matches) return;
    const onMove = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tilt],[data-magnet]");
      if (!t) return;
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      if (t.hasAttribute("data-tilt")) {
        t.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`); t.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
        t.style.setProperty("--px", `${((x + 0.5) * 100).toFixed(1)}%`); t.style.setProperty("--py", `${((y + 0.5) * 100).toFixed(1)}%`);
      } else {
        t.style.setProperty("--tx", `${(x * 14).toFixed(1)}px`); t.style.setProperty("--ty", `${(y * 10).toFixed(1)}px`);
      }
    };
    const onLeave = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tilt],[data-magnet]");
      if (t) ["--rx", "--ry", "--tx", "--ty"].forEach((v) => t.style.removeProperty(v));
    };
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerout", onLeave, { passive: true });
    return () => { removeEventListener("pointermove", onMove); removeEventListener("pointerout", onLeave); };
  }, []);
}

const HEADLINE = ["Ten", "Korean", "startups", "turning", "waste", "into", "markets"];

// CI artwork from the event banner: textured spheres and thin rings.
function Orbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* small sphere top-centre, dome rising from the bottom-right edge —
          the X-banner composition, kept clear of the copy */}
      <img src={sphereArt} alt="" className="orb orb-glow parallax-1 absolute -top-[56px] left-[46%] w-[170px] opacity-95 max-lg:left-auto max-lg:right-[-40px] max-lg:top-[-60px] max-lg:w-[140px]" />
      <img src={horizonArt} alt="" className="orb orb-slow orb-glow parallax-dome absolute -bottom-[300px] -right-[420px] w-[820px] opacity-70 lg:-bottom-[400px] lg:-right-[380px] lg:w-[1100px]" />
      {/* rings sit in the page margins / empty band under the CTAs only */}
      <span className="ring-drift parallax-2 absolute left-[2.5%] top-[46%] hidden h-5 w-5 rounded-full border border-white/50 lg:block" />
      <span className="ring-drift parallax-3 absolute bottom-[9%] left-[30%] hidden h-9 w-9 rounded-full border border-white/40 [animation-delay:-5s] lg:block" />
      <span className="ring-drift parallax-2 absolute right-[3%] top-[38%] hidden h-4 w-4 rounded-full border border-white/50 [animation-delay:-9s] lg:block" />
    </div>
  );
}

function Landing() {
  useReveal();
  useHeroParallax();
  useTiltAndMagnet();
  return (
    <div className="min-h-screen">
      {/* HERO — the ledger */}
      <section id="top" className="relative isolate overflow-hidden bg-hero-gradient text-white">
        <Orbs />
        {/* Phones: wordmark row, then the menu row (four items never fit
            beside the wordmark at 390px); from md they share one line. */}
        <header className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <a href="#top" className="min-w-0">
            <Wordmark light />
          </a>
          <nav className="-mx-2 flex items-center gap-1 text-sm font-semibold md:mx-0 md:gap-2">
            <a href="#startups" className="rounded-full px-2 py-1.5 text-white/85 hover:text-white md:px-3 md:py-2">Startups</a>
            <a href="#judges" className="rounded-full px-2 py-1.5 text-white/85 hover:text-white md:px-3 md:py-2">Judges</a>
            <a href="#about" className="rounded-full px-2 py-1.5 text-white/85 hover:text-white md:px-3 md:py-2">About</a>
            <a href="/lounge" className="rounded-full px-2 py-1.5 text-white/85 hover:text-white md:px-3 md:py-2">Lounge</a>
            <span className="ml-auto md:ml-1"><ContactOrganizer /></span>
          </nav>
        </header>

        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-32 pt-8 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:pb-44 lg:pt-14">
          <div className="lg:pt-4">
            <p className="hero-in text-sm font-medium text-lichen">Climate Tech IR / Demo Day · {EVENT_DAY_SHORT} 2026</p>
            <h1 className="hero-title mt-4 text-[clamp(2.6rem,9vw,5.2rem)] font-bold leading-[0.92] text-white" aria-label={HEADLINE.join(" ")}>
              {HEADLINE.map((w, i) => (
                <span key={w} aria-hidden>
                  <span className="hero-word-clip">
                    <span className="hero-word" style={{ "--i": i } as CSSProperties}>{w}</span>
                  </span>{" "}
                </span>
              ))}
            </h1>
            <p className="hero-in [--i:5] mt-6 max-w-md text-[1.0625rem] leading-relaxed text-white/80">
              Selected through the 2026 Climate Tech Startup Challenge, Korea's government-backed programme, they come to
              Singapore to meet investors, corporates and partners. Watch them pitch, then sit down with the ones that fit.
            </p>
            <div className="hero-in [--i:6] mt-8 flex flex-wrap gap-3">
              <Link to="/book" search={{ day: "7" }} data-magnet className="btn-hero magnet rounded-full px-6 py-3.5 text-sm font-semibold">
                RSVP for the Demo Day
              </Link>
              {ONE_ON_ONE_OPEN && (
                <Link to="/book" search={{ day: "5" }} data-magnet className="btn-outline-hero magnet rounded-full px-6 py-3.5 text-sm font-semibold">
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

        {/* Cohort marquee: the ten logos glide across the foot of the hero */}
        <div className="marquee relative border-t border-white/10 py-5" aria-hidden>
          <div className="marquee-track">
            {[...companies, ...companies].map((c, i) => (
              <span key={`${c.slug}-${i}`} className="mx-3 inline-flex h-12 w-36 shrink-0 items-center justify-center rounded-lg bg-white/95 px-4">
                <img src={STARTUP_LOGOS[c.slug]} alt="" className="max-h-7 max-w-full object-contain" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* JOIN — two days. One big line per card says what matters (day + time);
          everything else is small. Details repeat on the RSVP page. */}
      <section id="rsvp" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <h2 data-reveal className="max-w-xl text-3xl font-bold text-navy md:text-4xl">Two days in Singapore</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          For investors, corporates and ecosystem partners. Register for either day or both.
        </p>

        <div data-reveal className="mt-10 grid gap-px rounded-2xl border border-border bg-border shadow-[var(--shadow-card)] [perspective:1200px] md:grid-cols-2">
          <article data-tilt className="tilt flex flex-col bg-card p-6 sm:p-8">
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

          <article data-tilt className="tilt flex flex-col bg-card p-6 sm:p-8">
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
          <h2 data-reveal className="text-3xl font-bold text-navy md:text-4xl">The startups</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Open a profile for the full one-pager, or book a 1:1 straight away.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 [perspective:1200px] sm:gap-4 lg:grid-cols-5">
            {companies.map((c, i) => (
              <article key={c.slug} data-reveal style={{ "--rd": `${(i % 5) * 70}ms` } as CSSProperties} data-tilt className="card-startup tilt group flex flex-col overflow-hidden rounded-xl">
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

      {/* JUDGES — hidden while the list in src/data/speakers.ts is empty.
          Same shape as the CMK site: centred, greyscale portraits. */}
      {JUDGES.length > 0 && (
        <section id="judges" className="relative isolate overflow-hidden bg-hero-gradient text-white">
          <img src={sphereArt} alt="" aria-hidden className="orb pointer-events-none absolute -left-24 -top-24 -z-10 w-[260px] opacity-60 lg:w-[340px]" />
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 md:py-24">
            <p data-reveal className="text-sm font-semibold text-yellow">Demo Day · {EVENT_DAY_SHORT}</p>
            <h2 data-reveal className="mt-2 text-3xl font-bold md:text-5xl">Who You'll Meet</h2>
            <div className="mt-12 grid grid-cols-2 justify-items-center gap-x-6 gap-y-10 md:grid-cols-4">
              {JUDGES.map((j, i) => (
                <div key={j.name} data-reveal style={{ "--rd": `${i * 90}ms` } as CSSProperties} className="group flex flex-col items-center text-center">
                  <img
                    src={j.photo}
                    alt={j.name}
                    loading="lazy"
                    className="h-32 w-32 rounded-full object-cover ring-4 ring-white/90 grayscale transition duration-500 group-hover:scale-105 group-hover:ring-yellow md:h-40 md:w-40"
                  />
                  <div className="mt-4 font-display text-lg font-bold uppercase tracking-wide text-yellow">{j.name}</div>
                  {j.title && <div className="mt-1 max-w-[15rem] text-sm leading-snug text-white/85">{j.title}</div>}
                  <div className="mt-0.5 max-w-[15rem] text-balance text-sm font-semibold leading-snug">{j.org}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOSTS — MSS and KISED only for now (client request, 10 Oct) */}
      <section id="about" className="relative isolate overflow-hidden bg-hero-gradient text-white">
        <img src={sphereArt} alt="" aria-hidden className="orb pointer-events-none absolute -right-28 -top-28 -z-10 w-[260px] opacity-70 lg:-right-16 lg:w-[360px]" />
        <div data-reveal className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
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
                <a href={MSS_SITE} target="_blank" rel="noopener noreferrer" className="flex h-14 items-center">
                  <img src={mssLogo} alt="Ministry of SMEs and Startups" className="h-11 w-auto object-contain" />
                </a>
                <p className="mt-4 font-display text-lg font-semibold leading-snug">Ministry of SMEs and Startups (MSS)</p>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  The Korean government ministry for small and medium-sized enterprises, startups and venture companies,
                  and the policy home of the national startup programmes.
                </p>
              </div>
              <div>
                <a href={KISED_SITE} target="_blank" rel="noopener noreferrer" className="flex h-14 items-center">
                  <img src={kisedLogo} alt="Korea Institute of Startup & Entrepreneurship Development (KISED)" className="h-10 w-auto object-contain" />
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
