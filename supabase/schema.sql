-- CMK ImpactPreneur · KR-SG Climatetech Showcase 2026 — full schema
-- Run this ONCE in the NEW Supabase project: Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: every statement is idempotent (if not exists / or replace).
-- Inherited from the KIMST Singapore Connect stack; the later "migration"
-- blocks below (check-in, contacts wallet, notes, custom contacts) are folded
-- in here so a fresh project gets everything in one go.

-- ── bookings table ──────────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  timeslot_id text not null,
  full_name text not null,
  organisation text not null,
  job_title text not null,
  email text not null,
  phone text not null,
  primary_interest text,
  notes text,
  created_at timestamptz not null default now(),

  -- A company can only be booked once per timeslot (one meeting = one seat).
  constraint bookings_company_timeslot_key unique (company_id, timeslot_id),
  -- One email can only hold one booking per timeslot (prevents applying to
  -- two companies in the same session; still allows session 1 + session 2).
  constraint bookings_email_timeslot_key unique (email, timeslot_id)
);

alter table public.bookings enable row level security;

-- No public policies are created on `bookings` on purpose — the table
-- contains applicant PII (name, email, phone) and all writes/reads happen
-- server-side via the service role key in the TanStack Start server
-- functions (src/lib/booking.server.ts), which bypasses RLS.

-- ── audit log ────────────────────────────────────────────────────
-- Records every booking creation/cancellation as an immutable event, with a
-- snapshot of the booking details, so the trail survives the row being
-- deleted from `bookings`. Answers "who booked what, when, and who
-- cancelled it" in the admin dashboard.
create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('booked', 'cancelled_by_user', 'cancelled_by_admin')),
  booking_id uuid not null,
  company_id text not null,
  timeslot_id text not null,
  full_name text not null,
  organisation text,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.booking_events enable row level security;

-- ── rsvps table ─────────────────────────────────────────────────
-- One row per attendee (email-unique). Captures which program blocks they
-- will attend: Success Story Showcase, Networking Lunch (catering headcount),
-- and 1:1 Onsite Meetups. Re-submitting with the same email updates choices.
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  organisation text not null,
  job_title text not null,
  email text not null unique,
  phone text not null,
  primary_interest text,
  notes text,
  attend_showcase boolean not null default false,
  attend_lunch boolean not null default false,
  attend_meetups boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.rsvps enable row level security;

-- ── service_role grants ─────────────────────────────────────────
-- With "Automatically expose new tables" disabled on the project, even
-- service_role needs explicit table privileges. All reads/writes go through
-- the server functions using this role.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.bookings to service_role;
grant select, insert on public.booking_events to service_role;
grant select, insert, update, delete on public.rsvps to service_role;
alter default privileges in schema public grant all on tables to service_role;

-- ── public availability view ────────────────────────────────────
-- Exposes only which (company, timeslot) pairs are taken — no PII — so the
-- browser can grey out full slots using the anon key.
create or replace view public.booked_slots as
  select company_id, timeslot_id from public.bookings;

grant select on public.booked_slots to anon, authenticated;

-- ── realtime ────────────────────────────────────────────────────
-- Broadcast INSERT/DELETE so the booking page and admin dashboard live-update.
-- (Both pages also poll on an interval as a fallback, so this is optional
-- but recommended.) Safe to re-run — errors harmlessly if already added.
do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.booking_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.rsvps;
exception when duplicate_object then null;
end $$;

-- ── verification queries (optional) ─────────────────────────────
-- select * from public.bookings order by created_at desc;
-- select * from public.booking_events order by created_at desc;

-- ── networking lounge (2026-08) ─────────────────────────────────
-- additional_attendees repairs earlier drift: the column was added by hand in
-- production (Aug 2026) but never recorded here. contact_url holds any
-- professional link (LinkedIn / website / open-chat) shown on the attendee's
-- lounge card; show_in_lounge lets an attendee opt out of the wall.
alter table public.rsvps add column if not exists additional_attendees text;
alter table public.rsvps add column if not exists contact_url text;
alter table public.rsvps add column if not exists show_in_lounge boolean not null default true;

-- ── attendance check-in + my-contacts wallet (2026-08-30) ───────
-- checked_in_at is set when an attendee enters the lounge through the
-- on-site QR (key + email together — remote email-only entry never counts),
-- or toggled manually from /admin. checked_in_via records which.
alter table public.rsvps add column if not exists checked_in_at timestamptz;
alter table public.rsvps add column if not exists checked_in_via text; -- 'qr' | 'manual'

-- Per-attendee saved contacts ("내 명함집"). 1:1 meeting partners are
-- computed live from bookings and never stored here; this table holds only
-- manual additions and user-entered email/phone notes. Email visibility of
-- other attendees is enforced server-side: revealed only between pairs with
-- an actual booking connection.
create table if not exists public.lounge_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  contact_rsvp_id uuid not null references public.rsvps(id) on delete cascade,
  contact_email text,
  contact_phone text,
  source text not null default 'manual', -- 'meeting' | 'manual'
  created_at timestamptz not null default now(),
  unique (owner_email, contact_rsvp_id)
);
alter table public.lounge_contacts enable row level security;
grant select, insert, update, delete on public.lounge_contacts to service_role;

-- ── wallet note (2026-08-30, Tammy) ────────────────────────────────
-- Free-text "where we met / anything" note per saved contact. Optional by
-- design — a card saves fine without it. Dropdown of venues was considered
-- and rejected in favour of plain text (owner's call, 30 Aug).
alter table public.lounge_contacts add column if not exists note text;

-- ── custom (external) contacts (2026-08-30) ────────────────────────
-- People met outside the RSVP universe (Nuldam guests, Seafood Expo,
-- personal intros) can be saved as free-form cards. contact_rsvp_id goes
-- nullable: null + custom_name = an external card. These live ONLY in the
-- owner's wallet — the public attendee wall renders from rsvps alone and
-- never reads this table.
alter table public.lounge_contacts alter column contact_rsvp_id drop not null;
alter table public.lounge_contacts add column if not exists custom_name text;
alter table public.lounge_contacts add column if not exists custom_org text;
alter table public.lounge_contacts add column if not exists custom_title text;
