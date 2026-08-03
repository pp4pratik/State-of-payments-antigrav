import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { useMonthlyTrend } from '../lib/queries'
import { NotConnected } from '../components/NotConnected'
import { StatCard } from '../components/StatCard'
import { TrendChart } from '../components/TrendChart'
import { formatValueCr, formatVolume, pctChange } from '../lib/format'

export const Route = createFileRoute('/')({
  component: Overview,
})

function Overview() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
          This month
        </h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          Monthly UPI, card, and RBI payment-system trends, sourced from NPCI and RBI's published
          statistics via Airtable.
        </p>
      </div>
      {isSupabaseConfigured ? <OverviewContent /> : <NotConnected table="monthly_trend" />}
    </div>
  )
}

function OverviewContent() {
  const { data, isPending, error } = useMonthlyTrend()

  if (isPending) return <p className="text-[var(--text-secondary)]">Loading…</p>
  if (error) return <p className="text-[#f4715c]">Failed to load: {error.message}</p>
  if (!data.length) return <NotConnected table="monthly_trend" />

  const latest = data[data.length - 1]
  const previous = data[data.length - 2]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total volume"
          value={formatVolume(latest.total_volume_mn)}
          delta={previous ? pctChange(latest.total_volume_mn, previous.total_volume_mn) : null}
        />
        <StatCard
          label="Total value"
          value={formatValueCr(latest.total_value_cr)}
          delta={previous ? pctChange(latest.total_value_cr, previous.total_value_cr) : null}
        />
      </div>
      <TrendChart rows={data} />
    </div>
  )
}
