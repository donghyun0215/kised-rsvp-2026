# Audit Log

Chronological record of AI-DLC sessions: what was requested, what was produced,
and what was approved.

---

## 2026-08-23 — Phase 0: Reverse engineering

**Requested:** Apply AI-DLC to the repository. Create `aidlc-docs/` and, before
anything else, reverse-engineer the existing system — component structure,
routes, Supabase schema, and the main user flows (RSVP, 1:1 booking, admin) —
into static and dynamic models. Do not proceed past this step without approval.

**Baseline:** commit `cd1aca6`.

**Method:** read `src/routes/*`, `src/lib/booking.server.ts`, `src/data/*`, and
`supabase/schema.sql` directly. No runtime database access was available from
the working environment, so the data model is derived from the committed DDL
plus one column known to have been applied by hand.

**Produced:**

| Artefact | Contents |
|---|---|
| `README.md` | Purpose of the folder, working agreement, phase status |
| `reverse-engineering/00-overview.md` | Purpose, actors, boundaries, deployment topology, stack |
| `reverse-engineering/01-static-model.md` | Route tree, server function inventory, data modules, live-update strategy |
| `reverse-engineering/02-data-model.md` | Tables, constraints, view, realtime, invariants, schema drift |
| `reverse-engineering/03-dynamic-model.md` | Sequence flows A–D, slot state machine, concurrency behaviour |
| `reverse-engineering/04-constraints-risks.md` | 5 hard constraints, 1 incident, 10 risks, operational notes |
| `decisions/ADR-000-adopting-aidlc.md` | The decision to adopt this methodology |

**Notable findings:**

- Schema drift: `additional_attendees` is in production but not in
  `supabase/schema.sql`, so the file can no longer rebuild the schema (R3).
- Booking correctness rests entirely on two Postgres unique constraints, and the
  user-facing error messages are keyed off those constraint *names* — renaming
  one degrades the messaging silently.
- Round and track eligibility are enforced in the UI only; the server function
  does not re-check them (R5).
- Admin auth is a shared password with a hardcoded fallback, re-sent on every
  request, with no session or rate limiting (R1).

**Code changed:** none. Documentation only.

**Status:** ⏸ Awaiting review. No Inception or Construction work begins until
the approver signs off on these models.

---

## 2026-08-23 — Networking Lounge: Inception approved, Construction staged

**Approved with amendments** (recorded in `inception/networking-lounge/plan.md`):
contact_url replaces linkedin_url; lounge-gate mini-form for low-friction
updates (doubles as organiser backfill); default visibility ON; guests excluded.

**Built on branch `feat/networking-lounge`** (not merged — C4 gate):
- U1: `supabase/schema.sql` gains `additional_attendees` (drift repair, R3),
  `contact_url`, `show_in_lounge` — committed to main; ALTERs pending in prod.
- U2: `/book` captures contact link + lounge opt-out; `createRsvp` passes both.
- U3: `listLoungeProfiles` (key OR rsvp-email auth; returns name/org/title/
  interest/contact only — never email/phone), `updateContactUrl`.
  `LOUNGE_ACCESS_KEY` from env with **no fallback**.
- U4: unlisted `/lounge` — gate screen, card wall (initials avatar, interest
  chip, contact button), mini-form. noindex, zero nav links.

Verified: vite build ✓, tsc ✓, gate renders ✓, /book field ✓, landing has no
/lounge reference ✓.

**Merge gate:** branch merges to main only after the owner confirms the two
ALTER statements ran in production. U5 (QR asset, reminder copy) follows the
merge.

---

## 2026-08-24 — Lounge mobile fix + Reminder email generator

**Mobile (reported via KakaoTalk in-app browser screenshots):** page rendered
zoomed-out/desktop-width. Hardened `/lounge` mobile-first: `overflow-x-hidden`
root guard (prevents webview fit-zoom from any overflowing child), header
compaction with truncation, card role/org now wraps two lines (line-clamp)
instead of clipping, detail modal becomes a bottom sheet on phones
(`items-end`, `max-h-[88dvh]`, scrollable), 16px inputs (kills iOS focus-zoom),
full-width tap targets.

