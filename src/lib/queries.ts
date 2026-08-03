import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

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
      const { data: latest, error: latestErr } = await supabase
        .from('app_stats')
        .select('month')
        .order('month', { ascending: false })
        .limit(1)
        .single()
      if (latestErr) throw latestErr

      const { data, error } = await supabase
        .from('app_stats')
        .select('app_name, month, volume_mn, value_cr')
        .eq('month', latest.month)
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
