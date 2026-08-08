-- Adds the two AutoPay breakdowns NPCI publishes that weren't captured yet:
-- Registrations by Remitter Bank, and Executions by PSP. Combined with the
-- existing autopay_registrations (by PSP) and autopay_executions (by remitter
-- bank), this covers all 4 tabs NPCI's Ecosystem Statistics page has for
-- Autopay (Top 50 Remitter Banks x {Mandate Registration, Mandate Execution},
-- PSP Wise Registration, PSP Wise execution).
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run: IF NOT EXISTS throughout.

create table if not exists public.autopay_registrations_by_bank (
  id bigint generated always as identity primary key,
  remitter_bank text,
  month date,
  registrations_mn numeric,
  approved_pct numeric,
  bd_pct numeric,
  td_pct numeric,
  unique (remitter_bank, month)
);

alter table public.autopay_registrations_by_bank enable row level security;
drop policy if exists "public read" on public.autopay_registrations_by_bank;
create policy "public read" on public.autopay_registrations_by_bank for select using (true);

create table if not exists public.autopay_executions_by_psp (
  id bigint generated always as identity primary key,
  psp text,
  month date,
  executions_mn numeric,
  approved_pct numeric,
  bd_pct numeric,
  td_pct numeric,
  unique (psp, month)
);

alter table public.autopay_executions_by_psp enable row level security;
drop policy if exists "public read" on public.autopay_executions_by_psp;
create policy "public read" on public.autopay_executions_by_psp for select using (true);
