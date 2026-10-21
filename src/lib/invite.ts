// Outreach invitation email, served by /api/invite and sent from the invite
// Google Sheet. `team` = signed by the LodestarT team (support@), otherwise by Tammy. Built from the same constants as the
// site, so a confirmed venue or time is picked up without touching the sheet.
// {{GREETING}} is replaced per recipient by the sheet script.
import { companies } from "@/data/companies";
import { JUDGES } from "@/data/speakers";
import {
  EVENT_ADDRESS,
  EVENT_DATE,
  EVENT_NAME,
  EVENT_NAME_LINE1,
  EVENT_NAME_LINE2,
  EVENT_TIME,
  EVENT_VENUE,
  EVENT_DAY_SHORT,
  DEMO_AGENDA,
  MEETUP_ADDRESS,
  MEETUP_DATE,
  MEETUP_TIME,
  MEETUP_VENUE,
  ONE_ON_ONE_OPEN,
  PROGRAM,
  SITE_URL as SITE,
  TIMESLOTS,
} from "@/data/timeslots";

// ── per-event copy and colours ──
const C = { brand: "#3b49c2", accent: "#7fd3f2", ink: "#12162b", muted: "#4f566e", line: "#d9deec" };
const HOST_LINE = "MSS · KISED";
const DATES = "28–29 October 2026 · Singapore";
const SUBJECT = `Invitation to the ${EVENT_NAME} (28–29 Oct, Singapore)`;
const PITCH =
  "Ten Korean climate-tech startups, selected through the 2026 Climate-tech Startup Challenge run by Korea's Ministry of SMEs and Startups and KISED, are coming to Singapore to meet investors, corporates and partners.";
// One line per startup for the "Featuring" list (falls back to the site tagline).
const LINES: Record<string, string> = {
  refeed: "A waste-commodity exchange for used cooking oil, the key feedstock for sustainable aviation fuel",
  apexion: "Food-waste data analytics that routes more waste to biogas",
  yulmix: "Solvent-free, room-temperature manufacturing of catalyst nanomaterials",
  greenmrv: "Biochar and CO₂ mineralization carbon-removal projects and credits",
  reblock: "High-performance permeable paving blocks made from ceramic waste",
  mce: "Turning waste plastic into organic fertilizer with mealworm gut microbes",
  gigaette: "Thermal batteries that turn waste heat into carbon-free industrial heat",
  theorigin: "Photosynthetic microbes that turn CO₂ into biodegradable materials",
  terracle: "Chemical recycling of PET and textile waste into high-purity raw materials",
  solarlease: "Zero-capex rooftop solar on subscription, profitable from year one in Korea",
};
const ORDER: ("demo" | "meetup")[] = ["demo", "meetup"]; // chronological

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const F = "font-family:Arial,Helvetica,sans-serif;";
const P = `margin:0 0 14px;${F}font-size:14px;line-height:21px;color:#222222;`;

