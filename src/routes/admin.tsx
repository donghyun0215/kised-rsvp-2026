import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { companies, MEETUP_COMPANIES } from "@/data/companies";
import { EVENT_DATE, TIMESLOTS, getSlotInfo, isSlotOffered } from "@/data/timeslots";
import { supabase } from "@/lib/supabase-client";
import { adminListBookings, adminCancelBooking, adminListEvents, adminListRsvps, type AdminBooking, type BookingEvent, type AdminRsvp } from "@/lib/booking.server";
import { updateContactUrl, adminSetCheckedIn, adminRenameAttendee } from "@/lib/booking.server";
import { BusyLabel, LoadingNote } from "@/components/Spinner";
import { absUrl } from "@/lib/url";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin — Climate Tech Startup Challenge Singapore" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const SESSION_KEY = "kised-admin-pw";

function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [rsvps, setRsvps] = useState<AdminRsvp[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pwRef = useRef("");

  const load = useCallback(async (pw: string) => {
    setLoading(true);
    let res, evRes, rsvpRes;
    try {
      [res, evRes, rsvpRes] = await Promise.all([
        adminListBookings({ data: { password: pw } }),
        adminListEvents({ data: { password: pw } }),
        adminListRsvps({ data: { password: pw } }),
      ]);
    } catch (err) {
      console.error("admin load failed:", err);
      setLoading(false);
      setAuthError("Couldn't reach the server — please check your connection and try again.");
      return false;
    }
    setLoading(false);
    if (!res.ok) {
      setAuthError("Incorrect password.");
      setAuthed(false);
      return false;
    }
    setBookings(res.bookings);
    if (evRes.ok) setEvents(evRes.events);
    if (rsvpRes.ok) setRsvps(rsvpRes.rsvps);
    setLastSync(new Date());
    return true;
  }, []);

  // Restore session from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      pwRef.current = saved;
      load(saved).then((ok) => {
        if (ok) setAuthed(true);
        else sessionStorage.removeItem(SESSION_KEY);
      });
    }
  }, [load]);

  // Realtime: any change to bookings triggers a reload
  useEffect(() => {
    if (!authed) return;
    const channel = supabase
      .channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        load(pwRef.current);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_events" }, () => {
        load(pwRef.current);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps" }, () => {
        load(pwRef.current);
      })
      .subscribe();

    // Fallback poll every 20s in case realtime isn't enabled on the table
    const poll = setInterval(() => load(pwRef.current), 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [authed, load]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const ok = await load(password);
    if (ok) {
      pwRef.current = password;
      sessionStorage.setItem(SESSION_KEY, password);
      setAuthed(true);
      setPassword("");
    }
  }

  async function handleCancel(b: AdminBooking) {
    const c = companies.find((x) => x.slug === b.company_id);
    const t = TIMESLOTS.find((x) => x.id === b.timeslot_id);
    if (
      !confirm(
        `Cancel ${b.full_name}'s booking with ${c?.name ?? b.company_id} (${t?.label ?? b.timeslot_id})?\n\nThe slot will reopen for others.`,
      )
    )
      return;
    setCancelling(b.id);
    const res = await adminCancelBooking({ data: { password: pwRef.current, id: b.id } });
    setCancelling(null);
    if (res.ok) {
      setBookings((prev) => prev.filter((x) => x.id !== b.id));
    } else {
      alert("Could not cancel. Please refresh and try again.");
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    pwRef.current = "";
    setAuthed(false);
    setBookings([]);
  }

  const byKey = useMemo(() => {
    const map = new Map<string, AdminBooking>();
    for (const b of bookings) map.set(`${b.company_id}__${b.timeslot_id}`, b);
    return map;
  }, [bookings]);

  const guestCount = (v: string | null) =>
    v ? v.split(",").map((x) => x.trim()).filter(Boolean).length : 0;

  const day2 = rsvps;
  const day2Guests = day2.reduce((n, r) => n + guestCount(r.additional_attendees), 0);
  const day2CheckedIn = day2.filter((r) => r.checked_in_at).length;
  const day2WalkIns = day2.filter(isWalkIn);

  const renamePerson = async (email: string, current: string) => {
    const next = window.prompt(`Change the name shown for ${email}\n(RSVP, lounge, reminders and all 1:1 bookings)`, current);
    if (next == null || !next.trim() || next.trim() === current) return;
    const res = await adminRenameAttendee({ data: { password: pwRef.current, email, fullName: next.trim() } });
    if (!res.ok) { alert(res.message ?? "Could not save."); return; }
    await load(pwRef.current);
  };

  // 1:1 capacity across the cohort
  const totalSlots = MEETUP_COMPANIES.reduce(
    (n, c) => n + TIMESLOTS.filter((t) => isSlotOffered(c.slug, t.id)).length,
    0,
  );

  // ── LOGIN GATE ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-4">
        <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-elegant">
          <Wordmark />
          <h1 className="mt-6 text-xl font-bold text-navy">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the admin password to manage 1:1 meeting bookings.
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-3">
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm"
            />
            {/[\u3131-\u318E\uAC00-\uD7A3]/.test(password) && (
              <div className="text-sm text-amber-700">
                한글 입력 상태입니다 — 한/영 키로 영문으로 바꾼 뒤 다시 입력해 주세요. (Your keyboard is typing Korean — switch to English.)
              </div>
            )}
            {authError && <div className="text-sm text-red-600">{authError}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              <BusyLabel busy={loading} text="Checking…">Enter</BusyLabel>
            </button>
          </form>
          <Link to="/" className="mt-6 block text-center text-xs text-muted-foreground hover:underline">
            ← Back to site
          </Link>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark />
            <div>
              <div className="text-sm font-bold text-navy">Admin Dashboard</div>
              <div className="text-xs text-muted-foreground">1:1 Meetings · {EVENT_DATE}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Live
              {lastSync && ` · synced ${lastSync.toLocaleTimeString()}`}
            </span>
            <button
              onClick={async () => {
                setRefreshing(true);
                try {
                  await load(pwRef.current);
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing}
              className="rounded-full border border-border px-3 py-1.5 font-semibold text-navy hover:bg-muted disabled:opacity-70"
            >
              <BusyLabel busy={refreshing} text="Refreshing…">Refresh</BusyLabel>
            </button>
            <button onClick={logout} className="rounded-full border border-border px-3 py-1.5 font-semibold text-navy hover:bg-muted">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="RSVPs" value={`${day2.length}${day2Guests ? ` (+${day2Guests} guests)` : ""}`} />
          
          <Stat label="Checked in (28 Oct)" value={`${day2CheckedIn} / ${day2.length}`} />
          <Stat label="Pre-registered / Walk-in" value={`${day2.length - day2WalkIns.length} / ${day2WalkIns.length}`} />
          <Stat label="Showcase" value={`${rsvps.filter((r) => r.attend_showcase).length}`} />
          <Stat label="Networking" value={`${rsvps.filter((r) => r.attend_lunch).length}`} />
          <Stat
            label="1:1 bookers (29 Oct)"
            value={`${new Set(bookings.filter((b) => b.timeslot_id.startsWith("slot")).map((b) => b.email.toLowerCase())).size}`}
          />
          <Stat label="Event 1:1 filled" value={`${bookings.filter((b) => b.timeslot_id.startsWith("slot")).length} / ${totalSlots}`} />
          
        </div>

        {/* RSVP TABLE */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-navy">RSVPs ({rsvps.length})</h2>
          <button
            onClick={() => downloadOutreachCsv(rsvps)}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-navy hover:bg-muted"
            title="Same column set as the Lodestart outreach DB — re-upload upserts by email"
          >
            Export Outreach CSV
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Everyone who registered, with the sessions they'll attend.</p>
        {rsvps.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            No RSVPs yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="bg-secondary text-left text-navy">
                  <th className="p-3 font-semibold">Checked in</th>
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Organisation</th>
                  <th className="p-3 font-semibold">Contact</th>
                  <th className="p-3 font-semibold">Sessions</th>
                  <th className="p-3 font-semibold">1:1 meetings</th>
                  <th className="p-3 font-semibold">Interest</th>
                  <th className="p-3 font-semibold">Lounge link</th>
                  <th className="p-3 font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.map((r) => {
                  const myMeetings = bookings.filter((b) => b.email === r.email);
                  return (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="p-3">
                        <CheckInCell rsvp={r} password={pwRef.current} onSaved={() => load(pwRef.current)} />
                      </td>
                      <td className="p-3 font-semibold text-navy">
                        {r.full_name}{" "}
                        {isWalkIn(r) && (
                          <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 align-middle text-[10px] font-bold text-orange-800" title="Registered on site (after 14:00, 28 Oct)">WALK-IN</span>
                        )}
                        <button
                          type="button"
                          onClick={() => void renamePerson(r.email, r.full_name)}
                          title="Edit name"
                          className="ml-1 align-middle text-xs font-normal text-muted-foreground hover:text-primary"
                        >
                          ✎
                        </button>
                        <div className="text-xs font-normal text-muted-foreground">{r.job_title}</div>
                        {r.additional_attendees && (
                          <div className="mt-1 text-xs font-normal text-primary">
                            +{guestCount(r.additional_attendees)}: {r.additional_attendees}
                          </div>
                        )}
                      </td>
                      <td className="p-3">{r.organisation}</td>
                      <td className="p-3">
                        <a href={`mailto:${r.email}`} className="text-primary hover:underline">{r.email}</a>
                        <div className="text-xs text-muted-foreground">{r.phone}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {r.attend_showcase && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">Showcase</span>
                          )}
                          {r.attend_lunch && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Networking</span>
                          )}
                          {r.attend_meetups && (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-800">1:1</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        {myMeetings.length === 0
                          ? <span className="text-muted-foreground">—</span>
                          : myMeetings.map((b) => {
                              const c = companies.find((x) => x.slug === b.company_id);
                              const t = TIMESLOTS.find((x) => x.id === b.timeslot_id);
                              return <div key={b.id}>{getSlotInfo(b.timeslot_id).label} {getSlotInfo(b.timeslot_id).time}: {c?.name ?? b.company_id}</div>;
                            })}
                      </td>
                      <td className="p-3 text-xs">{r.primary_interest ?? "—"}</td>
                      <td className="p-3">
                        <ContactLinkCell rsvp={r} onSaved={() => load(pwRef.current)} />
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* GRID VIEW */}
        <h2 className="mt-10 text-lg font-bold text-navy">1:1 Business Meetups — Rounds (Tue 6 Oct)</h2>
        <p className="text-sm text-muted-foreground">Click a filled slot to cancel it and reopen it for others.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border shadow-sm">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-secondary text-left text-navy">
                <th className="p-3 font-semibold">Startup</th>
                {TIMESLOTS.map((t) => (
                  <th key={t.id} className="p-3 font-semibold">
                    {t.label} <span className="font-normal text-muted-foreground">{t.time}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEETUP_COMPANIES.map((c) => (
                <tr key={c.slug} className="border-t border-border">
                  <td className="p-3 font-semibold text-navy">{c.name}</td>
                  {TIMESLOTS.map((t) => {
                    if (!isSlotOffered(c.slug, t.id)) {
                      return (
                        <td key={t.id} className="p-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground/40">
                            —
                          </span>
                        </td>
                      );
                    }
                    const b = byKey.get(`${c.slug}__${t.id}`);
                    return (
                      <td key={t.id} className="p-3">
                        {b ? (
                          <div className="inline-flex min-w-[180px] flex-col items-start rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-left">
                            <span className="text-xs font-semibold text-navy">
                              {cancelling === b.id ? <LoadingNote text="Cancelling…" /> : b.full_name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{b.organisation}</span>
                            {/* Contact details for on-the-day follow-up (no-shows, running late) */}
                            <a href={`mailto:${b.email}`} className="mt-1 break-all text-[11px] text-primary hover:underline">
                              {b.email}
                            </a>
                            {b.phone ? (
                              <a href={`tel:${b.phone.replace(/[^+\d]/g, "")}`} className="text-[11px] text-primary hover:underline">
                                {b.phone}
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleCancel(b)}
                              disabled={cancelling === b.id}
                              title="Cancel this booking"
                              className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-red-600 disabled:opacity-50"
                            >
                              {cancelling === b.id ? "Cancelling…" : "Cancel ✕"}
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                            Open
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FULL TABLE */}
        <h2 className="mt-12 text-lg font-bold text-navy">All Bookings ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No bookings yet. New bookings appear here in real time.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="bg-secondary text-left text-navy">
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Organisation</th>
                  <th className="p-3 font-semibold">Startup</th>
                  <th className="p-3 font-semibold">Session</th>
                  <th className="p-3 font-semibold">Contact</th>
                  <th className="p-3 font-semibold">Interest</th>
                  <th className="p-3 font-semibold">Lounge link</th>
                  <th className="p-3 font-semibold">Booked</th>
                  <th className="p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const c = companies.find((x) => x.slug === b.company_id);
                  const t = TIMESLOTS.find((x) => x.id === b.timeslot_id);
                  return (
                    <tr key={b.id} className="border-t border-border align-top">
                      <td className="p-3 font-semibold text-navy">
                        {b.full_name}{" "}
                        <button
                          type="button"
                          onClick={() => void renamePerson(b.email, b.full_name)}
                          title="Edit name"
                          className="ml-1 align-middle text-xs font-normal text-muted-foreground hover:text-primary"
                        >
                          ✎
                        </button>
                        <div className="text-xs font-normal text-muted-foreground">{b.job_title}</div>
                      </td>
                      <td className="p-3">{b.organisation}</td>
                      <td className="p-3">{c?.name ?? b.company_id}</td>
                      <td className="p-3">
                        {getSlotInfo(b.timeslot_id).label}
                        <div className="text-xs text-muted-foreground">{getSlotInfo(b.timeslot_id).time}</div>
                      </td>
                      <td className="p-3">
                        <a href={`mailto:${b.email}`} className="text-primary hover:underline">
                          {b.email}
                        </a>
                        <div className="text-xs text-muted-foreground">{b.phone}</div>
                      </td>
                      <td className="p-3">{b.primary_interest ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleCancel(b)}
                          disabled={cancelling === b.id}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <BusyLabel busy={cancelling === b.id} text="Cancelling…">Cancel</BusyLabel>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {bookings.some((b) => b.notes) && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-navy">Notes from applicants</h3>
            <div className="mt-3 space-y-2">
              {bookings
                .filter((b) => b.notes)
                .map((b) => (
                  <div key={b.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                    <span className="font-semibold text-navy">{b.full_name}:</span>{" "}
                    <span className="text-foreground/85">{b.notes}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ACTIVITY LOG */}
        <h2 className="mt-12 text-lg font-bold text-navy">Activity Log</h2>
        <p className="text-sm text-muted-foreground">
          Every booking and cancellation, in order — including who cancelled it.
        </p>
        {events.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No activity yet.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {events.map((ev) => {
              const c = companies.find((x) => x.slug === ev.company_id);
              const t = TIMESLOTS.find((x) => x.id === ev.timeslot_id);
              const style = eventStyle(ev.event_type);
              return (
                <div
                  key={ev.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-sm ${style.wrap}`}
                >
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}>
                    {style.label}
                  </span>
                  <span className="font-semibold text-navy">{ev.full_name}</span>
                  {ev.organisation && <span className="text-muted-foreground">({ev.organisation})</span>}
                  <span className="text-muted-foreground">·</span>
                  <span>{c?.name ?? ev.company_id}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{getSlotInfo(ev.timeslot_id).label} {getSlotInfo(ev.timeslot_id).time}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function eventStyle(type: BookingEvent["event_type"]) {
  switch (type) {
    case "booked":
      return {
        label: "Booked",
        wrap: "border-green-200 bg-green-50",
        badge: "bg-green-600 text-white",
      };
    case "cancelled_by_user":
      return {
        label: "Cancelled (self)",
        wrap: "border-amber-200 bg-amber-50",
        badge: "bg-amber-600 text-white",
      };
    case "cancelled_by_admin":
      return {
        label: "Cancelled (admin)",
        wrap: "border-red-200 bg-red-50",
        badge: "bg-red-600 text-white",
      };
  }
}

// Attendance toggle. Green tick = physically at the event (QR check-in or
// staff override). Clicking flips it — 'manual' via, so QR-vs-desk stays
// distinguishable in the DB.
// Walk-in = RSVP created on event day from 14:00 SGT (registration opens 14:30)
const WALK_IN_FROM = new Date("2026-10-28T14:00:00+08:00").getTime();
const isWalkIn = (r: { created_at: string }) => new Date(r.created_at).getTime() >= WALK_IN_FROM;

function CheckInCell({ rsvp, password, onSaved }: { rsvp: AdminRsvp; password: string; onSaved: () => void | Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const checked = Boolean(rsvp.checked_in_at);
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const res = await adminSetCheckedIn({ data: { password, rsvpId: rsvp.id, checked: !checked } });
    if (res.ok) await onSaved();
    setBusy(false);
  };
  return (
    <button
      onClick={() => void toggle()}
      disabled={busy}
      title={
        checked
          ? `Checked in ${new Date(rsvp.checked_in_at as string).toLocaleTimeString()} (${rsvp.checked_in_via ?? "?"}) — click to undo`
          : "Not checked in — click to mark as attended"
      }
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ring-inset transition ${
        busy
          ? "cursor-wait bg-secondary text-muted-foreground ring-border"
          : checked
            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/30 hover:bg-emerald-100"
            : "bg-secondary text-muted-foreground ring-border hover:bg-muted"
      }`}
    >
      {busy ? (
        <>
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Saving…
        </>
      ) : (
        <>
          {checked ? "✓ Here" : "—"}
          {checked && (rsvp.checked_in_via === "qr" || rsvp.checked_in_via === "lounge") && <span className="text-[9px] font-normal">QR</span>}
        </>
      )}
    </button>
  );
}

// Outreach DB handoff. Exact column set the Lodestart outreach tool imports
// (contacts tab, upsert-by-email): email, org, person, title, country, type,
// notes, sendable. Event dumps go in as UNCLASSIFIED per the taxonomy — Tammy
// sorts them into buckets afterwards. LinkedIn/interest/attendance travel in
// notes so nothing collected here is lost on the way over.
// Organisation strings are free-typed by attendees, so compare them loose:
// lowercase, alphanumerics only. Cohort startups become STARTUP, our own
// side becomes OTHERS — neither belongs in the outreach lead funnel.
function normOrg(v: string): string {
  return (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
const COHORT_ORGS = new Set(
  companies.flatMap((c) => [normOrg(c.name), normOrg(c.displayName), normOrg(c.slug)]).filter(Boolean),
);
const ORGANIZER_ORGS = ["lodestart", "kised", "koreainstituteofstartup", "kocham"];

function downloadOutreachCsv(rsvps: AdminRsvp[]) {
  const esc = (v: string | null | undefined) => {
    const s = v ?? "";
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = "email,org,person,title,country,type,notes,sendable";
  const lines = rsvps.map((r) => {
    const notes = [
      "KISED Climate Tech Startup Challenge Singapore 2026-10-28",
      r.primary_interest || null,
      r.contact_url || null,
      r.checked_in_at ? "attended" : "no-show",
      isWalkIn(r) ? "walk-in" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    // First-pass bucket so Tammy sorts less by hand. Order matters: the
    // participating startups and our own side (organizers, host agency) are
    // in the RSVP list too, and they are NOT outreach leads — tagging them
    // by interest would drop colleagues into the investor list. Match those
    // by organisation first, then fall back to the self-declared interest.
    // Everything is upsert-by-email, so re-uploading after she reclassifies
    // in the tool won't fight her.
    const org = normOrg(r.organisation);
    const interest = (r.primary_interest || "").toLowerCase();
    const type = COHORT_ORGS.has(org)
      ? "STARTUP"
      : ORGANIZER_ORGS.some((o) => org.includes(o))
        ? "OTHERS"
        : interest.includes("invest")
          ? "INVESTOR"
          : interest.includes("pilot") || interest.includes("distribution") || interest.includes("partnership")
            ? "CORPORATE"
            : "UNCLASSIFIED";
    return [r.email, r.organisation, r.full_name, r.job_title, "Singapore", type, notes, "YES"].map(esc).join(",");
  });
  const blob = new Blob(["\ufeff" + header + "\r\n" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `cmk-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="text-2xl font-bold text-navy">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}


// ── Inline contact-link editor ──────────────────────────────────────
// Paste a LinkedIn (or any) URL straight into the RSVP table; saves to the
// same column the lounge card reads. A Google lookup link sits alongside so
// searching for someone doesn't mean retyping their details.
function ContactLinkCell({ rsvp, onSaved }: { rsvp: AdminRsvp; onSaved: () => void }) {
  const [value, setValue] = useState(rsvp.contact_url ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setValue(rsvp.contact_url ?? "");
    setState("idle");
  }, [rsvp.contact_url]);

  const dirty = value.trim() !== (rsvp.contact_url ?? "");

  const save = async () => {
    if (!dirty || state === "saving") return;
    setState("saving");
    const res = await updateContactUrl({ data: { email: rsvp.email, contactUrl: value.trim() } });
    if (res.ok) {
      setState("saved");
      onSaved();
      setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 1500);
    } else {
      setState("error");
    }
  };

  const query = encodeURIComponent(`${rsvp.full_name} ${rsvp.organisation} linkedin`);

  return (
    <div className="min-w-[210px]">
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") setValue(rsvp.contact_url ?? "");
          }}
          placeholder="Paste LinkedIn URL"
          className={`w-full rounded-md border px-2 py-1.5 text-xs outline-none transition ${
            state === "error"
              ? "border-red-400 bg-red-50"
              : dirty
                ? "border-primary bg-primary/5"
                : "border-input bg-background"
          }`}
        />
        <a
          href={`https://www.google.com/search?q=${query}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Search this person on Google"
          className="shrink-0 rounded-md border border-border px-2 py-1.5 text-xs font-semibold text-navy transition hover:bg-muted"
        >
          🔍
        </a>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px]">
        {state === "saving" && <LoadingNote text="Saving…" className="text-muted-foreground" />}
        {state === "saved" && <span className="font-semibold text-green-700">Saved ✓</span>}
        {state === "error" && <span className="font-semibold text-red-600">Failed — retry</span>}
        {state === "idle" && dirty && <span className="text-primary">Enter or click away to save</span>}
        {state === "idle" && !dirty && rsvp.contact_url && (
          <a href={absUrl(rsvp.contact_url)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Open link ↗
          </a>
        )}
        {state === "idle" && !dirty && !rsvp.contact_url && (
          <span className="text-muted-foreground/70">No link yet</span>
        )}
      </div>
    </div>
  );
}
