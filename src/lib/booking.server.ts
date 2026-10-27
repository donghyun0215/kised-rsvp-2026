import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "./supabase-admin.server";
import { MEETUP_COMPANIES } from "@/data/companies";
import { TIMESLOTS } from "@/data/timeslots";
import { buildConfirmation } from "./confirmation";
import { absUrl } from "./url";

export interface BookingInput {
  companySlug: string;
  timeslotId: string;
  fullName: string;
  organisation: string;
  jobTitle: string;
  email: string;
  phone: string;
  primaryInterest: string;
  notes?: string;
}

export type BookingResult =
  | { ok: true }
  | { ok: false; error: "slot_taken" | "already_booked_this_session" | "unknown"; message: string };

type EventType = "booked" | "cancelled_by_user" | "cancelled_by_admin";

interface EventSnapshot {
  booking_id: string;
  company_id: string;
  timeslot_id: string;
  full_name: string;
  organisation: string | null;
  email: string;
}

// Best-effort audit log write — never blocks or fails the booking/cancel
// operation itself. The `bookings` row (or DB unique constraints) is always
// the source of truth for availability; this table is a read-only trail.
async function logEvent(eventType: EventType, snapshot: EventSnapshot) {
  const { error } = await supabaseAdmin.from("booking_events").insert({
    event_type: eventType,
    booking_id: snapshot.booking_id,
    company_id: snapshot.company_id,
    timeslot_id: snapshot.timeslot_id,
    full_name: snapshot.full_name,
    organisation: snapshot.organisation,
    email: snapshot.email,
  });
  if (error) {
    console.error(`logEvent(${eventType}) error:`, error);
  }
}

export const createBooking = createServerFn({ method: "POST" })
  .validator((data: BookingInput) => data)
  .handler(async ({ data }): Promise<BookingResult> => {
    const {
      companySlug,
      timeslotId,
      fullName,
      organisation,
      jobTitle,
      email,
      phone,
      primaryInterest,
      notes,
    } = data;

    if (!companySlug || !timeslotId || !fullName || !organisation || !jobTitle || !email || !phone) {
      return { ok: false, error: "unknown", message: "Missing required fields." };
    }
    if (!MEETUP_COMPANIES.some((c) => c.slug === companySlug) || !TIMESLOTS.some((t) => t.id === timeslotId)) {
      return { ok: false, error: "unknown", message: "1:1 meetings aren't available for this startup." };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: inserted, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        company_id: companySlug,
        timeslot_id: timeslotId,
        full_name: fullName,
        organisation,
        job_title: jobTitle,
        email: normalizedEmail,
        phone,
        primary_interest: primaryInterest,
        notes: notes ?? null,
      })
      .select("id")
      .single();

    if (error) {
      // Postgres unique_violation
      if (error.code === "23505") {
        if (error.message.includes("bookings_company_timeslot_key")) {
          return {
            ok: false,
            error: "slot_taken",
            message: "Someone just booked this slot. Please pick another one.",
          };
        }
        if (error.message.includes("bookings_email_timeslot_key")) {
          return {
            ok: false,
            error: "already_booked_this_session",
            message: "This email already has a meeting booked in this session.",
          };
        }
        return { ok: false, error: "slot_taken", message: "This slot is no longer available." };
      }
      console.error("createBooking error:", error);
      return { ok: false, error: "unknown", message: "Something went wrong. Please try again." };
    }

    await logEvent("booked", {
      booking_id: inserted.id,
      company_id: companySlug,
      timeslot_id: timeslotId,
      full_name: fullName,
      organisation,
      email: normalizedEmail,
    });

    return { ok: true };
  });

export const fetchBookedSlots = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.from("bookings").select("company_id, timeslot_id");
  if (error) {
    console.error("fetchBookedSlots error:", error);
    return [] as { company_id: string; timeslot_id: string }[];
  }
  return data;
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "lodestart.ai";
// Forgiving match: phones auto-capitalise the first letter and chat apps
// (KakaoTalk, WhatsApp) often add a trailing space/newline when the password
// is copied — both locked MYSC out on 23 Sep. Case and surrounding whitespace
// don't matter; the characters do.
function isAdmin(pw: string | undefined): boolean {
  const norm = (v: string) => v.normalize("NFKC").trim().toLowerCase();
  return typeof pw === "string" && norm(pw) === norm(ADMIN_PASSWORD);
}

export interface MyBooking {
  id: string;
  company_id: string;
  timeslot_id: string;
  full_name: string;
  created_at: string;
}

export const lookupBookingsByEmail = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<MyBooking[]> => {
    const email = data.email?.toLowerCase().trim();
    if (!email || !email.includes("@")) return [];
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("id, company_id, timeslot_id, full_name, created_at")
      .eq("email", email)
      .order("timeslot_id", { ascending: true });
    if (error) {
      console.error("lookupBookingsByEmail error:", error);
      return [];
    }
    return rows as MyBooking[];
  });

export const selfCancelBooking = createServerFn({ method: "POST" })
  .validator((data: { email: string; id: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const email = data.email?.toLowerCase().trim();
    if (!email || !data.id) return { ok: false };
    // Delete only if the booking id belongs to this email — the email acts
    // as the owner check, so nobody can cancel someone else's booking by id.
    const { data: deleted, error } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", data.id)
      .eq("email", email)
      .select("id, company_id, timeslot_id, full_name, organisation, email");
    if (error) {
      console.error("selfCancelBooking error:", error);
      return { ok: false };
    }
    const row = deleted?.[0];
    if (!row) return { ok: false };

    await logEvent("cancelled_by_user", {
      booking_id: row.id,
      company_id: row.company_id,
      timeslot_id: row.timeslot_id,
      full_name: row.full_name,
      organisation: row.organisation,
      email: row.email,
    });

    return { ok: true };
  });

export interface AdminBooking {
  id: string;
  company_id: string;
  timeslot_id: string;
  full_name: string;
  organisation: string;
  job_title: string;
  email: string;
  phone: string;
  primary_interest: string | null;
  notes: string | null;
  created_at: string;
}

export const adminListBookings = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true; bookings: AdminBooking[] } | { ok: false }> => {
    if (!isAdmin(data.password)) {
      return { ok: false };
    }
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("adminListBookings error:", error);
      return { ok: true, bookings: [] };
    }
    return { ok: true, bookings: rows as AdminBooking[] };
  });

