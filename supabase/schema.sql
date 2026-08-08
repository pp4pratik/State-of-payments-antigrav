-- Generated from the "UPI Pulse" Airtable base (appbVBAj5OHS5xYQ6) field schema.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.

create table if not exists public.monthly_trend (
  id bigint generated always as identity primary key,
  month date,
  total_volume_mn numeric,
  total_value_cr numeric,
  banks_live numeric,
  unique (month)
);

alter table public.monthly_trend enable row level security;
drop policy if exists "public read" on public.monthly_trend;
create policy "public read" on public.monthly_trend for select using (true);

create table if not exists public.app_stats (
  id bigint generated always as identity primary key,
  app_name text,
  month date,
  volume_mn numeric,
  value_cr numeric,
  unique (app_name, month)
);

alter table public.app_stats enable row level security;
drop policy if exists "public read" on public.app_stats;
create policy "public read" on public.app_stats for select using (true);

create table if not exists public.p2p_p2m (
  id bigint generated always as identity primary key,
  month date,
  p2p_volume_mn numeric,
  p2p_value_cr numeric,
  p2m_volume_mn numeric,
  p2m_value_cr numeric,
  unique (month)
);

alter table public.p2p_p2m enable row level security;
drop policy if exists "public read" on public.p2p_p2m;
create policy "public read" on public.p2p_p2m for select using (true);

create table if not exists public.merchant_categories (
  id bigint generated always as identity primary key,
  description text,
  mcc text,
  type text,
  month date,
  volume_mn numeric,
  value_cr numeric,
  unique (mcc, month)
);

alter table public.merchant_categories enable row level security;
drop policy if exists "public read" on public.merchant_categories;
create policy "public read" on public.merchant_categories for select using (true);

create table if not exists public.statewise (
  id bigint generated always as identity primary key,
  district text,
  state text,
  month date,
  volume_mn numeric,
  volume_share_pct numeric,
  value_cr numeric,
  value_share_pct numeric,
  unique (state, district, month)
);

alter table public.statewise enable row level security;
drop policy if exists "public read" on public.statewise;
create policy "public read" on public.statewise for select using (true);

create table if not exists public.circulars (
  id bigint generated always as identity primary key,
  ref text,
  fy text,
  title text,
  date_added date,
  pdf_url text,
  unique (fy, ref)
);

alter table public.circulars enable row level security;
drop policy if exists "public read" on public.circulars;
create policy "public read" on public.circulars for select using (true);

create table if not exists public.autopay_registrations (
  id bigint generated always as identity primary key,
  psp text,
  month date,
  registrations_mn numeric,
  approved_pct numeric,
  bd_pct numeric,
  td_pct numeric,
  unique (psp, month)
);

alter table public.autopay_registrations enable row level security;
drop policy if exists "public read" on public.autopay_registrations;
create policy "public read" on public.autopay_registrations for select using (true);

create table if not exists public.autopay_executions (
  id bigint generated always as identity primary key,
  bank text,
  month date,
  executions_mn numeric,
  approved_pct numeric,
  bd_pct numeric,
  td_pct numeric,
  unique (bank, month)
);

alter table public.autopay_executions enable row level security;
drop policy if exists "public read" on public.autopay_executions;
create policy "public read" on public.autopay_executions for select using (true);

create table if not exists public.psp_member_performance (
  id bigint generated always as identity primary key,
  entity_name text,
  direction text,
  month date,
  volume_mn numeric,
  approved_pct numeric,
  bd_pct numeric,
  td_pct numeric,
  unique (entity_name, direction, month)
);

alter table public.psp_member_performance enable row level security;
drop policy if exists "public read" on public.psp_member_performance;
create policy "public read" on public.psp_member_performance for select using (true);

create table if not exists public.rbi_cards (
  id bigint generated always as identity primary key,
  month date,
  atms_onsite numeric,
  atms_offsite numeric,
  pos_terminals numeric,
  micro_atms numeric,
  bharat_qr_codes numeric,
  upi_qr_codes numeric,
  credit_cards_outstanding numeric,
  debit_cards_outstanding numeric,
  credit_pos_volume numeric,
  credit_pos_value numeric,
  credit_online_volume numeric,
  credit_online_value numeric,
  credit_others_volume numeric,
  credit_others_value numeric,
  credit_atm_withdrawal_volume numeric,
  credit_atm_withdrawal_value numeric,
  debit_pos_volume numeric,
  debit_pos_value numeric,
  debit_online_volume numeric,
  debit_online_value numeric,
  debit_others_volume numeric,
  debit_others_value numeric,
  debit_atm_withdrawal_volume numeric,
  debit_atm_withdrawal_value numeric,
  debit_pos_withdrawal_volume numeric,
  debit_pos_withdrawal_value numeric,
  unique (month)
);

alter table public.rbi_cards enable row level security;
drop policy if exists "public read" on public.rbi_cards;
create policy "public read" on public.rbi_cards for select using (true);

