import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { companies, MEETUP_COMPANIES } from "@/data/companies";
import {
  EVENT_DATE,
  EVENT_DAY_SHORT,
  EVENT_TIME,
  EVENT_VENUE,
  EVENT_ADDRESS,
  EVENT_MAP_URL,
  PROGRAM,
  TIMESLOTS,
  getSlotInfo,
  isSlotOffered,
  ONE_ON_ONE_OPEN,
  MEETUP_DATE, MEETUP_TIME, EVENT_NAME, MEETUP_VENUE, MEETUP_ADDRESS, MEETUP_MAP_URL } from "@/data/timeslots";
import { supabase } from "@/lib/supabase-client";
import {
  createRsvp,
  lookupRsvpByEmail,
  lookupBookingsByEmail,
  selfCancelBooking,
  type RsvpInput,
  type MyBooking,
} from "@/lib/booking.server";
import { BusyLabel, LoadingNote } from "@/components/Spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const searchSchema = z.object({
  company: z.string().optional(),
  // Which day the guest is registering for. The home page's two CTAs land
  // here with 5 or 7; the tab on this page switches it. Two days, two
  // separate sign-ups — a second submit for the other day must not wipe
  // the first, so submit merges with the existing RSVP (see handleSubmit).
  // TanStack parses ?day=5 as a number, so coerce before the enum check.
  day: z.preprocess((v) => (v == null ? v : String(v)), z.enum(["5", "7"])).optional(),
});

export const Route = createFileRoute("/book")({
  component: RsvpPage,
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: `RSVP — ${EVENT_NAME}` }],
  }),
});

type BookedKey = `${string}__${string}`;
const key = (companySlug: string, timeslotId: string): BookedKey => `${companySlug}__${timeslotId}`;

const INTEREST_OPTIONS = [
  "Pilot / trial opportunity",
  "Investment",
  "Distribution / partnership",
  "General interest",
];

interface FormState {
  fullName: string;
  organisation: string;
  jobTitle: string;
  email: string;
  phone: string;
  primaryInterest: string;
  notes: string;
  additionalAttendees: string;
  contactUrl: string;
  showInLounge: boolean;
}

const emptyForm: FormState = {
  fullName: "",
  organisation: "",
  jobTitle: "",
  email: "",
  phone: "",
  primaryInterest: "",
  notes: "",
  additionalAttendees: "",
  contactUrl: "",
  showInLounge: true,
};

