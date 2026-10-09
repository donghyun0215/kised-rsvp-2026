export interface Timeslot {
  id: string;
  label: string;
  time: string;
}

// ── 2026 Climate Tech Startup Challenge · Singapore (KISED / 창업진흥원) ──
// Everything event-specific lives in this file, so a confirmed venue or time
// is a one-line change. Source: "Lodestart Internship" sheet, Schedule tab
// (9 Oct): programme 26–30 Oct, Demo Day Wed 28 Oct 14:30–20:30, 1:1
// meetings Thu 29 Oct (10:00 / 11:00, two per startup). Venues TBD.
// Event name taken from the one-pager template footer ("2026 Climate Tech
// Startup Challenge – Singapore"); confirm the official English name with
// KISED before launch.
// Public site URL used in emails. ponytail: set once the Vercel project exists.
export const SITE_URL = "https://kised-rsvp-2026.vercel.app";
export const HOST_NAME = "Korea Institute of Startup & Entrepreneurship Development (KISED)";

export const EVENT_NAME = "2026 Climate Tech Startup Challenge Singapore";
export const EVENT_NAME_SHORT = "Climate Tech Startup Challenge";
export const EVENT_NAME_LINE1 = "2026 Climate Tech Startup Challenge";
export const EVENT_NAME_LINE2 = "Singapore Demo Day";

export const EVENT_DATE = "Wednesday, 28 October 2026";
export const EVENT_DAY_SHORT = "Wed 28 Oct";
export const EVENT_TIME = "14:30 – 20:30";
// Venue not confirmed yet: leave MAP_URL empty and the UI shows no map link.
export const EVENT_VENUE = "Venue to be announced";
export const EVENT_ADDRESS = "Singapore";
export const EVENT_MAP_URL = "";

// Public 1:1 self-booking, same model as KIMST/CMK.
export const ONE_ON_ONE_OPEN = true;

// 1:1 rounds on Thu 29 Oct. IDs are stable references stored in bookings —
// change labels/times freely, never the ids. Round length assumed 50 min
// (sheet only gives start times 10:00 / 11:00) — confirm.
export const TIMESLOTS: Timeslot[] = [
  { id: "slot1", label: "Round 1", time: "10:00 – 10:50" },
  { id: "slot2", label: "Round 2", time: "11:00 – 11:50" },
];
export const MEETUP_TIME = "10:00 – 11:50";
export const MEETUP_DATE = "Thursday, 29 October 2026";
export const MEETUP_DAY_SHORT = "Thu 29 Oct";
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
// attend_meetups). "lunch" is the evening networking — legacy column name.
// Pitch/networking split (17:30) follows the intern application form; TBC.
export const PROGRAM: ProgramBlock[] = [
  {
    id: "showcase",
    title: "Startup Pitches",
    time: "14:30 – 17:30",
    description: "Ten Korean climate tech startups pitch to investors, corporates and agencies. Registration from 14:30.",
  },
  {
    id: "lunch",
    title: "Networking",
    time: "17:30 – 20:30",
    description: "Meet the founders and the investors, corporates and partners in the room.",
  },
  {
    id: "meetups",
    title: "1:1 Business Meetings",
    time: `${MEETUP_DAY_SHORT} · ${MEETUP_TIME}`,
    description: "Private meetings with the startups of your choice, the morning after the Demo Day.",
  },
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
