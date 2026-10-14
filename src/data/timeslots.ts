export interface Timeslot {
  id: string;
  label: string;
  time: string;
}

// ── 2026 Climate-tech Startup Challenge – Global Demo Day (KISED / 창업진흥원) ──
// Everything event-specific lives in this file, so a confirmed venue or time
// is a one-line change. Source: MYSC master sheet "창진원 2026년 기후테크
// 스타트업 챌린지" (timetable 0921, To-Do, Temasek Shophouse form), read
// 10 Oct. Programme 26–29 Oct; public days are the IR / Demo Day (28 Oct)
// and the 1:1 business meetings (29 Oct).
// Public site URL used in emails. ponytail: set once the Vercel project exists.
export const SITE_URL = "https://kised-rsvp-2026.vercel.app";
// Credits shown on the site: the two hosts only for now (client request,
// 10 Oct). MYSC / LodestarT may be added back later.
export const CREDITS = "Hosted by the Ministry of SMEs and Startups (MSS) and KISED";

export const EVENT_NAME = "2026 Climate-tech Startup Challenge – Global Demo Day";
export const EVENT_NAME_SHORT = "Climate-tech Startup Challenge";
export const EVENT_NAME_LINE1 = "2026 Climate-tech Startup Challenge";
export const EVENT_NAME_LINE2 = "Global Demo Day";

export const EVENT_DATE = "Wednesday, 28 October 2026";
export const EVENT_DAY_SHORT = "Wed 28 Oct";
export const EVENT_TIME = "14:30 – 20:00";
// Confirmed by Tammy, 14 Oct.
export const EVENT_VENUE = "Temasek Shophouse";
export const EVENT_ADDRESS = "28 Orchard Road, Singapore 238832";
export const EVENT_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Temasek+Shophouse+28+Orchard+Road+Singapore+238832";

// Public 1:1 self-booking, same model as KIMST/CMK.
export const ONE_ON_ONE_OPEN = true;

// 1:1 meetings Thu 29 Oct: two rounds starting 10:30 and 11:20 (Lodestart
// internship sheet, 12 Oct), 40 min each like CMK. IDs are stable references
// stored in bookings — change labels/times freely, never the ids.
export const TIMESLOTS: Timeslot[] = [
  { id: "slot1", label: "Round 1", time: "10:30 – 11:10" },
  { id: "slot2", label: "Round 2", time: "11:20 – 12:00" },
];
export const MEETUP_TIME = "10:30 – 12:00";
export const MEETUP_DATE = "Thursday, 29 October 2026";
export const MEETUP_DAY_SHORT = "Thu 29 Oct";
// NULDAM Space, confirmed by Tammy, 14 Oct.
export const MEETUP_VENUE = "NULDAM Space";
export const MEETUP_ADDRESS = "2 Orchard Link, #02-14/15, *SCAPE, Singapore 237978";
export const MEETUP_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=*SCAPE+2+Orchard+Link+Singapore+237978";

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
    description: "Opening remarks, an ecosystem talk, then ten startup pitches (5 min pitch, 5 min Q&A each). Registration from 14:30.",
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

// Demo Day run of show (timetable 0921). Shown on the RSVP page.
export const DEMO_AGENDA: [time: string, item: string][] = [
  ["14:30 – 15:00", "Registration"],
  ["15:00 – 15:25", "Opening and welcome remarks"],
  ["15:25 – 15:50", "Talk: the climate-tech ecosystem in Singapore"],
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
