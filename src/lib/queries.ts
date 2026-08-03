import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

async function latestMonthOf(table: string): Promise<string> {
  const { data, error } = await supabase
    .from(table)
    .select('month')
    .order('month', { ascending: false })
    .limit(1)
    .single()
  if (error) throw error
  return data.month
}

export type MonthlyTrendRow = {
  month: string
  total_volume_mn: number
  total_value_cr: number
  banks_live: number | null
}

export function useMonthlyTrend() {
  return useQuery({
    queryKey: ['monthly_trend'],
    queryFn: async (): Promise<MonthlyTrendRow[]> => {
      const { data, error } = await supabase
        .from('monthly_trend')
        .select('month, total_volume_mn, total_value_cr, banks_live')
        .order('month', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export type AppStatsRow = {
  app_name: string
  month: string
  volume_mn: number
  value_cr: number
}

export function useLatestAppStats() {
  return useQuery({
    queryKey: ['app_stats', 'latest'],
    queryFn: async (): Promise<AppStatsRow[]> => {
      const month = await latestMonthOf('app_stats')
      const { data, error } = await supabase
        .from('app_stats')
        .select('app_name, month, volume_mn, value_cr')
        .eq('month', month)
        .order('volume_mn', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type CircularRow = {
  ref: string
  fy: string
  title: string
  date_added: string | null
  pdf_url: string | null
}

export function useCirculars() {
  return useQuery({
    queryKey: ['circulars'],
    queryFn: async (): Promise<CircularRow[]> => {
      const { data, error } = await supabase
        .from('circulars')
        .select('ref, fy, title, date_added, pdf_url')
      if (error) throw error

      // FY looks like "2025-26"; sort newest FY first, then newest Ref (numeric) first,
      // matching UPI-Dash's regenerate_dashboard.py sort so circular ordering stays consistent.
      return [...data].sort((a, b) => {
        const fyEnd = (fy: string) => Number(fy?.split('-').pop()) || 0
        const refNum = (ref: string) => Number(ref?.match(/\d+/)?.[0]) || 0
        return fyEnd(b.fy) - fyEnd(a.fy) || refNum(b.ref) - refNum(a.ref)
      })
    },
  })
}

export type MerchantCategoryRow = {
  description: string
  mcc: string | null
  type: string | null
  volume_mn: number
  value_cr: number
}

export function useMerchantCategories() {
  return useQuery({
    queryKey: ['merchant_categories', 'latest'],
    queryFn: async (): Promise<MerchantCategoryRow[]> => {
      const month = await latestMonthOf('merchant_categories')
      const { data, error } = await supabase
        .from('merchant_categories')
        .select('description, mcc, type, volume_mn, value_cr')
        .eq('month', month)
        .neq('description', 'Others')
        .order('volume_mn', { ascending: false })
        .limit(8)
      if (error) throw error
      return data
    },
  })
}

export type P2pP2mRow = {
  month: string
  p2p_volume_mn: number
  p2p_value_cr: number
  p2m_volume_mn: number
  p2m_value_cr: number
}

export function useP2pSplit() {
  return useQuery({
    queryKey: ['p2p_p2m', 'latest'],
    queryFn: async (): Promise<P2pP2mRow> => {
      const { data, error } = await supabase
        .from('p2p_p2m')
        .select('month, p2p_volume_mn, p2p_value_cr, p2m_volume_mn, p2m_value_cr')
        .order('month', { ascending: false })
        .limit(1)
        .single()
      if (error) throw error
      return data
    },
  })
}

export type StatewiseRow = {
  state: string
  district: string
  volume_mn: number
  volume_share_pct: number
  value_cr: number
  value_share_pct: number
}

export function useStatewise() {
  return useQuery({
    queryKey: ['statewise', 'latest'],
    queryFn: async (): Promise<StatewiseRow[]> => {
      const month = await latestMonthOf('statewise')
      const { data, error } = await supabase
        .from('statewise')
        .select('state, district, volume_mn, volume_share_pct, value_cr, value_share_pct')
        .eq('month', month)
        .order('volume_share_pct', { ascending: false })
        .limit(15)
      if (error) throw error
      return data
    },
  })
}

export type AutoPayRegistrationRow = { psp: string; registrations_mn: number }
export type AutoPayExecutionRow = { bank: string; executions_mn: number }

export function useAutoPayRegistrations() {
  return useQuery({
    queryKey: ['autopay_registrations', 'latest'],
    queryFn: async (): Promise<AutoPayRegistrationRow[]> => {
      const month = await latestMonthOf('autopay_registrations')
      const { data, error } = await supabase
        .from('autopay_registrations')
        .select('psp, registrations_mn')
        .eq('month', month)
        .order('registrations_mn', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAutoPayExecutions() {
  return useQuery({
    queryKey: ['autopay_executions', 'latest'],
    queryFn: async (): Promise<AutoPayExecutionRow[]> => {
      const month = await latestMonthOf('autopay_executions')
      const { data, error } = await supabase
        .from('autopay_executions')
        .select('bank, executions_mn')
        .eq('month', month)
        .order('executions_mn', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type PspPerformanceRow = {
  entity_name: string
  direction: string
  volume_mn: number
  approved_pct: number
  bd_pct: number
  td_pct: number
}

export function usePspMemberPerformance() {
  return useQuery({
    queryKey: ['psp_member_performance', 'latest'],
    queryFn: async (): Promise<PspPerformanceRow[]> => {
      const month = await latestMonthOf('psp_member_performance')
      const { data, error } = await supabase
        .from('psp_member_performance')
        .select('entity_name, direction, volume_mn, approved_pct, bd_pct, td_pct')
        .eq('month', month)
        .order('volume_mn', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type RbiCardsRow = {
  atms_onsite: number
  atms_offsite: number
  pos_terminals: number
  micro_atms: number
  bharat_qr_codes: number
  upi_qr_codes: number
  credit_cards_outstanding: number
  debit_cards_outstanding: number
  credit_pos_volume: number
  credit_pos_value: number
  credit_online_volume: number
  credit_online_value: number
  credit_atm_withdrawal_volume: number
  credit_atm_withdrawal_value: number
  debit_pos_volume: number
  debit_pos_value: number
  debit_online_volume: number
  debit_online_value: number
  debit_atm_withdrawal_volume: number
  debit_atm_withdrawal_value: number
}

export function useRbiCards() {
  return useQuery({
    queryKey: ['rbi_cards', 'latest'],
    queryFn: async (): Promise<RbiCardsRow> => {
      const { data, error } = await supabase
        .from('rbi_cards')
        .select(
          'atms_onsite, atms_offsite, pos_terminals, micro_atms, bharat_qr_codes, upi_qr_codes, credit_cards_outstanding, debit_cards_outstanding, credit_pos_volume, credit_pos_value, credit_online_volume, credit_online_value, credit_atm_withdrawal_volume, credit_atm_withdrawal_value, debit_pos_volume, debit_pos_value, debit_online_volume, debit_online_value, debit_atm_withdrawal_volume, debit_atm_withdrawal_value',
        )
        .order('month', { ascending: false })
        .limit(1)
        .single()
      if (error) throw error
      return data
    },
  })
}

// Curated headline indicators, not the full ~100-column table - see supabase/table_map.json
// for every field available if this needs extending later.
const RBI_PAYMENT_HEADLINES = [
  { key: 'upi', label: 'UPI' },
  { key: 'imps', label: 'IMPS' },
  { key: 'neft', label: 'NEFT' },
  { key: 'rtgs_total', label: 'RTGS' },
  { key: 'card_payments', label: 'Card Payments' },
  { key: 'total_digital_payments', label: 'Total Digital Payments' },
  { key: 'total_payments', label: 'Total Payments' },
] as const

export type RbiPaymentHeadline = { key: string; label: string; volume_mn: number; value_cr: number }

export function useRbiPayments() {
  return useQuery({
    queryKey: ['rbi_payments', 'latest'],
    queryFn: async (): Promise<RbiPaymentHeadline[]> => {
      const columns = RBI_PAYMENT_HEADLINES.flatMap((h) => [`${h.key}_volume`, `${h.key}_value`])
      const { data, error } = await supabase
        .from('rbi_payments')
        .select(columns.join(', '))
        .order('month', { ascending: false })
        .limit(1)
        .single<Record<string, number>>()
      if (error) throw error
      // Volume is published by RBI in lakh; /10 converts lakh -> Mn (matches the rest of the
      // app's units). Value is already in Rs crore, same as monthly_trend.total_value_cr.
      return RBI_PAYMENT_HEADLINES.map((h) => ({
        key: h.key,
        label: h.label,
        volume_mn: (data[`${h.key}_volume`] ?? 0) / 10,
        value_cr: data[`${h.key}_value`] ?? 0,
      }))
    },
  })
}