**Reminders (small-cycle feature, owner-approved option 1):** new
`src/lib/reminders.ts` — joins RSVPs with bookings by email and renders one
personalised plain-text email per attendee: showcase/lunch blocks from PROGRAM,
2-Sep 1:1 meetings with company + round + time, Nuldam meetings under "Also on
your calendar", companion badge line, lounge/LinkedIn plug, change-booking
link; "slots still open" nudge when no day meeting. Admin gains a "Reminder
Emails" section: per-person Copy / mailto, CSV download (email,name,subject,
body) for Gmail mail merge. English only per owner. No sending from the app —
scope limit reaffirmed.

Verified: tsc ✓ build ✓; generator smoke-tested against three attendee shapes
(full / RSVP-only / Nuldam-only) with real slot ids.

---

## 2026-08-24 — Lounge UI pass (wide layout + directory controls)

**Problem:** on desktop the wall sat in a 1024px column with dead margins both
sides, and cards read as sparse.

**Approach:** the empty space was spent on function, not decoration. Container
widened to `max-w-7xl` with a two-column shell at `lg` — a sticky left rail
plus a 1/2/3-column card grid.

- **Rail:** search across name/company/role; a "Who's here" composition list
  (interest categories with counts and proportional bars) where each row is
  also the filter; "has a contact link" toggle; the add/update-link form moved
  here from the header. On phones the rail degrades to a search field plus a
  horizontally scrolling chip row.
- **Cards:** role and organisation split onto separate lines (org in a distinct
  weight), avatars re-keyed to a cool marine palette so 57 tiles read as one
  wall rather than a rainbow, interest chips gain ring outlines, hover lift and
  visible focus ring retained.
- **Fixed:** `CHIP_COLORS` keys never matched the real `primary_interest`
  values from the RSVP form, so every chip except Investment fell through to
  the default grey. Now keyed to the four actual options.
- **Empty state:** filters that match nobody get a direction and a clear action
  rather than a blank grid.

Verified: tsc ✓ build ✓ dev-server render ✓ (no visual regression testing
available in this environment — owner to eyeball).

---

## 2026-08-24 — Lounge entry screen + privacy notice (client request)

**From Tammy (KakaoTalk):** scanning the QR flew past the first screen too
quickly; she asked for a deliberate entry step and a privacy notice beneath it.

- QR arrivals no longer auto-authenticate. The key is held and a welcome card
  is shown — event eyebrow, lounge title, one line on what it is, and an
  "Enter Virtual Networking Lounge" button that performs the load.
- New `LoungeNotice` renders under **both** entry paths (QR and email gate):
  what the directory shows, exclusive access, no direct contact info, and the
  data-management route (in-lounge link form or support@lodestart.ai).
- In-lounge footer line now carries the same support address so opt-out is
  actionable from inside too.

Verified: tsc ✓ build ✓; QR path renders the button and does not enter on load;
notice present on both paths.

---

## 2026-08-24 — Entry screen wording (client markup)

**From Tammy:** "Virtual Networking Lounge" appeared three times on one screen
(header, card title, button). She marked up the header for deletion and
sketched the screen as a single welcome headline with a short button.

- Header title block now renders only once inside the lounge; on the entry
  screens the card carries the name, so the header is logo-only.
- Welcome card headline: "Welcome to the Virtual Networking Lounge"
  (uppercase display, two lines); button shortened to "Enter the lounge".
- Both entry cards gained a faint marine glyph watermark (waves, hull, buoy,
  rotor) at ~4.5% opacity, per her mock — subject vocabulary, quiet enough that
  the headline stays dominant.

Verified: tsc ✓ build ✓; entry screen renders the title once, header duplicate
absent, notice intact.

---

## 2026-08-24 — Entry screen type hierarchy (client follow-up)

**From Tammy:** headline should be bold and large; the disclaimer can be much
smaller ("금융권들은 disclaimer 개미만한 글씨로").

- Headline: 30px on phones / 38px from `sm`, extrabold, tightened tracking and
  leading so the two lines lock together.
- Notice: dropped to 9.5px at 85% muted with a 9px eyebrow, tighter row spacing
  and padding — legal fine print, present but out of the way.

Verified: tsc ✓ build ✓.

---

## 2026-08-24 — Lounge hero redesign, navbar links, two new 1:1 rounds

