import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type ViewKey = 'upi' | 'autopay' | 'rbi' | 'rbipayments' | 'circulars'
export type Metric = 'volume' | 'value'

type DashboardState = {
  view: ViewKey
  setView: (v: ViewKey) => void
  metric: Metric
  setMetric: (m: Metric) => void
  months: string[] // ISO month strings, ascending - the Jan'25-Jun'26 selectable range
  selectedMonth: string | null
  setSelectedMonth: (m: string) => void
}

const DashboardCtx = createContext<DashboardState | null>(null)

export function DashboardProvider({ months, children }: { months: string[]; children: ReactNode }) {
  const [view, setView] = useState<ViewKey>('upi')
  const [metric, setMetric] = useState<Metric>('volume')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const effectiveMonth = selectedMonth ?? months[months.length - 1] ?? null

  const value = useMemo(
    () => ({
      view,
      setView,
      metric,
      setMetric,
      months,
      selectedMonth: effectiveMonth,
      setSelectedMonth,
    }),
    [view, metric, months, effectiveMonth],
  )

  return <DashboardCtx.Provider value={value}>{children}</DashboardCtx.Provider>
}

export function useDashboard() {
  const ctx = useContext(DashboardCtx)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