// Rename an attendee everywhere their name shows (RSVP, lounge, reminders and
// every 1:1 booking under the same email) — e.g. a company swaps the person
// attending. Email is the key and stays unchanged.
export const adminRenameAttendee = createServerFn({ method: "POST" })
  .validator((data: { password: string; email: string; fullName: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    if (!isAdmin(data.password)) return { ok: false, message: "Not authorised." };
    const email = data.email?.toLowerCase().trim();
    const fullName = data.fullName?.trim();
    if (!email || !fullName) return { ok: false, message: "Name is required." };
    const now = new Date().toISOString();
    const r1 = await supabaseAdmin.from("rsvps").update({ full_name: fullName, updated_at: now }).eq("email", email);
    const r2 = await supabaseAdmin.from("bookings").update({ full_name: fullName }).eq("email", email);
    if (r1.error || r2.error) {
      console.error("adminRenameAttendee error:", r1.error ?? r2.error);
      return { ok: false, message: "Could not save. Please try again." };
    }
    return { ok: true };
  });

export const adminCancelBooking = createServerFn({ method: "POST" })
  .validator((data: { password: string; id: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!isAdmin(data.password)) {
      return { ok: false };
    }
    const { data: deleted, error } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", data.id)
      .select("id, company_id, timeslot_id, full_name, organisation, email");
    if (error) {
      console.error("adminCancelBooking error:", error);
      return { ok: false };
    }
    const row = deleted?.[0];
    if (!row) return { ok: false };

    await logEvent("cancelled_by_admin", {
      booking_id: row.id,
      company_id: row.company_id,
      timeslot_id: row.timeslot_id,
      full_name: row.full_name,
      organisation: row.organisation,
      email: row.email,
    });

    return { ok: true };
  });

export interface BookingEvent {
  id: string;
  event_type: EventType;
  booking_id: string;
  company_id: string;
  timeslot_id: string;
  full_name: string;
  organisation: string | null;
  email: string;
  created_at: string;
}

export const adminListEvents = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true; events: BookingEvent[] } | { ok: false }> => {
    if (!isAdmin(data.password)) {
      return { ok: false };
    }
    const { data: rows, error } = await supabaseAdmin
      .from("booking_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("adminListEvents error:", error);
      return { ok: true, events: [] };
    }
    return { ok: true, events: rows as BookingEvent[] };
  });

// ── RSVP (showcase / lunch / meetups) ──────────────────────────

export interface RsvpInput {
  fullName: string;
  organisation: string;
  jobTitle: string;
  email: string;
  phone: string;
  primaryInterest: string;
  notes?: string;
  additionalAttendees?: string;
  contactUrl?: string;
  showInLounge?: boolean;
  attendShowcase: boolean;
  attendLunch: boolean;
  attendMeetups: boolean;
  meetupSelections: { timeslotId: string; companySlug: string }[];
}

export interface RsvpResult {
  rsvpOk: boolean;
  message?: string;
  bookingResults: { timeslotId: string; companySlug: string; ok: boolean; message?: string }[];
  emailSent?: boolean; // confirmation email accepted by the mailer
}