**From Tammy (reference mock):** redesign the lounge entry in the illustrated
hero style; email-gated with an RSVP prompt when the email is unknown; add a
Networking Lounge item to the main site nav; and open two additional 1:1
rounds (13:00–13:30, 13:30–14:00) for all companies — five slots per company.

- **Rounds:** `slot4`/`slot5` added to TIMESLOTS in chronological order; labels
  renumbered by the clock (slot4=R1, slot5=R2, slot1=R3, slot2=R4, slot3=R5).
  IDs of existing bookings untouched. **No DB change needed** — timeslot ids
  are free text under the existing unique constraints (C4 satisfied trivially).
  `/book` selection state now derives from TIMESLOTS instead of a hardcoded
  three-key object; admin grid, capacity math and reminder emails adapt via
  existing dynamic rendering. PROGRAM meetups block now reads 13:00–16:00 /
  five rounds.
- **Entry redesign:** full-bleed navy→primary hero with decorative dot grids /
  circles / triangle, white Arial-bold two-line headline, ecosystem tagline,
  and an inline email gate card ("Enter lounge →", lock note). Unknown email
  now answers with "please RSVP first" plus a direct /book link. QR arrivals
  get a "verified via the event QR" card with a single enter button. Reference
  illustration was approximated with an arch card (KIMST mark + marine
  watermark) rather than stock people art. Notice restyled as the mock's
  lock-icon card; navy footer (KIMST 2026 / contact) added to the gate layout.
- **Nav:** "Lounge" link added on index, /book and /meet headers (company
  pages left uncluttered — their nav is CTA-focused). The lounge is thereby no
  longer unlisted by obscurity; the email/QR gate is now the sole control,
  which the client explicitly chose.

Verified: tsc ✓ build ✓; TIMESLOTS order/labels and slot4 SlotInfo checked via
tsx; hero, gate, notice, footer, QR path and index nav link render ✓.

---

## 2026-08-24 — Lounge hero: use the mock's artwork verbatim

**Feedback:** the redesign approximated the reference; the client wants the
graphics duplicated exactly, especially the illustration.

The reference mock is the client's own generated asset, so the illustration
(arch + networking figures) and the footer skyline were **cropped straight out
of the mock** into `src/assets/lounge-hero-illustration.png` and
`lounge-footer-art.png`. The mock's hero background is flat `#002a75`
(sampled), so the hero switched from a gradient to that flat fill — crops
composite seamlessly with no feathering. Headline text now matches the mock
("Welcome to / Virtual Networking Lounge"), the notice title renders the
literal "<Networking Lounge Notice>", the notice card gained the mock's corner
shapes (soft circle, hatched circle, dot grid), and the footer gained the
skyline art plus the three social icon roundels (decorative, non-linking — no
real accounts exist to link).

Verified: tsc ✓ build ✓.

---

## 2026-08-25 — Schedule page: 1:1 Meeting Roster (client request)

**From Tammy:** add one-line profiles of everyone doing 1:1 meetups, grouped by
company, as a separate menu on the internal schedule page.

- New unauthenticated GET server fn `fetchMeetingRoster` returning only
  company_id, timeslot_id, full_name, organisation, job_title,
  primary_interest — email/phone/notes never leave the server. Same exposure
  level as the lounge, on the same unlisted-page posture as /schedule (R10);
  client-directed.
- `/schedule` gains a pill menu: 프로그램 일정 / 1:1 미팅 로스터. Roster view:
  per-company cards (track-tinted headers, sector line, Track badge) listing
  each offered round (label + time) with the attendee one-liner — name bold,
  role @ org muted, interest chip — or "미배정 (오픈)". Nuldam in-depth
  sessions rendered below in the same card language. Confirmed-count stat and
  a manual refresh button; DB-driven, so it stays current as bookings change.
- No schema change; read-only.

Verified: tsc ✓ build ✓ menu renders ✓ (data path exercises on prod where the
real service key exists).

---

## 2026-08-25 — Admin: inline lounge-link editing

**Problem:** the organiser was googling attendees and entering LinkedIn URLs
through the public lounge mini-form, one at a time.

- `AdminRsvp` type gained `contact_url` / `show_in_lounge` (the admin select
  was already `*`, so only the type lagged).