create table if not exists public.rbi_payments (
  id bigint generated always as identity primary key,
  month date,
  ccil_total_volume numeric,
  ccil_total_value numeric,
  ccil_govt_securities_volume numeric,
  ccil_govt_securities_value numeric,
  ccil_govt_outright_volume numeric,
  ccil_govt_outright_value numeric,
  ccil_govt_repo_volume numeric,
  ccil_govt_repo_value numeric,
  ccil_govt_tri_party_repo_volume numeric,
  ccil_govt_tri_party_repo_value numeric,
  ccil_forex_volume numeric,
  ccil_forex_value numeric,
  ccil_rupee_derivatives_volume numeric,
  ccil_rupee_derivatives_value numeric,
  rtgs_total_volume numeric,
  rtgs_total_value numeric,
  rtgs_customer_volume numeric,
  rtgs_customer_value numeric,
  rtgs_interbank_volume numeric,
  rtgs_interbank_value numeric,
  retail_credit_transfers_volume numeric,
  retail_credit_transfers_value numeric,
  aeps_fund_transfers_volume numeric,
  aeps_fund_transfers_value numeric,
  apbs_volume numeric,
  apbs_value numeric,
  imps_volume numeric,
  imps_value numeric,
  nach_credit_volume numeric,
  nach_credit_value numeric,
  neft_volume numeric,
  neft_value numeric,
  upi_volume numeric,
  upi_value numeric,
  debit_transfers_volume numeric,
  debit_transfers_value numeric,
  bhim_aadhaar_pay_volume numeric,
  bhim_aadhaar_pay_value numeric,
  nach_debit_volume numeric,
  nach_debit_value numeric,
  netc_linked_account_volume numeric,
  netc_linked_account_value numeric,
  card_payments_volume numeric,
  card_payments_value numeric,
  credit_cards_volume numeric,
  credit_cards_value numeric,
  credit_cards_pos_volume numeric,
  credit_cards_pos_value numeric,
  credit_cards_other_volume numeric,
  credit_cards_other_value numeric,
  debit_cards_volume numeric,
  debit_cards_value numeric,
  debit_cards_pos_volume numeric,
  debit_cards_pos_value numeric,
  debit_cards_other_volume numeric,
  debit_cards_other_value numeric,
  ppi_total_volume numeric,
  ppi_total_value numeric,
  ppi_wallets_volume numeric,
  ppi_wallets_value numeric,
  ppi_cards_volume numeric,
  ppi_cards_value numeric,
  ppi_cards_pos_volume numeric,
  ppi_cards_pos_value numeric,
  ppi_cards_other_volume numeric,
  ppi_cards_other_value numeric,
  paper_instruments_volume numeric,
  paper_instruments_value numeric,
  paper_cts_volume numeric,
  paper_cts_value numeric,
  total_retail_payments_volume numeric,
  total_retail_payments_value numeric,
  total_payments_volume numeric,
  total_payments_value numeric,
  total_digital_payments_volume numeric,
  total_digital_payments_value numeric,
  mobile_payments_volume numeric,
  mobile_payments_value numeric,
  mobile_intrabank_volume numeric,
  mobile_intrabank_value numeric,
  mobile_interbank_volume numeric,
  mobile_interbank_value numeric,
  internet_payments_volume numeric,
  internet_payments_value numeric,
  internet_intrabank_volume numeric,
  internet_intrabank_value numeric,
  internet_interbank_volume numeric,
  internet_interbank_value numeric,
  atm_cash_withdrawal_volume numeric,
  atm_cash_withdrawal_value numeric,
  atm_withdrawal_credit_card_volume numeric,
  atm_withdrawal_credit_card_value numeric,
  atm_withdrawal_debit_card_volume numeric,
  atm_withdrawal_debit_card_value numeric,
  atm_withdrawal_prepaid_card_volume numeric,
  atm_withdrawal_prepaid_card_value numeric,
  pos_cash_withdrawal_volume numeric,
  pos_cash_withdrawal_value numeric,
  pos_withdrawal_debit_card_volume numeric,
  pos_withdrawal_debit_card_value numeric,
  pos_withdrawal_prepaid_card_volume numeric,
  pos_withdrawal_prepaid_card_value numeric,
  micro_atm_withdrawal_volume numeric,
  micro_atm_withdrawal_value numeric,
  micro_atm_aeps_volume numeric,
  micro_atm_aeps_value numeric,
  cards_total_count numeric,
  credit_cards_count numeric,
  debit_cards_count numeric,
  ppi_total_count numeric,
  ppi_wallets_count numeric,
  ppi_cards_count numeric,
  atms_and_crms_count numeric,
  bank_owned_atms_count numeric,
  white_label_atms_count numeric,
  micro_atms_count numeric,
  pos_terminals_count numeric,
  bharat_qr_count numeric,
  upi_qr_count numeric,
  unique (month)
);

alter table public.rbi_payments enable row level security;
drop policy if exists "public read" on public.rbi_payments;
create policy "public read" on public.rbi_payments for select using (true);

