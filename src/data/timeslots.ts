export interface Timeslot {
  id: string;
  label: string;
  time: string;
}

// ── 2026 Climate Tech Startup Challenge · Singapore (KISED / 창업진흥원) ──
// Everything event-specific lives in this file, so a confirmed venue or time
// is a one-line change. Source: MYSC master sheet "창진원 2026년 기후테크
// 스타트업 챌린지" (timetable 0921, To-Do, Temasek Shophouse form), read
// 10 Oct. Programme 26–29 Oct; public days are the IR / Demo Day (28 Oct)
// and the 1:1 business meetings (29 Oct).
// Public site URL used in emails. ponytail: set once the Vercel project exists.
export const SITE_URL = "https://kised-rsvp-2026.vercel.app";
// Per the Temasek Shophouse application: hosted by MSS & KISED, operated by
// MYSC, partners New Energy Nexus & LodestarT.
export const HOST_NAME = "Korea Institute of Startup & Entrepreneurship Development (KISED)";
export const CREDITS = "Hosted by the Ministry of SMEs and Startups (MSS) and KISED · Operated by MYSC · Partners: New Energy Nexus, LodestarT";

export const EVENT_NAME = "2026 Climate Tech Startup Challenge Singapore";
export const EVENT_NAME_SHORT = "Climate Tech Startup Challenge";
export const EVENT_NAME_LINE1 = "2026 Climate Tech Startup Challenge";
export const EVENT_NAME_LINE2 = "Climate Tech IR / Demo Day";

export const EVENT_DATE = "Wednesday, 28 October 2026";
export const EVENT_DAY_SHORT = "Wed 28 Oct";
export const EVENT_TIME = "14:30 – 20:00";
// Temasek Shophouse is plan A (application filed via CIIP); plan B is The
// Foundry / Marina One. Drop "(to be confirmed)" once approval lands.
export const EVENT_VENUE = "Temasek Shophouse (to be confirmed)";
export const EVENT_ADDRESS = "28 Orchard Road, Singapore 238832";
export const EVENT_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Temasek+Shophouse+28+Orchard+Road+Singapore+238832";

// Public 1:1 self-booking, same model as KIMST/CMK.
export const ONE_ON_ONE_OPEN = true;

// 1:1 meetings Thu 29 Oct 10:00–12:00, "about 30 min each, at least two per
// startup" (timetable 0921). Four 25-min rounds with a 5-min changeover fit
// that window. IDs are stable references stored in bookings — change
// labels/times freely, never the ids.
export const TIMESLOTS: Timeslot[] = [
  { id: "slot1", label: "Round 1", time: "10:00 – 10:25" },
  { id: "slot2", label: "Round 2", time: "10:30 – 10:55" },
  { id: "slot3", label: "Round 3", time: "11:00 – 11:25" },
  { id: "slot4", label: "Round 4", time: "11:30 – 11:55" },
];
export const MEETUP_TIME = "10:00 – 12:00";
export const MEETUP_DATE = "Thursday, 29 October 2026";
export const MEETUP_DAY_SHORT = "Thu 29 Oct";
// Plan A is a NULDAM café buy-out (1:1s + one-pager display); not booked yet.
export const MEETUP_VENUE = "Venue to be announced";
export const MEETUP_ADDRESS = "Singapore";
export const MEETUP_MAP_URL = "";

// Kept for API compatibility with the booking engine; every company offers
// every round.
export const ROUND3_COMPANY_SLUGS: string[] = [];
export function isSlotOffered(_companySlug: string, _timeslotId: string): boolean {
  return true;
}

export interface ProgramBlock {
  id: "showcase" | "lunch" | "meetups";
  title: string;
  time: string;
  description: string;
}

// NOTE: ids map to RSVP columns (attend_showcase / attend_lunch /
// attend_meetups). "lunch" is the networking dinner — legacy column name.
export const PROGRAM: ProgramBlock[] = [
  {
    id: "showcase",
    title: "Talks & IR pitching",
    time: "15:00 – 18:30",
    description: "Opening remarks, an ecosystem talk and panel, then ten startup pitches (5 min pitch, 5 min Q&A each). Registration from 14:30.",
  },
  {
    id: "lunch",
    title: "Networking dinner",
    time: "18:30 – 20:00",
    description: "Catered dinner with the founders, investors, corporates and partners in the room.",
  },
  {
    id: "meetups",
    title: "1:1 Business Meetings",
    time: `${MEETUP_DAY_SHORT} · ${MEETUP_TIME}`,
    description: "Private meetings with the startups of your choice, the morning after the Demo Day.",
  },
];

// Demo Day run of show (timetable 0921, TBC). Shown on the RSVP page.
export const DEMO_AGENDA: [time: string, item: string][] = [
  ["14:30 – 15:00", "Registration"],
  ["15:00 – 15:25", "Opening and welcome remarks"],
  ["15:25 – 16:05", "Talk and panel: climate tech in Singapore"],
  ["16:15 – 17:10", "IR pitching, session 1 (5 startups)"],
  ["17:20 – 18:10", "IR pitching, session 2 (5 startups)"],
  ["18:10 – 18:30", "Judges' deliberation and group photo"],
  ["18:30 – 20:00", "Networking dinner"],
];

// ── Legacy side-track exports (no side track on this event) ─────────
export const NULDAM_VENUE = "";
export const NULDAM_ADDRESS = "";
export const NULDAM_MAP_URL = "";
export interface NuldamTrack {
  id: "track1" | "track2";
  dateLabel: string;
  timeRange: string;
  slots: Timeslot[];
}
export const NULDAM_TRACKS: NuldamTrack[] = [];
export const NULDAM_COMPANY_SLUGS: Record<"track1" | "track2", string[]> = { track1: [], track2: [] };
export function isNuldamCompany(_slug: string): boolean {
  return false;
}

export interface SlotInfo {
  label: string;
  time: string;
  context: string;
}

const slotIndex: Record<string, SlotInfo> = {};
for (const t of TIMESLOTS) {
  slotIndex[t.id] = { label: `1:1 ${t.label}`, time: t.time, context: `Business Meetings · ${MEETUP_DATE}` };
}

export function getSlotInfo(id: string): SlotInfo {
  return slotIndex[id] ?? { label: id, time: "", context: "" };
}