- RSVP table gains a "Lounge link" column: paste a URL, save on Enter or blur,
  with dirty/saving/saved/error states and an "Open link ↗" when set. Reuses
  the existing `updateContactUrl` server fn (same normalisation, same column
  the lounge reads) rather than adding a parallel path.
- Each row carries a Google lookup button pre-filled with name + organisation +
  "linkedin", so the search step doesn't require retyping.

Verified: tsc ✓ build ✓.

---

## 2026-08-25 — Roster: date labelling, attendee popup, contact links

- **Date:** the 2 September grid now sits under a labelled banner (9월 2일 (수)
  · Open Innovation Day · venue · 13:00–16:00); Nuldam sessions already carried
  their own dates. Each popup also restates the meeting date.
- **Popup:** roster lines became buttons opening the same bottom-sheet /
  dialog pattern as the lounge — initials avatar, interest chip, full
  organisation and role (no truncation), plus a highlighted block naming which
  startup they're meeting and when.
- **Contact links:** `fetchMeetingRoster` now joins `rsvps` to attach
  `contact_url`, **only for attendees with `show_in_lounge = true`** — the
  opt-out is honoured here too. Email is used for the join and dropped before
  the response; a small link glyph marks rows that have a profile, and the
  popup carries a "LinkedIn 프로필 열기" button.

Verified: tsc ✓ build ✓; roster renders and no attendee emails appear in the
page payload.

---

## 2026-08-25 — Reminder bug: new rounds misfiled as Nuldam sessions

Caught while reviewing an exported CSV before a 90-person send.
`reminders.ts` held a hardcoded `DAY_SLOT_IDS = {slot1, slot2, slot3}`, so the
rounds added on 24 Aug (`slot4`, `slot5`) fell through to the Nuldam bucket —
attendees meeting a startup at Suntec at 13:00 would have been told to go to
Nuldam Space. Now derived from `TIMESLOTS`, so any future round is covered.
Round labels also read "(Round 1)" rather than "(1:1 Round 1)".

Lesson recorded: the same hardcoded-slot-list pattern was removed from
`/book` on 24 Aug; this was the surviving copy. Worth grepping for others when
slots change again.

---

## 2026-08-26 — Reminder rework: on-site-only lounge, LinkedIn by reply

**From Tammy:** don't hand out lounge access in the email — announce it as an
on-site perk (people come to network; pre-event list access weakens the reason
to show up). Collect LinkedIn URLs by reply, and re-state that emails/phones
are never shown. ~70% of cards already have manually-backfilled links, so ask
those attendees to confirm rather than provide.

- Reminder emails no longer contain any lounge URL. New "Networking on the
  day" section: lounge exists, attendee-only, **opens on-site via the venue
  QR**. Per-recipient branch on `contact_url`: linked attendees see their
  current LinkedIn URL with "reply if this isn't you"; unlinked attendees are
  asked to reply with theirs. Privacy line restated. Signature now
  "Tammy Ahn · Vice President, KOCHAM Singapore".
- To keep the email honest, the lounge's **email gate now refuses entry before
  2 Sep** (client-side check, friendly "opens on event day" message). The QR
  key path stays live for on-site use and the team; after 2 Sep the email gate
  resumes as the post-event access path.

Verified: tsc ✓ build ✓; both content branches render; no /lounge URL in any
email body.

---

## 2026-08-26 — Lounge email gate reopened pre-event

Owner call: the 2-Sep date lock on the email gate (added earlier the same day)
is removed. Rationale: participating startups (tracks 1–2) and MYSC/Lodestart
staff already hold the QR and have RSVP'd, and general attendees were never
given the lounge URL — the reminder emails deliberately omit it — so the date
filter added friction for insiders without meaningfully blocking anyone else.
The email gate is again the single rule: any registered RSVP email enters, any
time. Noted: /lounge remains discoverable via site nav, so early browsing by a
determined attendee is possible and accepted.

Correction: the previous commit (e69def6) recorded this change but a failed
string match meant only the audit note landed; the gate code itself is removed
in the follow-up commit. Noted as a process miss — the scripted edit asserted
against stale content and the commit proceeded without re-verifying the diff.