export const createRsvp = createServerFn({ method: "POST" })
  .validator((data: RsvpInput) => data)
  .handler(async ({ data }): Promise<RsvpResult> => {
    const email = data.email?.toLowerCase().trim();
    if (!data.fullName || !data.organisation || !data.jobTitle || !email || !data.phone) {
      return { rsvpOk: false, message: "Missing required fields.", bookingResults: [] };
    }
    if (!data.attendShowcase && !data.attendLunch && !data.attendMeetups) {
      return { rsvpOk: false, message: "Please select at least one session.", bookingResults: [] };
    }

    // Upsert by email — re-submitting updates your choices.
    const { error: rsvpError } = await supabaseAdmin.from("rsvps").upsert(
      {
        full_name: data.fullName,
        organisation: data.organisation,
        job_title: data.jobTitle,
        email,
        phone: data.phone,
        primary_interest: data.primaryInterest,
        notes: data.notes ?? null,
        additional_attendees: data.additionalAttendees?.trim() || null,
        contact_url: absUrl(data.contactUrl) || null,
        show_in_lounge: data.showInLounge ?? true,
        attend_showcase: data.attendShowcase,
        attend_lunch: data.attendLunch,
        attend_meetups: data.attendMeetups,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
    if (rsvpError) {
      console.error("createRsvp upsert error:", rsvpError);
      return { rsvpOk: false, message: "Something went wrong. Please try again.", bookingResults: [] };
    }

    // Book selected 1:1 meetups (each slot independent — one failing doesn't
    // void the RSVP or the other slot).
    const bookingResults: RsvpResult["bookingResults"] = [];
    if (data.attendMeetups) {
      // One pick per round, capped at the number of rounds (was a hardcoded 3 —
      // would have silently dropped the 4th pick once Round 1 was added).
      for (const sel of data.meetupSelections.slice(0, TIMESLOTS.length)) {
        if (!MEETUP_COMPANIES.some((c) => c.slug === sel.companySlug) || !TIMESLOTS.some((t) => t.id === sel.timeslotId)) {
          bookingResults.push({ ...sel, ok: false, message: "This 1:1 slot isn't available." });
          continue;
        }
        const { data: inserted, error } = await supabaseAdmin
          .from("bookings")
          .insert({
            company_id: sel.companySlug,
            timeslot_id: sel.timeslotId,
            full_name: data.fullName,
            organisation: data.organisation,
            job_title: data.jobTitle,
            email,
            phone: data.phone,
            primary_interest: data.primaryInterest,
            notes: data.notes ?? null,
          })
          .select("id")
          .single();

        if (error) {
          let message = "Something went wrong.";
          if (error.code === "23505") {
            message = error.message.includes("bookings_email_timeslot_key")
              ? "You already have a meeting in this round."
              : "Someone just booked this slot.";
          } else {
            console.error("createRsvp booking error:", error);
          }
          bookingResults.push({ ...sel, ok: false, message });
        } else {
          await logEvent("booked", {
            booking_id: inserted.id,
            company_id: sel.companySlug,
            timeslot_id: sel.timeslotId,
            full_name: data.fullName,
            organisation: data.organisation,
            email,
          });
          bookingResults.push({ ...sel, ok: true });
        }
      }
    }

    const emailSent = await sendConfirmation(email, data);
    return { rsvpOk: true, bookingResults, emailSent };
  });

// Auto confirmation email via an Apps Script web app deployed from
// support@lodestart.ai (it sends from that Gmail). Off until both env vars
// are set in Vercel. Never blocks or fails the RSVP: errors are logged and
// the call gives up after 8s.
async function sendConfirmation(email: string, data: RsvpInput): Promise<boolean> {
  const url = process.env.CONFIRMATION_WEBHOOK_URL;
  const token = process.env.CONFIRMATION_WEBHOOK_TOKEN;
  if (!url || !token) return false;
  try {
    // All of this guest's bookings (including earlier submissions), so a
    // re-submit sends the full, current schedule.
    const { data: rows } = await supabaseAdmin.from("bookings").select("timeslot_id, company_id").eq("email", email);
    const mail = buildConfirmation({
      fullName: data.fullName,
      attendShowcase: data.attendShowcase,
      attendLunch: data.attendLunch,
      meetings: rows ?? [],
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, to: email, ...mail }),
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    const out = await res.text();
    if (!out.includes('"ok":true')) {
      console.error("confirmation email not sent:", res.status, out.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error("confirmation email error:", err);
    return false;
  }
}

export interface AdminRsvp {
  id: string;
  full_name: string;
  organisation: string;
  job_title: string;
  email: string;
  phone: string;
  primary_interest: string | null;
  notes: string | null;
  additional_attendees: string | null;
  contact_url: string | null;
  show_in_lounge: boolean;
  attend_showcase: boolean;
  attend_lunch: boolean;
  attend_meetups: boolean;
  checked_in_at: string | null;
  checked_in_via: string | null;
  created_at: string;
  updated_at: string | null;
}

export const adminListRsvps = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true; rsvps: AdminRsvp[] } | { ok: false }> => {
    if (!isAdmin(data.password)) {
      return { ok: false };
    }
    const { data: rows, error } = await supabaseAdmin
      .from("rsvps")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("adminListRsvps error:", error);
      return { ok: true, rsvps: [] };
    }
    return { ok: true, rsvps: rows as AdminRsvp[] };
  });

export const lookupRsvpByEmail = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<{ attend_showcase: boolean; attend_lunch: boolean; attend_meetups: boolean } | null> => {
    const email = data.email?.toLowerCase().trim();
    if (!email || !email.includes("@")) return null;
    const { data: row, error } = await supabaseAdmin
      .from("rsvps")
      .select("attend_showcase, attend_lunch, attend_meetups")
      .eq("email", email)
      .maybeSingle();
    if (error) {
      console.error("lookupRsvpByEmail error:", error);
      return null;
    }
    return row;
  });

// ── Virtual Networking Lounge ──────────────────────────────────────
// Soft-gated attendee wall. Never returns email/phone — a gate bypass can
// only see what a name badge already shows.

const LOUNGE_ACCESS_KEY = process.env.LOUNGE_ACCESS_KEY; // no fallback on purpose
// The entrance QR (printed for 28 Oct) carries its own key. Only its SHA-256
// lives here (public repo), so it works without touching Vercel env.
const ENTRANCE_KEY_SHA256 = "8070362f387c2eda24739d9299e90d1b0526bfcee8b687e989652191d915d0e6";
async function keyOk(k?: string): Promise<boolean> {
  if (!k) return false;
  if (LOUNGE_ACCESS_KEY && k === LOUNGE_ACCESS_KEY) return true;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(k));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("") === ENTRANCE_KEY_SHA256;
}

// Addresses/domains ("@x.com") that may RSVP but are kept out of the lounge.
const LOUNGE_BLOCKED: string[] = [];
const isLoungeBlocked = (email?: string | null) => {
  const e = String(email ?? "").toLowerCase().trim();
  return !!e && LOUNGE_BLOCKED.some((b) => (b.startsWith("@") ? e.endsWith(b) : e === b));
};

export interface LoungeProfile {
  id: string;
  full_name: string;
  organisation: string;
  job_title: string;
  primary_interest: string | null;
  contact_url: string | null;
}

