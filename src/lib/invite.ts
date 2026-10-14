// Outreach invitation email, served by /api/invite and sent from the invite
// Google Sheet. `team` = signed by the LodestarT team (support@), otherwise by Tammy. Built from the same constants as the
// site, so a confirmed venue or time is picked up without touching the sheet.
// {{GREETING}} is replaced per recipient by the sheet script.
import { companies } from "@/data/companies";
import {
  EVENT_ADDRESS,
  EVENT_DATE,
  EVENT_NAME,
  EVENT_NAME_LINE1,
  EVENT_NAME_LINE2,
  EVENT_TIME,
  EVENT_VENUE,
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

export function buildInvite(team = false): { subject: string; html: string; text: string } {
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
