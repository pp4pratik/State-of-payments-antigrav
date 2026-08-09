import { useQuery } from '@tanstack/react-query'
import { fetchGdriveJson } from './gdrive'

// ---------- Monthly trend (Jun 2021 - present), drives the top trend chart ----------
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
      const data = await fetchGdriveJson<MonthlyTrendRow>('monthly_trend')
      return data.sort((a, b) => a.month.localeCompare(b.month))
    },
  })
}

// ---------- App stats, all months present (Jan 2025 onward) ----------
export type AppStatsAll = {
  months: string[] // ISO month strings, ascending
  byApp: Record<string, { vol: number[]; val: number[] }>
  monthTotalVol: number[]
  monthTotalVal: number[]
}

export function useAppStatsAll() {
  return useQuery({
    queryKey: ['app_stats', 'all'],
    queryFn: async (): Promise<AppStatsAll> => {
      const data = await fetchGdriveJson<{
        app_name: string
        month: string
        volume_mn: number
        value_cr: number
      }>('app_stats')

      const months = [...new Set(data.map((r) => r.month))].sort()
      const monthIdx = new Map(months.map((m, i) => [m, i]))
      const byApp: AppStatsAll['byApp'] = {}
      const monthTotalVol = months.map(() => 0)
      const monthTotalVal = months.map(() => 0)

      for (const row of data) {
        const i = monthIdx.get(row.month)
        if (i === undefined) continue
        if (!byApp[row.app_name]) {
          byApp[row.app_name] = { vol: months.map(() => 0), val: months.map(() => 0) }
        }
        byApp[row.app_name].vol[i] = row.volume_mn
        byApp[row.app_name].val[i] = row.value_cr
        monthTotalVol[i] += row.volume_mn
        monthTotalVal[i] += row.value_cr
      }

      return { months, byApp, monthTotalVol, monthTotalVal }
    },
  })
}

// ---------- P2P / P2M split, all months ----------
export type P2pRow = {
  month: string
  p2p_volume_mn: number
  p2p_value_cr: number
  p2m_volume_mn: number
  p2m_value_cr: number
}

export function useP2pAll() {
  return useQuery({
    queryKey: ['p2p_p2m', 'all'],
    queryFn: async (): Promise<P2pRow[]> => {
      const data = await fetchGdriveJson<P2pRow>('p2p_p2m')
      return data.sort((a, b) => a.month.localeCompare(b.month))
    },
  })
}

// ---------- Merchant categories, all months (grouped client-side) ----------
export type CategoryRow = { name: string; vol: number; val: number }

export function useMerchantCategoriesAll() {
  return useQuery({
    queryKey: ['merchant_categories', 'all'],
    queryFn: async (): Promise<Record<string, CategoryRow[]>> => {
      const data = await fetchGdriveJson<{
        description: string
        month: string
        volume_mn: number
        value_cr: number
      }>('merchant_categories')

      const filtered = data.filter((r) => r.description !== 'Others')
      filtered.sort((a, b) => b.volume_mn - a.volume_mn)

      const byMonth: Record<string, CategoryRow[]> = {}
      for (const row of filtered) {
        const list = (byMonth[row.month] ??= [])
        if (list.length < 5) list.push({ name: row.description, vol: row.volume_mn, val: row.value_cr })
      }
      return byMonth
    },
  })
}

// ---------- Statewise/district geography, all months ----------
export type GeoRow = { name: string; state: string; vol: number; val: number }

export function useStatewiseAll() {
  return useQuery({
    queryKey: ['statewise', 'all'],
    queryFn: async (): Promise<{
      byMonth: Record<string, GeoRow[]>
      granularityByMonth: Record<string, 'State' | 'District'>
    }> => {
      const data = await fetchGdriveJson<{
        state: string
        district: string
        month: string
        volume_share_pct: number
        value_share_pct: number
      }>('statewise')

      const byMonth: Record<string, GeoRow[]> = {}
      const isStateLevel: Record<string, boolean> = {}

      for (const row of data) {
        const list = (byMonth[row.month] ??= [])
        list.push({ name: row.district, state: row.state, vol: row.volume_share_pct, val: row.value_share_pct })
        if (!(row.month in isStateLevel)) {
          isStateLevel[row.month] = true
        }
        if (row.district.trim().toUpperCase() !== row.state.trim().toUpperCase()) {
          isStateLevel[row.month] = false
        }
      }
      const granularityByMonth = Object.fromEntries(
        Object.entries(isStateLevel).map(([m, isState]) => [m, isState ? 'State' : 'District']),
      ) as Record<string, 'State' | 'District'>
      return { byMonth, granularityByMonth }
    },
  })
}

// ---------- AutoPay: latest month registrations/executions ----------
export type AutoPayRegistrationRow = { psp: string; registrations_mn: number; approved_pct: number | null }
export type AutoPayExecutionRow = { bank: string; executions_mn: number; approved_pct: number | null; bd_pct: number | null; td_pct: number | null }

export function useAutoPayRegistrations() {
  return useQuery({
    queryKey: ['autopay_registrations', 'latest'],
    queryFn: async (): Promise<{ month: string; rows: AutoPayRegistrationRow[] }> => {
      const data = await fetchGdriveJson<{
        psp: string
        month: string
        registrations_mn: number
        approved_pct: number | null
      }>('autopay_registrations')

      const months = [...new Set(data.map((r) => r.month))].sort()
      const month = months[months.length - 1] ?? ''
      const rows = data
        .filter((r) => r.month === month)
        .sort((a, b) => b.registrations_mn - a.registrations_mn)
        .map(({ psp, registrations_mn, approved_pct }) => ({ psp, registrations_mn, approved_pct }))
      return { month, rows }
    },
  })
}