export const listLoungeProfiles = createServerFn({ method: "POST" })
  .validator((data: { key?: string; email?: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true; profiles: LoungeProfile[] } | { ok: false }> => {
    let authorised = false;
    if (isLoungeBlocked(data.email)) return { ok: false };
    if (await keyOk(data.key)) {
      authorised = true;
    } else if (data.email) {
      const email = data.email.toLowerCase().trim();
      const { data: row } = await supabaseAdmin
        .from("rsvps")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      authorised = Boolean(row);
    }
    if (!authorised) return { ok: false };

    const { data: rows, error } = await supabaseAdmin
      .from("rsvps")
      .select("id, full_name, organisation, job_title, primary_interest, contact_url, email")
      .eq("show_in_lounge", true)
      .order("full_name", { ascending: true });
    if (error) {
      console.error("listLoungeProfiles error:", error);
      return { ok: false };
    }
    // Email is only used to drop blocked attendees — it never leaves the server.
    const profiles = (rows ?? [])
      .filter((r) => !isLoungeBlocked(r.email))
      .map(({ email: _email, ...p }) => p);
    return { ok: true, profiles };
  });

// Update just the contact link for an existing RSVP — the low-friction path
// so attendees (or the organiser, on their behalf) never re-submit the form.
export const updateContactUrl = createServerFn({ method: "POST" })
  .validator((data: { email: string; contactUrl: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const email = data.email?.toLowerCase().trim();
    if (!email) return { ok: false, message: "Email is required." };
    let url = data.contactUrl?.trim() ?? "";
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;

    const { data: updated, error } = await supabaseAdmin
      .from("rsvps")
      .update({ contact_url: url || null, updated_at: new Date().toISOString() })
      .eq("email", email)
      .select("id");
    if (error) {
      console.error("updateContactUrl error:", error);
      return { ok: false, message: "Something went wrong. Please try again." };
    }
    if (!updated?.length) {
      return { ok: false, message: "No RSVP found with this email. Please RSVP first." };
    }
    return { ok: true };
  });

// ── 1:1 meeting roster for the internal schedule page ──────────────
// One-line attendee profiles per booking, behind the roster password
// (same as /admin) since 6 Oct: the tab now also carries each booker's
// email and phone so startups and interns can reach their meeting partners.

export interface RosterEntry {
  company_id: string;
  timeslot_id: string;
  full_name: string;
  organisation: string;
  job_title: string;
  primary_interest: string | null;
  contact_url: string | null;
  email: string;
  phone: string | null;
}

export const fetchMeetingRoster = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data: input }): Promise<{ ok: true; entries: RosterEntry[] } | { ok: false }> => {
    if (!isAdmin(input.password)) return { ok: false };
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("company_id, timeslot_id, full_name, organisation, job_title, primary_interest, email, phone");
    if (error) {
      console.error("fetchMeetingRoster error:", error);
      return { ok: true, entries: [] };
    }

    // Attach lounge contact links, but only for attendees who opted in.
    const { data: rsvps } = await supabaseAdmin
      .from("rsvps")
      .select("email, contact_url, show_in_lounge");
    const links = new Map<string, string | null>();
    for (const r of rsvps ?? []) {
      if (r.show_in_lounge && r.contact_url) links.set(String(r.email).toLowerCase(), r.contact_url);
    }

    const entries: RosterEntry[] = (data ?? []).map((b) => ({
      company_id: b.company_id,
      timeslot_id: b.timeslot_id,
      full_name: b.full_name,
      organisation: b.organisation,
      job_title: b.job_title,
      primary_interest: b.primary_interest,
      contact_url: links.get(String(b.email).toLowerCase()) ?? null,
      email: String(b.email ?? ""),
      phone: b.phone ?? null,
    }));
    return { ok: true, entries };
  });

// ── Attendance check-in (2026-08-30) ───────────────────────────────
// Only the on-site QR proves physical presence: check-in requires BOTH the
// lounge key (printed at the entrance desk) and a registered email. Remote
// email-only lounge entry never marks attendance. Idempotent — the first
// scan wins and later entries don't overwrite the timestamp.
export const markLoungeCheckIn = createServerFn({ method: "POST" })
  .validator((data: { key?: string; email: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    // CMK lesson: badge QR check-ins weren't always landing, so during
    // Demo Day hours any lounge entry with a registered email counts as
    // attendance. ponytail: hardcoded window; make it an admin setting next event.
    const keyValid = await keyOk(data.key);
    const now = Date.now();
    const eventLive = now >= Date.parse("2026-10-28T12:00:00+08:00") && now <= Date.parse("2026-10-28T22:00:00+08:00");
    if (!keyValid && !eventLive) return { ok: false };
    const email = data.email?.toLowerCase().trim();
    if (!email) return { ok: false };
    const { error } = await supabaseAdmin
      .from("rsvps")
      .update({ checked_in_at: new Date().toISOString(), checked_in_via: keyValid ? "qr" : "lounge" })
      .eq("email", email)
      .is("checked_in_at", null);
    if (error) {
      console.error("markLoungeCheckIn error:", error);
      return { ok: false };
    }
    return { ok: true };
  });

// ── Self check-in by name (2026-10-24) ─────────────────────────────
// The entrance QR (key) opens a name search instead of an email box, and
// walk-ins register on the same screen. Picking a name records attendance
// but never hands the email to the browser, so it only opens the public
// wall; My Contacts still asks for the RSVP email. Outside the event window
// the QR still opens the lounge, it just doesn't count anyone.
// ponytail: hardcoded window, same as markLoungeCheckIn.
const CHECKIN_FROM = Date.parse("2026-10-28T12:00:00+08:00");
const CHECKIN_TO = Date.parse("2026-10-28T22:00:00+08:00");
const loungeKeyOk = (k?: string) => keyOk(k);
const checkInLive = () => Date.now() >= CHECKIN_FROM && Date.now() <= CHECKIN_TO;

// Case, punctuation, word order and common romanisation variants don't matter.
const foldName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/eo/g, "u").replace(/oo/g, "u").replace(/ee/g, "i").replace(/ou/g, "u")
    .replace(/rh/g, "r").replace(/\b(yi|ri)\b/g, "li")
    .replace(/gw/g, "kw").replace(/ch/g, "j").replace(/sh/g, "s")
    // k/g, t/d, p/b are spelled either way in Korean names (Kim/Gim, Dae/Tae)
    .replace(/k/g, "g").replace(/t/g, "d").replace(/p/g, "b")
    .replace(/\bwu/g, "u")
    .replace(/\s+/g, " ")
    .trim();

