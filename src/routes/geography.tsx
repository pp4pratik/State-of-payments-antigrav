import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { useStatewise } from '../lib/queries'
import { NotConnected } from '../components/NotConnected'
import { RankedTable } from '../components/RankedTable'

export const Route = createFileRoute('/geography')({
  component: Geography,
})

function Geography() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Geography
        </h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          UPI transaction share by state or district, whichever granularity NPCI published for
          the latest month.
        </p>
      </div>
      {isSupabaseConfigured ? <GeographyContent /> : <NotConnected table="statewise" />}
    </div>
  )
}

function GeographyContent() {
  const { data, isPending, error } = useStatewise()

  if (isPending) return <p className="text-[var(--text-secondary)]">Loading…</p>
  if (error) return <p className="text-[#f4715c]">Failed to load: {error.message}</p>
  if (!data.length) return <NotConnected table="statewise" />

  return (
    <RankedTable
      rows={data}
      rowKey={(r) => `${r.state}-${r.district}`}
      columns={[
        {
          header: 'Location',
          render: (r) => (
            <div>
              <p>{r.district}</p>
              {r.district.toUpperCase() !== r.state.toUpperCase() && (
                <p className="text-xs text-[var(--text-muted)]">{r.state}</p>
              )}
            </div>
          ),
        },
        {
          header: 'Volume share',
          align: 'right',
          render: (r) => <span className="font-mono-label">{r.volume_share_pct.toFixed(2)}%</span>,
        },
        {
          header: 'Value share',
          align: 'right',
          render: (r) => (
            <span className="text-[var(--text-secondary)]">{r.value_share_pct.toFixed(2)}%</span>
          ),
        },
      ]}
    />
  )
}
