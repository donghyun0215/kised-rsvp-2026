# Codemap — kised-rsvp-2026

Read this first, then open only the files the task touches. Regenerate with
`python3 scripts/codemap.py .` after adding routes, tables, or env vars.

- Generated at: n/a
- Files mapped: 94 · code LOC: 13,380
- Scripts: `dev`, `build`, `build:dev`, `preview`, `lint`, `format`
- Deps: @hookform/resolvers, @radix-ui/react-accordion, @radix-ui/react-alert-dialog, @radix-ui/react-aspect-ratio, @radix-ui/react-avatar, @radix-ui/react-checkbox, @radix-ui/react-collapsible, @radix-ui/react-context-menu, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-hover-card, @radix-ui/react-label, @radix-ui/react-menubar, @radix-ui/react-navigation-menu, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-separator, @radix-ui/react-slider, @radix-ui/react-slot, @radix-ui/react-switch, @radix-ui/react-tabs, @radix-ui/react-toggle, @radix-ui/react-toggle-group, @radix-ui/react-tooltip, @supabase/supabase-js, @tailwindcss/vite, @tanstack/react-query, @tanstack/react-router, @tanstack/react-start, @tanstack/router-plugin, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, input-otp, lucide-react …

## Routes (pages)
- `/` → src/routes/index.tsx (332 LOC)
- `/admin` → src/routes/admin.tsx (792 LOC)
- `/api/keepalive` → src/routes/api/keepalive.ts (21 LOC)
- `/api/reminders` → src/routes/api/reminders.ts (33 LOC)
- `/book` → src/routes/book.tsx (954 LOC)
- `/companies/$slug` → src/routes/companies/$slug.tsx (323 LOC)
- `/lounge` → src/routes/lounge.tsx (1635 LOC)
- `/meet` → src/routes/meet.tsx (12 LOC)
- `/schedule` → src/routes/schedule.tsx (654 LOC)

## Server functions (TanStack createServerFn)
- src/lib/booking.server.ts: `createBooking`, `fetchBookedSlots`, `lookupBookingsByEmail`, `selfCancelBooking`, `adminListBookings`, `adminRenameAttendee`, `adminCancelBooking`, `adminListEvents`, `createRsvp`, `adminListRsvps`, `lookupRsvpByEmail`, `listLoungeProfiles`, `updateContactUrl`, `fetchMeetingRoster`, `markLoungeCheckIn`, `adminSetCheckedIn`, `listMyContacts`, `addLoungeContact`, `removeLoungeContact`, `saveLoungeContactInfo`, `addCustomContact`, `updateCustomContact`, `removeCustomContact`, `listTeamContacts`

## Data
- table `booking_events` — defined in supabase/schema.sql
- table `bookings` — defined in supabase/schema.sql
- table `lounge_contacts` — defined in supabase/schema.sql (+custom_name, custom_org, custom_title, note)
- table `rsvps` — defined in supabase/schema.sql (+additional_attendees, checked_in_at, checked_in_via, contact_url, show_in_lounge)
- Supabase tables touched in code: `rsvps`×21, `bookings`×14, `lounge_contacts`×8, `booking_events`×2, `booked_slots`×1

