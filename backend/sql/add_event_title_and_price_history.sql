-- add_event_title_and_price_history.sql
--
-- Applies the same two schema changes Prisma was trying to migrate,
-- but by hand — bypassing `prisma migrate dev`'s live drift-detection,
-- which trips over the pre-existing profiles -> auth.users foreign
-- key (added outside Prisma's tracking) and tries to "reset" the
-- entire auth schema to reconcile it. Run this directly instead.
--
-- Run in the Supabase SQL Editor.

alter table public.markets
  add column if not exists event_title text;

create table if not exists public.price_history (
  id              uuid primary key default gen_random_uuid(),
  market_id       uuid not null references public.markets(id) on delete cascade,
  yes_price_cents smallint,
  no_price_cents  smallint,
  recorded_at     timestamptz not null default now()
);

create index if not exists price_history_market_id_recorded_at_idx
  on public.price_history (market_id, recorded_at);