// Hangul → Revised Romanisation, syllable by syllable, so "김동현" finds
// "DongHyun Kim" and an English query finds a name typed in Korean.
const RR_L = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const RR_V = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const RR_T = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
const romanise = (s: string) =>
  Array.from(s, (ch) => {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) return ch;
    return RR_L[Math.floor(c / 588)] + RR_V[Math.floor((c % 588) / 28)] + RR_T[c % 28];
  }).join("");
// How common surnames are actually spelled in passports and email signatures.
const SURNAMES: Record<string, string[]> = {
  김: ["kim", "gim"], 이: ["lee", "yi", "rhee", "li", "i"], 박: ["park", "pak", "bak"], 최: ["choi", "choe"],
  정: ["jung", "jeong", "chung"], 강: ["kang", "gang"], 조: ["cho", "jo"], 윤: ["yoon", "yun"], 장: ["jang", "chang"],
  임: ["lim", "im", "yim"], 한: ["han"], 오: ["oh", "o"], 서: ["seo", "suh"], 신: ["shin", "sin"], 권: ["kwon", "gwon"],
  황: ["hwang"], 안: ["ahn", "an"], 송: ["song"], 류: ["ryu", "yoo", "yu", "rhew"], 유: ["yoo", "yu"], 전: ["jeon", "chun", "jun"],
  홍: ["hong"], 고: ["ko", "go"], 문: ["moon", "mun"], 양: ["yang"], 손: ["son", "sohn"], 배: ["bae", "pae"], 백: ["baek", "paik", "baik"],
  허: ["heo", "huh", "hur"], 남: ["nam"], 노: ["noh", "roh", "no"], 하: ["ha"], 곽: ["kwak", "gwak"], 성: ["sung", "seong"],
  차: ["cha"], 주: ["joo", "ju", "chu"], 우: ["woo", "u"], 구: ["koo", "ku", "gu"], 민: ["min"], 진: ["jin", "chin"], 나: ["na", "ra"],
  지: ["ji", "chi"], 엄: ["um", "eom"], 원: ["won"], 천: ["chun", "cheon"], 방: ["bang"], 공: ["kong", "gong"], 현: ["hyun", "hyeon"],
  함: ["ham"], 변: ["byun", "byeon"], 염: ["yeom", "yum"], 여: ["yeo", "yuh"], 추: ["choo", "chu"], 도: ["do", "doh"], 석: ["seok", "suk"],
  선: ["sun", "seon"], 설: ["seol", "sul"], 마: ["ma"], 길: ["gil", "kil"], 연: ["yeon", "yun"], 표: ["pyo"], 명: ["myung"], 기: ["ki", "gi"],
  왕: ["wang"], 금: ["keum", "geum"], 인: ["in"], 제: ["je"], 탁: ["tak"], 국: ["kook", "guk"], 은: ["eun"], 용: ["yong"], 육: ["yuk"],
};
const HANGUL = /[가-힣]/;