export function useAutoPayExecutions() {
  return useQuery({
    queryKey: ['autopay_executions', 'latest'],
    queryFn: async (): Promise<{ month: string; rows: AutoPayExecutionRow[] }> => {
      const data = await fetchGdriveJson<{
        bank: string
        month: string
        executions_mn: number
        approved_pct: number | null
        bd_pct: number | null
        td_pct: number | null
      }>('autopay_executions')

      const months = [...new Set(data.map((r) => r.month))].sort()
      const month = months[months.length - 1] ?? ''
      const rows = data
        .filter((r) => r.month === month)
        .sort((a, b) => b.executions_mn - a.executions_mn)
        .map(({ bank, executions_mn, approved_pct, bd_pct, td_pct }) => ({ bank, executions_mn, approved_pct, bd_pct, td_pct }))
      return { month, rows }
    },
  })
}

// ---------- AutoPay: registrations by bank and executions by PSP ----------
export type AutoPayRegistrationByBankRow = { remitter_bank: string; registrations_mn: number; approved_pct: number | null }
export type AutoPayExecutionByPspRow = { psp: string; executions_mn: number; approved_pct: number | null }

export function useAutoPayRegistrationsByBank() {
  return useQuery({
    queryKey: ['autopay_registrations_by_bank', 'latest'],
    queryFn: async (): Promise<{ month: string; rows: AutoPayRegistrationByBankRow[] }> => {
      const data = await fetchGdriveJson<{
        remitter_bank: string
        month: string
        registrations_mn: number
        approved_pct: number | null
      }>('autopay_registrations_by_bank')

      const months = [...new Set(data.map((r) => r.month))].sort()
      const month = months[months.length - 1] ?? ''
      const rows = data
        .filter((r) => r.month === month)
        .sort((a, b) => b.registrations_mn - a.registrations_mn)
        .map(({ remitter_bank, registrations_mn, approved_pct }) => ({ remitter_bank, registrations_mn, approved_pct }))
      return { month, rows }
    },
  })
}

export function useAutoPayExecutionsByPsp() {
  return useQuery({
    queryKey: ['autopay_executions_by_psp', 'latest'],
    queryFn: async (): Promise<{ month: string; rows: AutoPayExecutionByPspRow[] }> => {
      const data = await fetchGdriveJson<{
        psp: string
        month: string
        executions_mn: number
        approved_pct: number | null
      }>('autopay_executions_by_psp')

      const months = [...new Set(data.map((r) => r.month))].sort()
      const month = months[months.length - 1] ?? ''
      const rows = data
        .filter((r) => r.month === month)
        .sort((a, b) => b.executions_mn - a.executions_mn)
        .map(({ psp, executions_mn, approved_pct }) => ({ psp, executions_mn, approved_pct }))
      return { month, rows }
    },
  })
}

// ---------- PSP member performance ----------
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
    queryFn: async (): Promise<{ month: string; rows: PspPerformanceRow[] }> => {
      const data = await fetchGdriveJson<PspPerformanceRow & { month: string }>('psp_member_performance')

      const months = [...new Set(data.map((r) => r.month))].sort()
      const month = months[months.length - 1] ?? ''
      const rows = data
        .filter((r) => r.month === month)
        .sort((a, b) => b.volume_mn - a.volume_mn)
        .map(({ entity_name, direction, volume_mn, approved_pct, bd_pct, td_pct }) => ({
          entity_name,
          direction,
          volume_mn,
          approved_pct,
          bd_pct,
          td_pct,
        }))
      return { month, rows }
    },
  })
}

// ---------- RBI Cards, all months ----------
export type RbiCardsRow = {
  month: string
  atms_onsite: number
  atms_offsite: number
  pos_terminals: number
  micro_atms: number
  credit_cards_outstanding: number
  debit_cards_outstanding: number
  credit_pos_volume: number
  credit_pos_value: number
  credit_online_volume: number
  credit_online_value: number
  credit_others_volume: number
  credit_others_value: number
  credit_atm_withdrawal_volume: number
  credit_atm_withdrawal_value: number
  debit_pos_volume: number
  debit_pos_value: number
  debit_online_volume: number
  debit_online_value: number
  debit_others_volume: number
  debit_others_value: number
  debit_atm_withdrawal_volume: number
  debit_atm_withdrawal_value: number
  debit_pos_withdrawal_volume: number
  debit_pos_withdrawal_value: number
}

export function useRbiCardsAll() {
  return useQuery({
    queryKey: ['rbi_cards', 'all'],
    queryFn: async (): Promise<RbiCardsRow[]> => {
      const data = await fetchGdriveJson<RbiCardsRow>('rbi_cards')
      return data.sort((a, b) => a.month.localeCompare(b.month))
    },
  })
}

// ---------- RBI Payments, all months, all columns ----------
export function useRbiPaymentsAll() {
  return useQuery({
    queryKey: ['rbi_payments', 'all'],
    queryFn: async (): Promise<Record<string, number | string>[]> => {
      const data = await fetchGdriveJson<Record<string, number | string>>('rbi_payments')
      return data.sort((a, b) => String(a.month).localeCompare(String(b.month)))
    },
  })
}

// ---------- Circulars ----------
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
      const data = await fetchGdriveJson<CircularRow>('circulars')
      return [...data].sort((a, b) => {
        const fyEnd = (fy: string) => Number(fy?.split('-').pop()) || 0
        const refNum = (ref: string) => Number(ref?.match(/\d+/)?.[0]) || 0
        return fyEnd(b.fy) - fyEnd(a.fy) || refNum(b.ref) - refNum(a.ref)
      })
    },
  })
}