## Environment variables
- `CONFIRMATION_WEBHOOK_TOKEN`, `ADMIN_PASSWORD`, `CONFIRMATION_WEBHOOK_URL`, `LOUNGE_ACCESS_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Biggest files (open these surgically — grep for the symbol, don't cat)
- src/routes/lounge.tsx — 1635 LOC
- src/lib/booking.server.ts — 1116 LOC
- src/routes/book.tsx — 954 LOC
- src/routes/admin.tsx — 792 LOC
- src/components/ui/sidebar.tsx — 744 LOC
- src/routes/schedule.tsx — 654 LOC
- src/data/companies.ts — 604 LOC
- src/routes/index.tsx — 332 LOC
- src/components/ui/chart.tsx — 331 LOC
- src/routes/companies/$slug.tsx — 323 LOC
- scripts/generate-onepager-pdfs.py — 244 LOC
- src/components/ui/carousel.tsx — 240 LOC

## Exports by file
- **scripts/codemap.py** (165): rel_files, loc, read, scan, tree, main
- **scripts/generate-onepager-pdfs.py** (244): wrap_text, draw_company
- **src/components/Spinner.tsx** (32): BusyLabel, LoadingNote, Spinner
- **src/components/Wordmark.tsx** (17): Wordmark
- **src/components/ui/badge.tsx** (32): BadgeProps
- **src/components/ui/button.tsx** (49): ButtonProps
- **src/components/ui/chart.tsx** (331): ChartConfig
- **src/data/companies.ts** (604): Company, MEETUP_COMPANIES, TRACKS, companies, getCompanyBySlug
- **src/data/companyImages.ts** (48): STARTUP_IMAGES, STARTUP_LOGOS
- **src/data/speakers.ts** (13): CONGRATULATORY, JUDGES, Person
- **src/data/timeslots.ts** (116): EVENT_ADDRESS, EVENT_DATE, EVENT_DAY_SHORT, EVENT_MAP_URL, EVENT_NAME, EVENT_NAME_LINE1, EVENT_NAME_LINE2, EVENT_NAME_SHORT, EVENT_TIME, EVENT_VENUE, HOST_NAME, MEETUP_ADDRESS, MEETUP_DATE, MEETUP_DAY_SHORT, MEETUP_MAP_URL, MEETUP_TIME, MEETUP_VENUE, NULDAM_ADDRESS …
- **src/hooks/use-mobile.tsx** (19): useIsMobile
- **src/lib/booking.server.ts** (1116): AdminBooking, AdminRsvp, BookingEvent, BookingInput, BookingResult, LoungeProfile, MyBooking, RosterEntry, RsvpInput, RsvpResult, TeamContactEntry, WalletEntry, addCustomContact, addLoungeContact, adminCancelBooking, adminListBookings, adminListEvents, adminListRsvps …
- **src/lib/confirmation.ts** (214): ConfirmationEmail, ConfirmationInput, MailKind, buildConfirmation
- **src/lib/error-capture.ts** (27): consumeLastCapturedError
- **src/lib/error-page.ts** (30): renderErrorPage
- **src/lib/lovable-error-reporting.ts** (36): reportLovableError
- **src/lib/reminders-auto.server.ts** (74): REMINDER_KINDS, buildReminderBatch, buildThanksBatch
- **src/lib/supabase-admin.server.ts** (17): supabaseAdmin
- **src/lib/supabase-client.ts** (12): supabase
- **src/lib/thanks.ts** (34): buildThankYou
- **src/lib/url.ts** (8): absUrl
- **src/lib/utils.ts** (6): cn
- **src/router.tsx** (16): getRouter
- **src/routes/__root.tsx** (138): Route
- **src/routes/admin.tsx** (792): Route
- **src/routes/api/keepalive.ts** (21): Route
- **src/routes/api/reminders.ts** (33): Route
- **src/routes/book.tsx** (954): Route
- **src/routes/companies/$slug.tsx** (323): Route
- **src/routes/index.tsx** (332): Route
- **src/routes/lounge.tsx** (1635): Route
- **src/routes/meet.tsx** (12): Route
- **src/routes/schedule.tsx** (654): Route
- **src/start.ts** (22): startInstance

## Tree (depth 3)
```
AGENTS.md
README.md
aidlc-docs/
  README.md
  audit.md
  codemap.md
bunfig.toml
components.json
eslint.config.js
package.json
scripts/
  codemap.py
  generate-onepager-pdfs.py
src/
  components/
    Spinner.tsx
    Wordmark.tsx
    ui/
  data/
    companies.ts
    companyImages.ts
    speakers.ts
    timeslots.ts
  hooks/
    use-mobile.tsx
  lib/
    booking.server.ts
    confirmation.ts
    error-capture.ts
    error-page.ts
    lovable-error-reporting.ts
    reminders-auto.server.ts
    supabase-admin.server.ts
    supabase-client.ts
    thanks.ts
    url.ts
    utils.ts
  router.tsx
  routes/
    README.md
    __root.tsx
    admin.tsx
    api/
    book.tsx
    companies/
    index.tsx
    lounge.tsx
    meet.tsx
    schedule.tsx
  server.ts
  start.ts
  styles.css
supabase/
  schema.sql
tsconfig.json
vercel.json
vite.config.ts
```