// One person per row: does this query point at them?
function nameMatches(q: string, fullName: string, organisation: string): { hit: boolean; front: boolean } {
  const name = foldName(`${fullName} ${romanise(fullName)}`);
  const hay = `${name} ${foldName(organisation)}`;
  const flat = hay.replace(/ /g, "");
  const words = hay.split(" ");
  const qWords = foldName(q).split(" ").filter(Boolean);
  if (!qWords.length) return { hit: false, front: false };
  const plain = qWords.every((w) => hay.includes(w)) || flat.includes(qWords.join(""));
  if (plain || !HANGUL.test(q)) return { hit: plain, front: name.startsWith(qWords[0]) };
  // Korean query against a romanised name: try "whole thing is the given
  // name" and "first syllable is the surname".
  const ko = q.replace(/[^가-힣]/g, "");
  const given = (s: string) => !s || flat.includes(foldName(romanise(s)));
  if (given(ko)) return { hit: true, front: false };
  const sur = SURNAMES[ko[0]];
  if (sur) {
    const surHit = sur.map(foldName).some((v) => words.includes(v) || flat.startsWith(v) || name.replace(/ /g, "").endsWith(v));
    if (surHit && given(ko.slice(1))) return { hit: true, front: true };
  }
  return { hit: false, front: false };
}
const maskEmail = (e: string) => {
  const [u = "", d = ""] = e.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(u.length - 2, 5)))}@${d}`;
};

export interface CheckInMatch {
  id: string;
  full_name: string;
  organisation: string;
  hint: string; // masked email, only to tell two same names apart
  checked_in: boolean;
}

export const findRsvpForCheckIn = createServerFn({ method: "POST" })
  .validator((data: { key: string; q: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true; matches: CheckInMatch[] } | { ok: false }> => {
    if (!(await loungeKeyOk(data.key))) return { ok: false };
    const words = foldName(data.q ?? "").split(" ").filter(Boolean);
    if (words.join("").length < 2) return { ok: true, matches: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("rsvps")
      .select("id, full_name, organisation, email, checked_in_at");
    if (error) {
      console.error("findRsvpForCheckIn error:", error);
      return { ok: false };
    }
    const scored = (rows ?? [])
      .map((r) => {
        const m = nameMatches(data.q, String(r.full_name), String(r.organisation ?? ""));
        return { r, hit: m.hit, score: m.front ? 0 : 1 };
      })
      .filter((x) => x.hit)
      .sort((a, b) => a.score - b.score || String(a.r.full_name).localeCompare(String(b.r.full_name)));
    // Six at most, so the box can't be used to page through the guest list.
    const matches = scored.slice(0, 6).map(({ r }) => ({
      id: String(r.id),
      full_name: String(r.full_name),
      organisation: String(r.organisation),
      hint: maskEmail(String(r.email)),
      checked_in: Boolean(r.checked_in_at),
    }));
    return { ok: true, matches };
  });

export const checkInById = createServerFn({ method: "POST" })
  .validator((data: { key: string; rsvpId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; recorded?: boolean }> => {
    if (!(await loungeKeyOk(data.key)) || !data.rsvpId) return { ok: false };
    if (!checkInLive()) return { ok: true, recorded: false };
    const { error } = await supabaseAdmin
      .from("rsvps")
      .update({ checked_in_at: new Date().toISOString(), checked_in_via: "qr-name" })
      .eq("id", data.rsvpId)
      .is("checked_in_at", null);
    if (error) {
      console.error("checkInById error:", error);
      return { ok: false };
    }
    return { ok: true, recorded: true };
  });

// Walk-ins register from the same QR screen: a short RSVP that is checked in
// on the spot. An email that already has an RSVP just checks that one in.
export const walkInRsvp = createServerFn({ method: "POST" })
  .validator(
    (data: { key: string; fullName: string; organisation: string; jobTitle: string; email: string; primaryInterest?: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    if (!(await loungeKeyOk(data.key))) return { ok: false, message: "Scan the QR code at the entrance to register." };
    const email = data.email?.toLowerCase().trim();
    const fullName = data.fullName?.trim();
    const organisation = data.organisation?.trim();
    const jobTitle = data.jobTitle?.trim();
    if (!fullName || !organisation || !jobTitle || !email || !/^\S+@\S+\.\S+$/.test(email)) {
      return { ok: false, message: "Please fill in every field with a valid email." };
    }
    const live = checkInLive();
    const now = new Date().toISOString();
    const { data: existing } = await supabaseAdmin.from("rsvps").select("id").eq("email", email).maybeSingle();
    if (existing) {
      if (live) {
        await supabaseAdmin
          .from("rsvps")
          .update({ checked_in_at: now, checked_in_via: "qr" })
          .eq("id", existing.id)
          .is("checked_in_at", null);
      }
      return { ok: true };
    }
    const { error } = await supabaseAdmin.from("rsvps").insert({
      full_name: fullName,
      organisation,
      job_title: jobTitle,
      email,
      phone: "",
      primary_interest: data.primaryInterest || "General interest",
      notes: "Walk-in (registered from the entrance QR)",
      attend_showcase: true,
      checked_in_at: live ? now : null,
      checked_in_via: live ? "walk-in" : null,
    });
    if (error) {
      console.error("walkInRsvp error:", error);
      return { ok: false, message: "Something went wrong. Please ask the desk." };
    }
    return { ok: true };
  });

// Manual override from /admin — staff can check people in (walk-ups whose
// phone died) or undo a mistaken check-in.
export const adminSetCheckedIn = createServerFn({ method: "POST" })
  .validator((data: { password: string; rsvpId: string; checked: boolean }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!isAdmin(data.password)) return { ok: false };
    const patch = data.checked
      ? { checked_in_at: new Date().toISOString(), checked_in_via: "manual" }
      : { checked_in_at: null, checked_in_via: null };
    const { error } = await supabaseAdmin.from("rsvps").update(patch).eq("id", data.rsvpId);
    if (error) {
      console.error("adminSetCheckedIn error:", error);
      return { ok: false };
    }
    return { ok: true };
  });

// ── My Contacts wallet ("내 명함집") ────────────────────────────────
// 1:1 meeting partners are derived live from bookings — the source of truth
// stays in one place and pre-event cancellations never leave stale wallet
// rows. lounge_contacts stores only manual additions and the owner's own
// email/phone notes. Counterpart emails are revealed ONLY between pairs the
// bookings table actually connects; everyone else stays email-free exactly
// like the lounge wall.

// RSVP organisation strings are free-typed, so map each startup slug to the
// spellings seen in production data (normalised: lowercase, alphanumerics
// only). "WISE BIO Inc." → ys-bio etc.
const COMPANY_ORG_ALIASES: Record<string, string[]> = {
  cutshion: ["cutshion"],
  doublt: ["doublt", "doublet"],
  willog: ["willog"],
  xylolabs: ["xylolabs", "xylolab"],
  "eastsea-brother": ["eastseabrother", "eastseabro"],
  "haesong-snt": ["haesongsnt", "haesongst", "haesong"],
  "contrau-eco": ["contraueco", "contrau"],
  "ys-bio": ["ysbio", "wisebio", "wisebioinc", "wisebioink"],
};

function normOrg(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugForOrg(org: string): string | null {
  const n = normOrg(org);
  if (!n) return null;
  for (const [slug, aliases] of Object.entries(COMPANY_ORG_ALIASES)) {
    if (aliases.some((a) => n === a || n.startsWith(a))) return slug;
  }
  return null;
}

export interface WalletEntry {
  /** RSVP id for attendee contacts; null for custom (external) cards. */
  rsvp_id: string | null;
  /** lounge_contacts row id — set for custom cards, used for edits/removal. */
  entry_id: string | null;
  full_name: string;
  organisation: string;
  job_title: string;
  primary_interest: string | null;
  contact_url: string | null;
  source: "meeting" | "manual";
  /** Counterpart's RSVP email — present only for booking-connected pairs. */
  meeting_email: string | null;
  saved_email: string | null;
  saved_phone: string | null;
  saved_note: string | null;
}

async function meetingPartnerIds(ownerEmail: string, ownerOrg: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const ownerSlug = slugForOrg(ownerOrg);

  // Attendee side: companies I booked → people from those startups.
  const { data: myBookings } = await supabaseAdmin
    .from("bookings")
    .select("company_id")
    .eq("email", ownerEmail);
  const bookedSlugs = new Set((myBookings ?? []).map((b) => String(b.company_id)));

  if (bookedSlugs.size || ownerSlug) {
    const { data: allRsvps } = await supabaseAdmin
      .from("rsvps")
      .select("id, email, organisation, show_in_lounge");

    if (bookedSlugs.size) {
      for (const r of allRsvps ?? []) {
        const s = slugForOrg(String(r.organisation));
        if (s && bookedSlugs.has(s) && String(r.email).toLowerCase() !== ownerEmail) ids.add(String(r.id));
      }
    }

    // Startup side: people who booked my company.
    if (ownerSlug) {
      const { data: theirBookings } = await supabaseAdmin
        .from("bookings")
        .select("email")
        .eq("company_id", ownerSlug);
      const partnerEmails = new Set((theirBookings ?? []).map((b) => String(b.email).toLowerCase()));
      for (const r of allRsvps ?? []) {
        if (partnerEmails.has(String(r.email).toLowerCase()) && String(r.email).toLowerCase() !== ownerEmail)
          ids.add(String(r.id));
      }
    }
  }
  return ids;
}

export const listMyContacts = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true; entries: WalletEntry[] } | { ok: false }> => {
    const email = data.email?.toLowerCase().trim();
    if (!email) return { ok: false };
    if (isLoungeBlocked(email)) return { ok: false };
    const { data: owner } = await supabaseAdmin
      .from("rsvps")
      .select("id, organisation")
      .eq("email", email)
      .maybeSingle();
    if (!owner) return { ok: false };

    const partnerIds = await meetingPartnerIds(email, String(owner.organisation));

    const { data: saved } = await supabaseAdmin
      .from("lounge_contacts")
      .select("id, contact_rsvp_id, contact_email, contact_phone, note, custom_name, custom_org, custom_title")
      .eq("owner_email", email);
    const savedRows = saved ?? [];
    const savedMap = new Map(
      savedRows
        .filter((s) => s.contact_rsvp_id)
        .map((s) => [String(s.contact_rsvp_id), { e: s.contact_email, p: s.contact_phone, n: s.note }]),
    );
    // External cards: no rsvp reference, wholly owner-private.
    const customEntries: WalletEntry[] = savedRows
      .filter((s) => !s.contact_rsvp_id && s.custom_name)
      .map((s) => ({
        rsvp_id: null,
        entry_id: String(s.id),
        full_name: String(s.custom_name),
        organisation: s.custom_org ? String(s.custom_org) : "",
        job_title: s.custom_title ? String(s.custom_title) : "",
        primary_interest: null,
        contact_url: null,
        source: "manual" as const,
        meeting_email: null,
        saved_email: s.contact_email,
        saved_phone: s.contact_phone,
        saved_note: s.note,
      }));

    const wantedIds = new Set([...partnerIds, ...savedMap.keys()]);
    if (!wantedIds.size && !customEntries.length) return { ok: true, entries: customEntries };

    const { data: rows, error } = await supabaseAdmin
      .from("rsvps")
      .select("id, full_name, organisation, job_title, primary_interest, contact_url, email")
      .in("id", [...wantedIds]);
    if (error) {
      console.error("listMyContacts error:", error);
      return { ok: false };
    }

    const entries: WalletEntry[] = (rows ?? [])
      .map((r) => {
        const isMeeting = partnerIds.has(String(r.id));
        const s = savedMap.get(String(r.id));
        return {
          rsvp_id: String(r.id),
          entry_id: null,
          full_name: r.full_name,
          organisation: r.organisation,
          job_title: r.job_title,
          primary_interest: r.primary_interest,
          contact_url: r.contact_url,
          source: (isMeeting ? "meeting" : "manual") as WalletEntry["source"],
          meeting_email: isMeeting ? String(r.email) : null,
          saved_email: s?.e ?? null,
          saved_phone: s?.p ?? null,
          saved_note: s?.n ?? null,
        };
      })
      .sort((a, b) => (a.source === b.source ? a.full_name.localeCompare(b.full_name) : a.source === "meeting" ? -1 : 1));
    return { ok: true, entries: [...entries, ...customEntries.sort((a, b) => a.full_name.localeCompare(b.full_name))] };
  });

export const addLoungeContact = createServerFn({ method: "POST" })
  .validator((data: { ownerEmail: string; contactRsvpId: string; note?: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const email = data.ownerEmail?.toLowerCase().trim();
    if (isLoungeBlocked(email)) return { ok: false };
    if (!email || !data.contactRsvpId) return { ok: false };
    const { data: owner } = await supabaseAdmin.from("rsvps").select("id").eq("email", email).maybeSingle();
    if (!owner) return { ok: false };
    const { error } = await supabaseAdmin
      .from("lounge_contacts")
      .upsert(
        {
          owner_email: email,
          contact_rsvp_id: data.contactRsvpId,
          source: "manual",
          note: data.note?.trim() || null,
        },
        { onConflict: "owner_email,contact_rsvp_id", ignoreDuplicates: true },
      );
    if (error) {
      console.error("addLoungeContact error:", error);
      return { ok: false };
    }
    return { ok: true };
  });

export const removeLoungeContact = createServerFn({ method: "POST" })
  .validator((data: { ownerEmail: string; contactRsvpId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const email = data.ownerEmail?.toLowerCase().trim();
    if (isLoungeBlocked(email)) return { ok: false };
    if (!email || !data.contactRsvpId) return { ok: false };
    const { error } = await supabaseAdmin
      .from("lounge_contacts")
      .delete()
      .eq("owner_email", email)
      .eq("contact_rsvp_id", data.contactRsvpId);
    if (error) {
      console.error("removeLoungeContact error:", error);
      return { ok: false };
    }
    return { ok: true };
  });

export const saveLoungeContactInfo = createServerFn({ method: "POST" })
  .validator((data: { ownerEmail: string; contactRsvpId: string; email?: string; phone?: string; note?: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const email = data.ownerEmail?.toLowerCase().trim();
    if (isLoungeBlocked(email)) return { ok: false };
    if (!email || !data.contactRsvpId) return { ok: false };
    const { data: owner } = await supabaseAdmin
      .from("rsvps")
      .select("id, organisation")
      .eq("email", email)
      .maybeSingle();
    if (!owner) return { ok: false };
    const partnerIds = await meetingPartnerIds(email, String(owner.organisation));
    const source = partnerIds.has(data.contactRsvpId) ? "meeting" : "manual";
    const { error } = await supabaseAdmin.from("lounge_contacts").upsert(
      {
        owner_email: email,
        contact_rsvp_id: data.contactRsvpId,
        contact_email: data.email?.trim() || null,
        contact_phone: data.phone?.trim() || null,
        note: data.note?.trim() || null,
        source,
      },
      { onConflict: "owner_email,contact_rsvp_id" },
    );
    if (error) {
      console.error("saveLoungeContactInfo error:", error);
      return { ok: false };
    }
    return { ok: true };
  });

// ── Custom (external) contacts ─────────────────────────────────────
// Free-form cards for people met outside the RSVP universe. Wallet-private
// by construction — the public wall never reads lounge_contacts.
export const addCustomContact = createServerFn({ method: "POST" })
  .validator(
    (data: {
      ownerEmail: string;
      name: string;
      org?: string;
      title?: string;
      email?: string;
      phone?: string;
      note?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const email = data.ownerEmail?.toLowerCase().trim();
    if (isLoungeBlocked(email)) return { ok: false };
    const name = data.name?.trim();
    if (!email || !name) return { ok: false };
    const { data: owner } = await supabaseAdmin.from("rsvps").select("id").eq("email", email).maybeSingle();
    if (!owner) return { ok: false };
    const { error } = await supabaseAdmin.from("lounge_contacts").insert({
      owner_email: email,
      contact_rsvp_id: null,
      custom_name: name,
      custom_org: data.org?.trim() || null,
      custom_title: data.title?.trim() || null,
      contact_email: data.email?.trim() || null,
      contact_phone: data.phone?.trim() || null,
      note: data.note?.trim() || null,
      source: "manual",
    });
    if (error) {
      console.error("addCustomContact error:", error);
      return { ok: false };
    }
    return { ok: true };
  });

export const updateCustomContact = createServerFn({ method: "POST" })
  .validator(
    (data: {
      ownerEmail: string;
      entryId: string;
      name: string;
      org?: string;
      title?: string;
      email?: string;
      phone?: string;
      note?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const email = data.ownerEmail?.toLowerCase().trim();
    if (isLoungeBlocked(email)) return { ok: false };
    const name = data.name?.trim();
    if (!email || !name || !data.entryId) return { ok: false };
    const { error } = await supabaseAdmin
      .from("lounge_contacts")
      .update({
        custom_name: name,
        custom_org: data.org?.trim() || null,
        custom_title: data.title?.trim() || null,
        contact_email: data.email?.trim() || null,
        contact_phone: data.phone?.trim() || null,
        note: data.note?.trim() || null,
      })
      .eq("id", data.entryId)
      .eq("owner_email", email)
      .is("contact_rsvp_id", null);
    if (error) {
      console.error("updateCustomContact error:", error);
      return { ok: false };
    }
    return { ok: true };
  });

export const removeCustomContact = createServerFn({ method: "POST" })
  .validator((data: { ownerEmail: string; entryId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const email = data.ownerEmail?.toLowerCase().trim();
    if (isLoungeBlocked(email)) return { ok: false };
    if (!email || !data.entryId) return { ok: false };
    const { error } = await supabaseAdmin
      .from("lounge_contacts")
      .delete()
      .eq("id", data.entryId)
      .eq("owner_email", email)
      .is("contact_rsvp_id", null);
    if (error) {
      console.error("removeCustomContact error:", error);
      return { ok: false };
    }
    return { ok: true };
  });

// ── Organizer team view (2026-08-30, Tammy) ────────────────────────
// @lodestart.ai accounts entering the lounge can see every MANUALLY added
// wallet entry across all attendees (source='manual': saved attendees +
// external cards) with owner attribution — the collected-leads view.
// Auto 1:1 partners aren't stored rows, so they never appear here. The
// wallet UI discloses organizer visibility for manual cards.
export interface TeamContactEntry {
  owner_email: string;
  full_name: string;
  organisation: string;
  job_title: string;
  is_external: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  note: string | null;
  created_at: string;
}

export const listTeamContacts = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true; entries: TeamContactEntry[] } | { ok: false }> => {
    const email = data.email?.toLowerCase().trim();
    if (!email || !email.endsWith("@lodestart.ai")) return { ok: false };
    const { data: owner } = await supabaseAdmin.from("rsvps").select("id").eq("email", email).maybeSingle();
    if (!owner) return { ok: false };

    const { data: rows, error } = await supabaseAdmin
      .from("lounge_contacts")
      .select("owner_email, contact_rsvp_id, contact_email, contact_phone, note, custom_name, custom_org, custom_title, created_at")
      .eq("source", "manual")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listTeamContacts error:", error);
      return { ok: false };
    }

    const rsvpIds = [...new Set((rows ?? []).map((r) => r.contact_rsvp_id).filter(Boolean))] as string[];
    const profiles = new Map<string, { full_name: string; organisation: string; job_title: string }>();
    if (rsvpIds.length) {
      const { data: rs } = await supabaseAdmin
        .from("rsvps")
        .select("id, full_name, organisation, job_title")
        .in("id", rsvpIds);
      for (const r of rs ?? []) {
        profiles.set(String(r.id), {
          full_name: r.full_name,
          organisation: r.organisation,
          job_title: r.job_title,
        });
      }
    }

    const entries: TeamContactEntry[] = (rows ?? []).map((r) => {
      const p = r.contact_rsvp_id ? profiles.get(String(r.contact_rsvp_id)) : null;
      return {
        owner_email: String(r.owner_email),
        full_name: p?.full_name ?? String(r.custom_name ?? "(unknown)"),
        organisation: p?.organisation ?? String(r.custom_org ?? ""),
        job_title: p?.job_title ?? String(r.custom_title ?? ""),
        is_external: !r.contact_rsvp_id,
        contact_email: r.contact_email,
        contact_phone: r.contact_phone,
        note: r.note,
        created_at: String(r.created_at),
      };
    });
    return { ok: true, entries };
  });
