# CMK ImpactPreneur · KR-SG Climatetech Showcase 2026

Event site for the CMK ImpactPreneur Singapore programme (6–7 Oct 2026):
RSVP, startup pages, live schedule, attendee networking lounge with contact
wallet + group email, QR check-in, and an organizer admin with personalised
mailouts and CRM export. Built on the KIMST Singapore Connect stack
(TanStack Start + Supabase + Vercel).

## Setup

1. **Supabase** — create a new project, open SQL Editor, paste and run
   `supabase/schema.sql` once.
2. **Vercel** — import this repo and set the environment variables below.
3. **Deploy.** The admin lives at `/admin` (password = `ADMIN_PASSWORD`).
   The on-site check-in QR points at `/lounge?key=<LOUNGE_ACCESS_KEY>`.

## Environment variables

| Name | Where to find it | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | public |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public | public |
| `SUPABASE_URL` | same Project URL | server only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | **server only — never `VITE_`** |
| `ADMIN_PASSWORD` | choose one | gates `/admin` |
| `LOUNGE_ACCESS_KEY` | any long random string | printed into the entrance QR; key + email = check-in |

## Feature flags

- `ONE_ON_ONE_OPEN` in `src/data/timeslots.ts` — public 1:1 self-booking is
  **off** until the organizers decide whether external partners self-book or
  meetings are arranged by the ops team. While off, the RSVP form still lets
  guests tick "1:1 meetups" as an interest flag.

## Content sources

- Companies: `src/data/companies.ts` (from the master ops sheet, 참여기업 정보 tab)
- Schedule: `src/data/timeslots.ts` + `src/routes/schedule.tsx` (일정표_TBC — still TBC)
- Startup images: `src/assets/startups/` · IR decks: `public/onepagers/`