export function buildInvite(team = false, round = 1): { subject: string; html: string; text: string } {
  if (round === 2) return buildSecondInvite(team);
  const [I, my, sign] = team ? ["We are", "we would", "The LodestarT team"] : ["I am", "I would", "Tammy"];
  const showcase = PROGRAM.find((p) => p.id === "showcase");
  const dinner = PROGRAM.find((p) => p.id === "lunch");
  const demoRows: [string, string][] = [
    // registration row only when doors open before the programme starts
    ...(showcase && showcase.time.startsWith(EVENT_TIME.split("–")[0].trim()) ? [] : [[EVENT_TIME.split("–")[0].trim(), "Registration"] as [string, string]]),
    ...(showcase ? [[showcase.time, showcase.title] as [string, string]] : []),
    ...(dinner ? [[dinner.time, dinner.title] as [string, string]] : []),
  ];
  const [h1, m1, h2, m2] = (TIMESLOTS[0]?.time.match(/\d+/g) ?? []).map(Number);
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  const rounds = `Private ${mins}-minute meetings with the startups you choose (${TIMESLOTS.length} rounds)`;

  const btn = (href: string, label: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr><td style="background:${C.brand};border-radius:2px;"><a href="${href}" style="display:block;padding:11px 16px;${F}font-size:12px;font-weight:bold;letter-spacing:0.7px;color:#ffffff;text-decoration:none;text-transform:uppercase;">${label}&nbsp;&nbsp;→</a></td></tr></table>`;
  const card = (kicker: string, rows: [string, string][], venue: string, address: string, cta: string) => `
<tr><td style="padding:22px 36px 0;">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-left:5px solid ${C.brand};"><tr><td style="padding:16px 18px;">
  <div style="${F}font-size:11px;letter-spacing:1.2px;font-weight:bold;color:${C.brand};text-transform:uppercase;">${esc(kicker)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
   ${rows.map(([t, w]) => `<tr><td style="padding:3px 14px 3px 0;${F}font-size:13px;font-weight:bold;color:${C.brand};white-space:nowrap;vertical-align:top;">${esc(t)}</td><td style="padding:3px 0;${F}font-size:14px;color:${C.ink};">${esc(w)}</td></tr>`).join("")}
  </table>
  <div style="${F}padding-top:10px;font-size:13px;line-height:19px;color:${C.muted};">${esc(venue)}<br>${esc(address)}</div>
  ${cta}
 </td></tr></table>
</td></tr>`;

  const blocks = {
    demo: card(`Demo Day · ${EVENT_DATE}`, demoRows, EVENT_VENUE, EVENT_ADDRESS, btn(`${SITE}/book?day=7`, "RSVP for the Demo Day")),
    meetup: ONE_ON_ONE_OPEN
      ? card(`1:1 Business Meetings · ${MEETUP_DATE}`, [[MEETUP_TIME, rounds]], MEETUP_VENUE, MEETUP_ADDRESS, btn(`${SITE}/book?day=5`, "Book a 1:1 meeting"))
      : "",
  };

  const lineOf = (c: (typeof companies)[number]) => LINES[c.slug] ?? c.tagline;
  const featuring = companies
    .map((c, i) => `<tr><td style="padding:5px 10px 5px 0;${F}font-size:13px;line-height:18px;color:${C.brand};font-weight:bold;vertical-align:top;white-space:nowrap;">${String(i + 1).padStart(2, "0")}</td><td style="padding:5px 0;${F}font-size:13px;line-height:18px;color:${C.ink};"><b>${esc(c.name)}</b> <span style="color:${C.muted};">— ${esc(lineOf(c))}</span></td></tr>`)
    .join("");

  const intro = [
    "I hope this email finds you well.",
    `${I} delighted to invite you to the <b>${esc(EVENT_NAME)}</b> in Singapore. ${esc(PITCH)}`,
    ONE_ON_ONE_OPEN
      ? `They will pitch at the Demo Day on <b>${esc(EVENT_DATE)}</b>, and you are welcome to book private 1:1 meetings with the ones that interest you ${(EVENT_DATE as string) === MEETUP_DATE ? "that afternoon" : `on <b>${esc(MEETUP_DATE)}</b>`}.`
      : `They will pitch at the Demo Day on <b>${esc(EVENT_DATE)}</b>.`,
    `It would mean a great deal to have you with us. Please find the details below, and ${my} be grateful if you could RSVP at your earliest convenience.`,
  ];

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px 12px;background:#ffffff;">
<div style="max-width:600px;margin:0 auto;padding:4px 4px 18px;text-align:left;">
<p style="${P}">{{GREETING}}</p>
${intro.map((l) => `<p style="${P}">${l}</p>`).join("\n")}
<p style="${P}">Warm regards,<br>${sign}</p>
</div>
<table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${C.line};">
<tr><td style="background:${C.brand};padding:14px 36px 20px;">
 <div style="${F}font-size:10px;letter-spacing:0.9px;font-weight:bold;color:#ffffff;text-transform:uppercase;">${esc(HOST_LINE)}</div>
 <div style="${F}padding-top:14px;font-size:26px;line-height:30px;letter-spacing:-0.6px;font-weight:800;color:#ffffff;">${esc(EVENT_NAME_LINE1)}<br>${esc(EVENT_NAME_LINE2)}</div>
 <div style="${F}padding-top:6px;font-size:13px;font-weight:bold;color:${C.accent};">${esc(DATES)}</div>
</td></tr>
${ORDER.map((k) => blocks[k]).join("")}
<tr><td style="padding:22px 36px 24px;">
 <div style="${F}font-size:11px;letter-spacing:1.4px;font-weight:bold;color:${C.brand};text-transform:uppercase;">Featuring</div>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${featuring}</table>
 <div style="${F}padding-top:12px;font-size:14px;"><a href="${SITE}/#startups" style="color:${C.brand};font-weight:bold;">View the startup profiles →</a></div>
</td></tr>
</table>
<p style="max-width:600px;margin:14px auto 0;${F}font-size:12px;color:#8a8f9e;">If you would rather not receive invitations like this, just let ${team ? "us" : "me"} know.</p>
</body></html>`;

  const plain = (s: string) => s.replace(/<[^>]+>/g, "");
  const demoText = [`DEMO DAY · ${EVENT_DATE}`, ...demoRows.map(([t, w]) => `${t}  ${w}`), `${EVENT_VENUE}, ${EVENT_ADDRESS}`, `RSVP: ${SITE}/book?day=7`];
  const meetText = ONE_ON_ONE_OPEN
    ? [`1:1 BUSINESS MEETINGS · ${MEETUP_DATE}`, `${MEETUP_TIME}  ${rounds}`, `${MEETUP_VENUE}, ${MEETUP_ADDRESS}`, `Book: ${SITE}/book?day=5`]
    : [];
  const text = [
    "{{GREETING}}",
    "",
    ...intro.map(plain).flatMap((l) => [l, ""]),
    "Warm regards,",
    sign,
    "",
    "----",
    ...ORDER.flatMap((k) => [...(k === "demo" ? demoText : meetText), ""]),
    "Featuring:",
    ...companies.map((c, i) => `${String(i + 1).padStart(2, "0")} ${c.name} — ${lineOf(c)}`),
    `Startup profiles: ${SITE}/#startups`,
    "",
    `If you would rather not receive invitations like this, just let ${team ? "us" : "me"} know.`,
  ].join("\n");

  return { subject: SUBJECT, html, text };
}

// ── Second invitation (21 Oct, Tammy) ─────────────────────────────────
// Two parts. On top, a short personal note in Tammy's own voice (warm,
// plain sentences, an exclamation mark or two; signed as Vice Chairman of
// the Korea Chamber of Commerce in Singapore, at her request),
// with the cheeky opener she asked for: why does everyone want to come to
// Singapore? Below, the eDM: a single card that sells the ten as Korea's
// climate-tech national team. Facts: final ten of the MSS × KAIST "모두의
// 챌린지 기후테크" (MSS press release, 10 Sep 2026; The Origin and GIGAette
// won the top Minister's award in their leagues); five KAIST-matched
// research teams + five companies; MCE's Temasek Polytechnic MOU and Green
// Thumbs 2026 with MOS Alvin Tan (MCE LinkedIn, 18 Oct); ReFeed's Singapore
// investors (one-pager). No images, so nothing is blocked or flagged.
const LEAGUES: { title: string; sub: string; slugs: string[] }[] = [
  { title: "Research league", sub: "Research-led teams, matched with KAIST master's and PhD experts", slugs: ["theorigin", "reblock", "yulmix", "greenmrv", "apexion"] },
  { title: "Startup league", sub: "Climate-tech companies with proven technology", slugs: ["gigaette", "terracle", "refeed", "mce", "solarlease"] },
];
const SHORT: Record<string, string> = {
  theorigin: "CO₂ into materials that biodegrade in soil and sea",
  reblock: "Permeable paving blocks made from ceramic waste",
  yulmix: "Catalyst nanomaterials made at room temperature, no solvents",
  greenmrv: "Biochar and CO₂ mineralisation carbon-removal credits",
  apexion: "Food-waste data that sends more waste to biogas",
  gigaette: "Thermal batteries that turn waste heat into process heat",
  terracle: "PET and textile waste back into virgin-grade raw material",
  refeed: "A verified exchange for used cooking oil, the feedstock for SAF",
  mce: "Mealworm microbes that turn styrofoam into fertiliser",
  solarlease: "Zero-capex rooftop solar on subscription",
};
const TOP_AWARD = new Set(["theorigin", "gigaette"]);

function buildSecondInvite(team: boolean): { subject: string; html: string; text: string } {
  const [I, me, sign] = team ? ["we", "us", "The LodestarT team"] : ["I", "me", "Tammy"];
  const pitchStart = DEMO_AGENDA.find(([, item]) => /pitching/i.test(item))?.[0].split("–")[0].trim() ?? "";
  const doors = EVENT_TIME.split("–")[0].trim();
  const judges = JUDGES.map((j) => j.org.replace(/^Centre for Impact Investing and Practices \(CIIP\), Temasek Trust$/, "CIIP, Temasek Trust"));
  const name = (slug: string) => companies.find((c) => c.slug === slug)?.name ?? slug;

  // ── the personal note (Tammy's voice)
  // Tammy's own wording (21 Oct): she dropped the "everyone wants to come
  // to Singapore" opener and rewrote the rest.
  const body = (who: "I" | "we") => [
    `Next week, on October 28th, Korea is bringing its <b>&ldquo;Climate-Tech National Team&rdquo;</b> to Singapore. This delegation features the top ten finalists of the national &ldquo;Modu's Startup Climate Tech Challenge,&rdquo; organized by the Ministry of SMEs and Startups in collaboration with KAIST.`,
    "The group consists of five researchers ready to commercialize their cutting-edge research and five innovative startups tackling climate challenges with real-world technological solutions. They are already making great progress and are actively looking for more than just investment&mdash;they are seeking <b>joint R&amp;D, proof-of-concepts (PoCs), pilot projects, and business partnerships</b> in Singapore.",
    `If any of these innovative teams align with your work or interests, ${who} would love for you to come and meet them.`,
  ];
  const note = team ? body("we") : body("I");

  // ── palette (KISED CI)
  const NIGHT = "#12162b", INDIGO = "#3b49c2", SKY = "#7fd3f2", PALE = "#eef1fa", INK = "#12162b", MUTED = "#5a6178", LINE = "#dfe3f0";
  const H = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;";
  const btn = (href: string, label: string, solid: boolean) =>
    `<a href="${href}" style="display:inline-block;margin:0 8px 8px 0;padding:13px 20px;${H}font-size:14px;font-weight:bold;text-decoration:none;border-radius:3px;${
      solid ? `background:${SKY};color:${NIGHT};` : `background:transparent;color:#ffffff;border:1.5px solid rgba(255,255,255,0.45);`
    }">${label}</a>`;

  const stat = (big: string, small: string, pos: "first" | "mid" | "last") =>
    `<td width="33%" valign="top" style="padding:18px 12px 18px ${pos === "first" ? "0" : "14px"};${pos === "last" ? "" : `border-right:1px solid ${LINE};`}"><div style="${H}font-size:30px;line-height:32px;font-weight:800;color:${INDIGO};letter-spacing:-1px;">${big}</div><div style="${H}padding-top:6px;font-size:12px;line-height:16px;color:${MUTED};">${small}</div></td>`;

  const roster = LEAGUES.map((L) => `
<tr><td style="padding:22px 28px 6px;">
  <div style="${H}font-size:15px;font-weight:800;color:${INK};">${esc(L.title)}</div>
  <div style="${H}padding-top:2px;font-size:12px;color:${MUTED};">${esc(L.sub)}</div>
</td></tr>
<tr><td style="padding:4px 28px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${L.slugs.map((slug) => `<tr><td style="padding:9px 0;border-top:1px solid ${LINE};">
    <a href="${SITE}/companies/${slug}" style="${H}font-size:14px;font-weight:bold;color:${INK};text-decoration:none;">${esc(name(slug))}</a>${
      TOP_AWARD.has(slug) ? ` <span style="${H}display:inline-block;margin-left:6px;padding:2px 7px;font-size:10px;font-weight:bold;color:${NIGHT};background:${SKY};border-radius:2px;vertical-align:1px;">TOP AWARD</span>` : ""
    }
    <div style="${H}padding-top:2px;font-size:13px;line-height:18px;color:${MUTED};">${esc(SHORT[slug] ?? "")}</div>
  </td></tr>`).join("")}
  </table>
</td></tr>`).join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:20px 12px 28px;">

<!-- the note -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;"><tr><td style="padding:0 4px 26px;text-align:left;">
<p style="${P}">{{GREETING}}</p>
${note.map((l) => `<p style="${P}">${l}</p>`).join("\n")}
<p style="margin:0;${F}font-size:14px;line-height:21px;color:#222222;">Warm regards,<br>${team ? sign : "Tammy Ahn<br><span style=\"color:#666666;\">Vice Chairman of Korea Chamber of Commerce in Singapore</span>"}</p>
</td></tr></table>

<!-- the eDM -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border:1px solid ${LINE};border-radius:4px;overflow:hidden;">
<tr><td style="background:${NIGHT};background-image:radial-gradient(120% 140% at 100% 0%,#2b3a9e 0%,${NIGHT} 58%);padding:30px 28px 28px;">
  <div style="${H}font-size:12px;font-weight:bold;color:${SKY};">Singapore · 28–29 October 2026</div>
  <div style="${H}padding-top:12px;font-size:34px;line-height:37px;font-weight:800;color:#ffffff;letter-spacing:-1px;">Korea's climate&#8209;tech<br>national team</div>
  <div style="${H}padding-top:12px;font-size:14px;line-height:21px;color:#c9d0ea;">The final ten of the 2026 Climate-tech Startup Challenge, a national competition by Korea's Ministry of SMEs and Startups and KAIST.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr><td style="padding:3px 16px 3px 0;${H}font-size:13px;font-weight:bold;color:#ffffff;white-space:nowrap;vertical-align:top;">${esc(EVENT_DAY_SHORT)}</td><td style="padding:3px 0;${H}font-size:13px;line-height:19px;color:#c9d0ea;">Demo Day at ${esc(EVENT_VENUE)}. Doors ${esc(doors)}, pitching ${esc(pitchStart)}, dinner after.</td></tr>
    ${ONE_ON_ONE_OPEN ? `<tr><td style="padding:3px 16px 3px 0;${H}font-size:13px;font-weight:bold;color:#ffffff;white-space:nowrap;vertical-align:top;">Thu 29 Oct</td><td style="padding:3px 0;${H}font-size:13px;line-height:19px;color:#c9d0ea;">Private 1:1 meetings, ${esc(MEETUP_TIME)} at ${esc(MEETUP_VENUE)}.</td></tr>` : ""}
  </table>
  <div style="padding-top:22px;">${btn(`${SITE}/book?day=7`, "RSVP for the Demo Day", true)}${ONE_ON_ONE_OPEN ? btn(`${SITE}/book?day=5`, "Book a 1:1", false) : ""}</div>
</td></tr>

<tr><td style="padding:0 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    ${stat("10", "finalists from a national selection", "first")}
    ${stat("5 + 5", "research teams and climate&#8209;tech companies", "mid")}
    ${stat("2", "top Minister's awards in the room", "last")}
  </tr></table>
</td></tr>

<tr><td style="padding:0 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALE};border-left:4px solid ${INDIGO};border-radius:2px;"><tr><td style="padding:16px 18px;">
    <div style="${H}font-size:12px;font-weight:bold;color:${INDIGO};">Already at work in Singapore</div>
    <div style="${H}padding-top:8px;font-size:14px;line-height:21px;color:${INK};"><b>MCE</b> signed an MOU with Temasek Polytechnic for joint R&amp;D, and joined Green Thumbs 2026, where Minister of State Alvin Tan set out Singapore's plan to expand skyrise greenery by 2030. MCE's fertiliser is made for exactly those green walls.</div>
    <div style="${H}padding-top:8px;font-size:14px;line-height:21px;color:${INK};"><b>ReFeed</b> is backed by institutional investors from Korea and Singapore.</div>
  </td></tr></table>
</td></tr>

${roster}

<tr><td style="padding:22px 28px 0;">
  <div style="${H}font-size:12px;font-weight:bold;color:${INDIGO};">They are looking for</div>
  <div style="padding-top:8px;">${["Joint R&amp;D", "PoCs and pilots", "Investment"].map((t) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:7px 12px;${H}font-size:13px;font-weight:bold;color:${INK};background:${PALE};border-radius:3px;">${t}</span>`).join("")}</div>
</td></tr>

<tr><td style="padding:16px 28px 0;">
  <div style="${H}font-size:12px;font-weight:bold;color:${INDIGO};">Pitching to judges from</div>
  <div style="${H}padding-top:6px;font-size:13px;line-height:20px;color:${INK};">${judges.map(esc).join(" &nbsp;·&nbsp; ")}</div>
</td></tr>

<tr><td style="padding:24px 28px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NIGHT};border-radius:3px;"><tr><td style="padding:18px 20px;">
    <div style="${H}font-size:15px;font-weight:bold;color:#ffffff;">${esc(EVENT_DATE)} · ${esc(EVENT_VENUE)}</div>
    <div style="${H}padding-top:4px;font-size:13px;color:#c9d0ea;">${esc(EVENT_ADDRESS)}</div>
    <div style="padding-top:14px;">${btn(`${SITE}/book?day=7`, "RSVP now", true)}<a href="${SITE}/#startups" style="${H}display:inline-block;padding:13px 4px;font-size:13px;font-weight:bold;color:${SKY};text-decoration:none;">See all ten profiles</a></div>
  </td></tr></table>
</td></tr>
</table>

<p style="max-width:600px;margin:16px auto 0;${F}font-size:11px;line-height:16px;color:#9aa0b2;text-align:left;">Hosted by Korea's Ministry of SMEs and Startups and KISED, with LodestarT in Singapore. If you'd rather not hear from ${me} about events like this, just reply and let ${me} know.</p>
</td></tr></table>
</body></html>`;

  const plain = (x: string) =>
    x.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, "—");
  const text = [
    "{{GREETING}}",
    "",
    ...note.map(plain).flatMap((l) => [l, ""]),
    "Warm regards,",
    ...(team ? [sign] : ["Tammy Ahn", "Vice Chairman of Korea Chamber of Commerce in Singapore"]),
    "",
    "----",
    "KOREA'S CLIMATE-TECH NATIONAL TEAM · SINGAPORE, 28–29 OCTOBER 2026",
    "The final ten of the 2026 Climate-tech Startup Challenge (Korea's Ministry of SMEs and Startups × KAIST).",
    "",
    `${EVENT_DAY_SHORT}: Demo Day at ${EVENT_VENUE}. Doors ${doors}, pitching ${pitchStart}, dinner after.`,
    ...(ONE_ON_ONE_OPEN ? [`Thu 29 Oct: Private 1:1 meetings, ${MEETUP_TIME} at ${MEETUP_VENUE}.`] : []),
    `RSVP: ${SITE}/book?day=7`,
    ...(ONE_ON_ONE_OPEN ? [`Book a 1:1: ${SITE}/book?day=5`] : []),
    "",
    "Already at work in Singapore:",
    "- MCE signed an MOU with Temasek Polytechnic for joint R&D, and joined Green Thumbs 2026, where Minister of State Alvin Tan set out Singapore's plan to expand skyrise greenery by 2030.",
    "- ReFeed is backed by institutional investors from Korea and Singapore.",
    "",
    ...LEAGUES.flatMap((L) => [`${L.title}: ${L.sub}`, ...L.slugs.map((slug) => `- ${name(slug)}${TOP_AWARD.has(slug) ? " (top award)" : ""}: ${SHORT[slug] ?? ""}`), ""]),
    "They are looking for: joint R&D, PoCs and pilots, investment.",
    `Pitching to judges from: ${judges.join(", ")}`,
    "",
    `Startup profiles: ${SITE}/#startups`,
    "",
    `If you'd rather not hear from ${me} about events like this, just reply and let ${me} know.`,
  ].join("\n");

  // Subject follows the note now that the "Korea keeps choosing Singapore" opener is gone.
  return { subject: "Korea's Climate-Tech National Team is coming to Singapore on 28 October", html, text };
}
