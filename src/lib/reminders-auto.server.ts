// Scheduled reminder batches for the Apps Script mailer. Built from the live
// DB at send time, so late registrations and changed bookings are included.
import { supabaseAdmin } from "./supabase-admin.server";
import { buildConfirmation, type ConfirmationEmail, type MailKind } from "./confirmation";
import { buildThankYou } from "./thanks";
import { companies } from "@/data/companies";

export const REMINDER_KINDS: MailKind[] = ["week", "3day", "meetup-eve", "demo-eve"];

export async function buildReminderBatch(kind: MailKind): Promise<(ConfirmationEmail & { to: string })[]> {
  const [{ data: rsvps, error: e1 }, { data: bookings, error: e2 }] = await Promise.all([
    supabaseAdmin.from("rsvps").select("full_name, email, attend_showcase, attend_lunch"),
    supabaseAdmin.from("bookings").select("full_name, email, timeslot_id, company_id"),
  ]);
  if (e1 || e2) throw new Error(`DB error: ${(e1 ?? e2)?.message}`);

  type Person = { name: string; showcase: boolean; lunch: boolean; meetings: { timeslot_id: string; company_id: string }[] };
  const people = new Map<string, Person>();
  for (const r of rsvps ?? []) {
    people.set(r.email.toLowerCase(), { name: r.full_name, showcase: r.attend_showcase, lunch: r.attend_lunch, meetings: [] });
  }
  for (const b of bookings ?? []) {
    const k = b.email.toLowerCase();
    const p: Person = people.get(k) ?? { name: b.full_name, showcase: false, lunch: false, meetings: [] };
    p.meetings.push({ timeslot_id: b.timeslot_id, company_id: b.company_id });
    people.set(k, p);
  }

  const out: (ConfirmationEmail & { to: string })[] = [];
  for (const [email, p] of people) {
    const demoDay = p.showcase || p.lunch;
    if (kind === "meetup-eve" && p.meetings.length === 0) continue;
    if (kind === "demo-eve" && !demoDay) continue;
    const mail = buildConfirmation({
      kind,
      fullName: p.name,
      // the 1:1 eve email only talks about the 1:1s; the Demo Day eve only about Demo Day
      attendShowcase: kind === "meetup-eve" ? false : p.showcase,
      attendLunch: kind === "meetup-eve" ? false : p.lunch,
      meetings: kind === "demo-eve" ? [] : p.meetings,
    });
    out.push({ to: email, ...mail });
  }
  return out.sort((a, b) => a.to.localeCompare(b.to));
}

// Thank-you batch: everyone who RSVP'd or booked a 1:1, minus the cohort
// startups and our own side (same org rules as the admin outreach export).
const normOrg = (v: string | null) => (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const COHORT = new Set(companies.flatMap((c) => [normOrg(c.name), normOrg(c.displayName), normOrg(c.slug)]).filter(Boolean));
const OWN_SIDE = ["lodestart", "kised", "koreainstituteofstartup"];

export async function buildThanksBatch(): Promise<(ConfirmationEmail & { to: string })[]> {
  const [{ data: rsvps, error: e1 }, { data: bookings, error: e2 }] = await Promise.all([
    supabaseAdmin.from("rsvps").select("full_name, email, organisation, checked_in_at"),
    supabaseAdmin.from("bookings").select("full_name, email, organisation"),
  ]);
  if (e1 || e2) throw new Error(`DB error: ${(e1 ?? e2)?.message}`);
  const people = new Map<string, { name: string; org: string; attended: boolean }>();
  for (const r of rsvps ?? []) people.set(r.email.toLowerCase().trim(), { name: r.full_name, org: r.organisation, attended: Boolean(r.checked_in_at) });
  for (const b of bookings ?? []) {
    const k = b.email.toLowerCase().trim();
    const p = people.get(k) ?? { name: b.full_name, org: b.organisation ?? "", attended: false };
    p.attended = true; // booked 1:1 meetings
    people.set(k, p);
  }
  const out: (ConfirmationEmail & { to: string })[] = [];
  for (const [email, p] of people) {
    const org = normOrg(p.org);
    if (email.endsWith("@lodestart.ai") || COHORT.has(org) || OWN_SIDE.some((o) => org.includes(o) || email.includes(o))) continue;
    out.push({ to: email, ...buildThankYou(p.name, p.attended) });
  }
  return out.sort((a, b) => a.to.localeCompare(b.to));
}