function RsvpPage() {
  const { company: preselectSlug, day: dayParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  // Company deep-links come from startup cards → they are 1:1 requests.
  const day: "5" | "7" = dayParam ?? (preselectSlug ? "5" : "7");
  const setDay = (d: "5" | "7") => navigate({ search: (prev) => ({ ...prev, day: d }), replace: true });

  // availability
  const [booked, setBooked] = useState<Set<BookedKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [myBookings, setMyBookings] = useState<Record<string, string>>({}); // timeslotId -> companySlug

  // rsvp form
  const [attend, setAttend] = useState({ showcase: false, lunch: false, meetups: false });
  // Day 5 = 1:1 only, always on; Day 7 = showcase/dinner checkboxes, 1:1 off.
  // Day 5 = 1:1 only; Day 7 = the whole demo day (pitches + networking), no
  // per-session choice — RSVP means you're coming for the afternoon.
  useEffect(() => {
    setAttend((a) =>
      day === "5" ? { ...a, meetups: true } : { showcase: true, lunch: true, meetups: false },
    );
  }, [day]);
  const [selections, setSelections] = useState<Record<string, string | null>>(
    () => Object.fromEntries(TIMESLOTS.map((t) => [t.id, null])),
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    attend: typeof attend;
    bookings: { timeslotId: string; companySlug: string; ok: boolean; message?: string }[];
    email: string;
    emailSent: boolean;
  } | null>(null);
  // Success is shown as a modal — the old inline green banner sat above the
  // fold and people didn't notice it.
  const [successOpen, setSuccessOpen] = useState(false);

  // lookup / self-manage
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResults, setLookupResults] = useState<MyBooking[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selfCancelling, setSelfCancelling] = useState<string | null>(null);

  const refreshAvailability = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("booked_slots").select("company_id, timeslot_id");
    if (!error && data) {
      const serverBooked = new Set(data.map((row) => key(row.company_id, row.timeslot_id)));
      setBooked(serverBooked);
      setMyBookings((prev) => {
        const next: Record<string, string> = {};
        let changed = false;
        for (const [timeslotId, companySlug] of Object.entries(prev)) {
          if (serverBooked.has(key(companySlug, timeslotId))) next[timeslotId] = companySlug;
          else changed = true;
        }
        if (changed) {
          try {
            localStorage.setItem("kimst-my-bookings", JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        return changed ? next : prev;
      });
    }
    setLoading(false);
  };

  const syncMyBookingsFromServer = async (email: string) => {
    const rows = await lookupBookingsByEmail({ data: { email } });
    const next: Record<string, string> = {};
    for (const b of rows) next[b.timeslot_id] = b.company_id;
    setMyBookings(next);
    try {
      localStorage.setItem("kimst-my-bookings", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshAvailability();
    try {
      const storedEmail = localStorage.getItem("kimst-my-email");
      if (storedEmail) {
        setLookupEmail(storedEmail);
        syncMyBookingsFromServer(storedEmail);
      } else {
        const stored = localStorage.getItem("kimst-my-bookings");
        if (stored) setMyBookings(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live availability
  useEffect(() => {
    const channel = supabase
      .channel("book-availability")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        refreshAvailability();
      })
      .subscribe();
    const poll = setInterval(refreshAvailability, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preselect from ?company=
  useEffect(() => {
    if (!loading && preselectSlug && MEETUP_COMPANIES.some((c) => c.slug === preselectSlug)) {
      setAttend((a) => ({ ...a, meetups: true }));
      setSelections((prev) => {
        const openSlot = TIMESLOTS.find(
          (t) =>
            isSlotOffered(preselectSlug, t.id) &&
            !booked.has(key(preselectSlug, t.id)) &&
            !myBookings[t.id] &&
            !prev[t.id],
        );
        if (!openSlot) return prev;
        return { ...prev, [openSlot.id]: preselectSlug };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectSlug, loading]);

  function toggleSelection(timeslotId: string, companySlug: string) {
    setSelections((prev) => ({
      ...prev,
      [timeslotId]: prev[timeslotId] === companySlug ? null : companySlug,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);


    const meetupSelections = attend.meetups
      ? TIMESLOTS.filter((t) => selections[t.id] && !myBookings[t.id]).map((t) => ({
          timeslotId: t.id,
          companySlug: selections[t.id] as string,
        }))
      : [];
    if (ONE_ON_ONE_OPEN && attend.meetups && meetupSelections.length === 0 && Object.keys(myBookings).length === 0) {
      setFormError("Please pick at least one startup for your 1:1 meetups (or untick that session).");
      return;
    }

    setSubmitting(true);
    // Merge with any existing RSVP for this email so registering for one
    // day doesn't erase the other day's choices.
    let existing: Awaited<ReturnType<typeof lookupRsvpByEmail>> = null;
    try {
      existing = await lookupRsvpByEmail({ data: { email: form.email.trim() } });
    } catch (err) {
      console.error("lookupRsvpByEmail failed:", err);
      setSubmitting(false);
      setFormError("We couldn't reach the server. Please check your connection and try again.");
      return;
    }
    const merged =
      day === "5"
        ? { showcase: existing?.attend_showcase ?? false, lunch: existing?.attend_lunch ?? false, meetups: true }
        : { showcase: attend.showcase, lunch: attend.lunch, meetups: existing?.attend_meetups ?? false };
    const payload: RsvpInput = {
      fullName: form.fullName.trim(),
      organisation: form.organisation.trim(),
      jobTitle: form.jobTitle.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      primaryInterest: form.primaryInterest,
      notes: form.notes.trim() || undefined,
      additionalAttendees: merged.meetups ? form.additionalAttendees.trim() || undefined : undefined,
      contactUrl: form.contactUrl.trim() || undefined,
      showInLounge: form.showInLounge,
      attendShowcase: merged.showcase,
      attendLunch: merged.lunch,
      attendMeetups: merged.meetups,
      meetupSelections,
    };
    let result: Awaited<ReturnType<typeof createRsvp>>;
    try {
      result = await createRsvp({ data: payload });
    } catch (err) {
      console.error("createRsvp failed:", err);
      setSubmitting(false);
      setFormError("We couldn't reach the server. Please check your connection and try again.");
      return;
    }
    setSubmitting(false);

    if (!result.rsvpOk) {
      setFormError(result.message ?? "Something went wrong. Please try again.");
      return;
    }

    try {
      localStorage.setItem("kimst-my-email", payload.email.toLowerCase());
    } catch {
      // ignore
    }
    setLookupEmail(payload.email);
    setLookupResults(null);
    setSubmitted({
      attend: { ...attend },
      bookings: result.bookingResults,
      email: payload.email,
      emailSent: Boolean(result.emailSent),
    });
    setSuccessOpen(true);
    setSelections(Object.fromEntries(TIMESLOTS.map((t) => [t.id, null])));
    await refreshAvailability();
    await syncMyBookingsFromServer(payload.email);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const email = lookupEmail.trim();
    if (!email) return;
    setLookupLoading(true);
    try {
      setLookupResults(await lookupBookingsByEmail({ data: { email } }));
    } catch {
      alert("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSelfCancel(b: MyBooking) {
    const c = companies.find((x) => x.slug === b.company_id);
    const info = getSlotInfo(b.timeslot_id);
    if (
      !confirm(
        `Cancel your ${info.label} (${info.time}) meeting with ${c?.name ?? b.company_id}?\n\nThis frees the slot for someone else and cannot be undone.`,
      )
    )
      return;
    setSelfCancelling(b.id);
    const res = await selfCancelBooking({ data: { email: lookupEmail, id: b.id } }).catch(() => ({ ok: false as const }));
    setSelfCancelling(null);
    if (res.ok) {
      setLookupResults((prev) => (prev ? prev.filter((x) => x.id !== b.id) : prev));
      const updated = { ...myBookings };
      if (updated[b.timeslot_id] === b.company_id) {
        delete updated[b.timeslot_id];
        setMyBookings(updated);
        try {
          localStorage.setItem("kimst-my-bookings", JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      await refreshAvailability();
    } else {
      alert("Could not cancel this booking. Please refresh and try again.");
    }
  }

  const myBookingCount = Object.keys(myBookings).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <Wordmark />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              to="/lounge"
              className="inline-flex items-center rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:bg-accent sm:px-4 sm:text-sm"
            >
              Lounge
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary px-3.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 sm:px-4 sm:text-sm"
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-hero-gradient text-primary-foreground">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            RSVP · {day === "5" ? `${MEETUP_DATE} · ${MEETUP_TIME}` : `${EVENT_DATE} · ${EVENT_TIME}`}
          </div>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            {day === "5" ? "Reserve Your 1:1 Meetings" : "Reserve Your Seat"}
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/85 sm:text-base">
            {day === "5" ? (
              <>
                {MEETUP_MAP_URL ? (
                  <a href={MEETUP_MAP_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition hover:text-white">
                    {MEETUP_VENUE}
                  </a>
                ) : MEETUP_VENUE}{" "}
                · {MEETUP_ADDRESS} · Private meetings with the startups of your choice
              </>
            ) : (
              <>
                {EVENT_MAP_URL ? (
                  <a href={EVENT_MAP_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition hover:text-white">
                    {EVENT_VENUE}
                  </a>
                ) : EVENT_VENUE}{" "}
                · {EVENT_ADDRESS}
              </>
            )}
          </p>

          {/* Day toggle */}
          <div className="mt-6 inline-flex rounded-full border border-primary-foreground/25 bg-primary-foreground/10 p-1 backdrop-blur-sm">
            {([
              ["7", "Wed 28 Oct · Demo Day"],
              ["5", "Thu 29 Oct · 1:1 Meetings"],
            ] as const).map(([d, label]) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  day === d ? "bg-yellow text-yellow-foreground shadow-sm" : "text-primary-foreground/85 hover:bg-primary-foreground/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {myBookingCount > 0 && (
            <div className="mt-5 inline-flex flex-wrap gap-2 rounded-2xl bg-primary-foreground/10 px-4 py-3 text-sm">
              {Object.entries(myBookings).map(([timeslotId, companySlug]) => {
                const c = companies.find((x) => x.slug === companySlug);
                const t = TIMESLOTS.find((x) => x.id === timeslotId);
                if (!c || !t) return null;
                return (
                  <span key={timeslotId} className="rounded-full bg-primary-foreground/15 px-3 py-1">
                    ✓ 1:1 {t.label} — {c.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
        {/* SUCCESS MODAL */}
        <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
            {submitted && (
              <>
                <DialogHeader>
                  <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">✓</div>
                  <DialogTitle className="text-center text-xl text-navy">
                    {submitted.bookings.some((b) => !b.ok) ? "RSVP received — please check below" : "Your RSVP is confirmed!"}
                  </DialogTitle>
                  <DialogDescription className="text-center">
                    {day === "5" ? "See you on Thursday, 29 October." : "See you on Wednesday, 28 October."}
                  </DialogDescription>
                </DialogHeader>
                <ul className="space-y-1.5 rounded-xl bg-muted/60 p-4 text-sm text-navy">
                  {(submitted.attend.showcase || submitted.attend.lunch) && (
                    <li>✓ Demo Day · {EVENT_DAY_SHORT} · {EVENT_TIME}</li>
                  )}
                  {submitted.bookings.map((b) => {
                    const c = companies.find((x) => x.slug === b.companySlug);
                    const t = TIMESLOTS.find((x) => x.id === b.timeslotId);
                    return (
                      <li key={`m-${b.timeslotId}-${b.companySlug}`} className={b.ok ? "" : "text-red-700"}>
                        {b.ok ? "✓" : "✕"} 1:1 {t?.label} · {t?.time} — {c?.name}
                        {!b.ok && b.message ? <div className="pl-4 text-xs">{b.message} Pick another startup and re-submit.</div> : null}
                      </li>
                    );
                  })}
                  {submitted.attend.meetups && submitted.bookings.length === 0 && (
                    <li>✓ 1:1 Business Meetings (Thu 29 Oct) — organizers will be in touch</li>
                  )}
                </ul>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-navy">
                  {submitted.emailSent ? (
                    <>
                      📧 <strong>Please check your confirmation email.</strong> We've sent your schedule to{" "}
                      <strong className="break-all">{submitted.email}</strong>. If you don't see it within a few
                      minutes, check your spam or promotions folder.
                    </>
                  ) : (
                    <>
                      📝 Your registration is saved. You can check or change your bookings any time from the
                      "Check or cancel" section at the bottom of this page.
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessOpen(false)}
                  className="mt-1 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Done
                </button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Failed picks stay visible on the page after the modal is closed */}
        {submitted && !successOpen && submitted.bookings.some((b) => !b.ok) && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
            <div className="font-semibold">Some 1:1 picks couldn't be booked — the rest of your RSVP is confirmed.</div>
            <ul className="mt-2 space-y-1 text-sm">
              {(submitted.attend.showcase || submitted.attend.lunch) && <li>✓ Demo Day ({EVENT_DAY_SHORT} · {EVENT_TIME}: registration, pitches & networking)</li>}
              {submitted.bookings.map((b) => {
                const c = companies.find((x) => x.slug === b.companySlug);
                const t = TIMESLOTS.find((x) => x.id === b.timeslotId);
                return (
                  <li key={`${b.timeslotId}-${b.companySlug}`} className={b.ok ? "" : "text-red-700"}>
                    {b.ok ? "✓" : "✕"} 1:1 {t?.label} — {c?.name}
                    {!b.ok && b.message ? ` (${b.message} Pick another startup below and re-submit.)` : ""}
                  </li>
                );
              })}
              {submitted.attend.meetups && submitted.bookings.length === 0 && (
                <li>✓ 1:1 Business Meetings (Thu 29 Oct) — organizers will be in touch</li>
              )}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1 — sessions */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              {day === "5" && (
                <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  Step 01
                </span>
              )}
              <h2 className="text-lg font-bold text-navy">{day === "5" ? "Pick Your Startups" : "Agenda"}</h2>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {day === "5" ? "One startup per round. Leave a round empty if you don't need it." : `${EVENT_DATE} · ${EVENT_VENUE}`}
            </p>

            {day === "7" && (
              <div className="mt-5 divide-y divide-border rounded-xl border border-border bg-background">
                {PROGRAM.filter((p) => p.id !== "meetups").map(({ time, title: label }) => (
                  <div key={time} className="flex items-center gap-4 px-4 py-3.5">
                    <span className="w-28 shrink-0 text-sm font-bold text-primary">{time}</span>
                    <span className="text-sm font-semibold text-navy">{label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="hidden">
              {PROGRAM.filter((p) => p.id !== "meetups").map((p) => {
                const checked = attend[p.id];
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition ${
                      checked ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setAttend((a) => ({ ...a, [p.id]: e.target.checked }))}
                      className="mt-1 h-4 w-4 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="block text-sm font-bold text-navy">
                        {p.title} <span className="ml-1 font-medium text-muted-foreground">{p.time}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{p.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {/* 1:1 picker — appears when meetups checked and self-booking is open */}
            {ONE_ON_ONE_OPEN && attend.meetups && (
              <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.03] p-4 sm:p-5">
                <div className="text-sm font-bold text-navy">Pick your startups</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  One startup per round. Greyed-out slots are already taken.
                  {loading && <LoadingNote text="Checking live availability…" className="ml-2 font-semibold text-primary" />}
                </p>
                {/* Phones: one card per startup, the rounds as full-width
                    buttons underneath — the table's round columns sat off-screen
                    at 360–390px with no hint that they scroll. */}
                <div className="mt-4 space-y-3 sm:hidden">
                  {MEETUP_COMPANIES.map((c) => (
                    <div key={c.slug} className="rounded-xl border border-border bg-card p-3.5">
                      <div className="font-semibold text-navy">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.sector}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
                        {TIMESLOTS.map((t) => {
                          if (!isSlotOffered(c.slug, t.id)) {
                            return (
                              <div key={t.id} className="rounded-lg border border-dashed border-border px-1 py-2 text-center text-[11px] text-muted-foreground/50">
                                —
                              </div>
                            );
                          }
                          const isBooked = booked.has(key(c.slug, t.id));
                          const isMine = myBookings[t.id] === c.slug;
                          const iHaveThisRound = Boolean(myBookings[t.id]) && !isMine;
                          const isSelected = selections[t.id] === c.slug;
                          const disabled = loading || isBooked || isMine || iHaveThisRound;
                          const tone = isMine
                            ? "border-green-300 bg-green-50 text-green-800"
                            : isBooked
                              ? "border-border bg-muted text-muted-foreground"
                              : isSelected
                                ? "border-navy bg-navy text-white"
                                : "border-primary/30 bg-background text-navy";
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleSelection(t.id, c.slug)}
                              className={`rounded-lg border px-1 py-2 text-center transition disabled:cursor-not-allowed ${iHaveThisRound ? "opacity-40" : ""} ${tone}`}
                            >
                              <div className="text-[11px] font-bold">{t.label.replace("Round ", "R")}</div>
                              <div className="text-[10px] leading-tight opacity-80">{t.time.replace(" – ", "–")}</div>
                              <div className="mt-0.5 text-[10px] font-semibold">
                                {isMine ? "✓ Booked" : isBooked ? "Full" : isSelected ? "✓ Picked" : "Select"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-secondary text-left text-navy">
                        <th className="p-3 font-semibold">Startup</th>
                        {TIMESLOTS.map((t) => (
                          <th key={t.id} className="p-3 font-semibold">
                            {t.label}
                            <div className="text-xs font-normal text-muted-foreground">{t.time}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MEETUP_COMPANIES.map((c) => (
                        <tr key={c.slug} className="border-t border-border">
                          <td className="p-3">
                            <div className="font-semibold text-navy">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.sector}</div>
                          </td>
                          {TIMESLOTS.map((t) => {
                            if (!isSlotOffered(c.slug, t.id)) {
                              return (
                                <td key={t.id} className="p-3">
                                  <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground/40">
                                    —
                                  </span>
                                </td>
                              );
                            }
                            const isBooked = booked.has(key(c.slug, t.id));
                            const isMine = myBookings[t.id] === c.slug;
                            const iHaveThisRound = Boolean(myBookings[t.id]) && !isMine;
                            const isSelected = selections[t.id] === c.slug;
                            const disabled = loading || isBooked || isMine || iHaveThisRound;
                            return (
                              <td key={t.id} className="p-3">
                                {isMine ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800">
                                    ✓ Booked
                                  </span>
                                ) : isBooked ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                                    Full
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => toggleSelection(t.id, c.slug)}
                                    title={iHaveThisRound ? "You already have a meeting in this round" : undefined}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                      isSelected
                                        ? "bg-navy text-white"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                    }`}
                                  >
                                    {isSelected ? "✓ Selected" : "Select"}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2 — details */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              {day === "5" && (
                <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  Step 02
                </span>
              )}
              <h2 className="text-lg font-bold text-navy">Your Details</h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-navy">Full Name *</label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy">Organisation *</label>
                <input
                  required
                  value={form.organisation}
                  onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy">Job Title *</label>
                <input
                  required
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Re-submitting with the same email updates your RSVP.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-navy">Phone *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+65 XXXX XXXX"
                  className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-navy">Primary Interest *</label>
                <select
                  required
                  value={form.primaryInterest}
                  onChange={(e) => setForm({ ...form, primaryInterest: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Select one...
                  </option>
                  {INTEREST_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {attend.meetups && !ONE_ON_ONE_OPEN && (
              <div className="mt-4 rounded-xl border border-primary/25 bg-primary/[0.03] p-4 text-sm text-navy">
                Thanks for your interest in 1:1 meetings on Thursday 29 October. The organizers will contact you to
                match you with the startups that fit your goals.
              </div>
            )}
            {attend.meetups && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-navy">
                  Colleagues joining your 1:1 meetings{" "}
                  <span className="font-normal text-muted-foreground">(optional — for name badges)</span>
                </label>
                <input
                  value={form.additionalAttendees}
                  onChange={(e) => setForm({ ...form, additionalAttendees: e.target.value })}
                  placeholder="e.g. Jane Tan (Co-founder), David Lim (Marketing)"
                  className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
                <div className="mt-1 text-[11px] text-muted-foreground">
                  1:1 slots are booked per organisation, so list colleagues sitting in with you here. For the
                  Demo Day pitches and networking, each attendee should simply register individually.
                </div>
              </div>
            )}
            <div className="mt-4">
              <label className="text-xs font-semibold text-navy">
                LinkedIn or contact link{" "}
                <span className="font-normal text-muted-foreground">(optional — shown on your card in the attendee networking lounge)</span>
              </label>
              <input
                value={form.contactUrl}
                onChange={(e) => setForm({ ...form, contactUrl: e.target.value })}
                placeholder="e.g. linkedin.com/in/yourname or your company site"
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
              <label className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.showInLounge}
                  onChange={(e) => setForm({ ...form, showInLounge: e.target.checked })}
                  className="mt-0.5"
                />
                <span>
                  Show my card (name, organisation, job title) in the attendee networking lounge —
                  visible to fellow attendees only. Email and phone are never shown.
                </span>
              </label>
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold text-navy">
                Any notes or questions? <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Dietary requirements, questions, or anything else you'd like us to know..."
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
              />
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              <BusyLabel busy={submitting} text="Submitting…">Confirm My RSVP →</BusyLabel>
            </button>
          </div>
        </form>

        {/* CHECK / MANAGE — #manage is linked from the confirmation email */}
        <div id="manage" className="mt-12 scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Already registered?
          </div>
          <h2 className="mt-2 text-xl font-bold text-navy">Check or cancel your 1:1 meetings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the email you used to see your confirmed meetings on any device. To change your
            session choices, just re-submit the form above with the same email.
          </p>
          <form onSubmit={handleLookup} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={lookupEmail}
              onChange={(e) => {
                setLookupEmail(e.target.value);
                setLookupResults(null);
              }}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm sm:max-w-sm"
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="shrink-0 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              <BusyLabel busy={lookupLoading} text="Checking…">Find my bookings</BusyLabel>
            </button>
          </form>

          {lookupResults !== null && (
            <div className="mt-6">
              {lookupResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No 1:1 meetings found for this email. If you just registered, double-check the
                  spelling — the lookup matches the exact email used on the form.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {lookupResults.map((b) => {
                    const c = companies.find((x) => x.slug === b.company_id);
                    const t = TIMESLOTS.find((x) => x.id === b.timeslot_id);
                    return (
                      <div key={b.id} className="rounded-xl border border-border bg-background p-5">
                        <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {getSlotInfo(b.timeslot_id).label} · {getSlotInfo(b.timeslot_id).time}
                        </div>
                        <div className="mt-1.5 text-lg font-bold text-navy">{c?.name ?? b.company_id}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {getSlotInfo(b.timeslot_id).context}
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          {c && (
                            <Link
                              to="/companies/$slug"
                              params={{ slug: c.slug }}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              View one-pager →
                            </Link>
                          )}
                          <button
                            onClick={() => handleSelfCancel(b)}
                            disabled={selfCancelling === b.id}
                            className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <BusyLabel busy={selfCancelling === b.id} text="Cancelling…">Cancel booking</BusyLabel>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          By submitting, you agree that the organizers may use your details to manage event
          logistics and communications. Personal data will be used solely for this event and
          handled in accordance with the Personal Data Protection Act (PDPA).
        </p>
      </section>
    </div>
  );
}
