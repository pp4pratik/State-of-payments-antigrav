-- Adds Approved %/BD %/TD % to the AutoPay tables, matching psp_member_performance's
-- pattern. NPCI's AutoPay API already returns these per PSP/bank alongside the volume
-- figure - the original fetcher just wasn't capturing them. Needed so the frontend can
-- show "Total Volume" (attempts) vs "Final Volume" (Total Volume x Approved %) instead
-- of only the raw attempt count.
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run: IF NOT EXISTS throughout.

alter table public.autopay_registrations
  add column if not exists approved_pct numeric,
  add column if not exists bd_pct numeric,
  add column if not exists td_pct numeric;

alter table public.autopay_executions
  add column if not exists approved_pct numeric,
  add column if not exists bd_pct numeric,
  add column if not exists td_pct numeric;
