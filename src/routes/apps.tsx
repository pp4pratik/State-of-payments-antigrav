import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { useLatestAppStats, usePspMemberPerformance } from '../lib/queries'
import type { PspPerformanceRow } from '../lib/queries'
import { NotConnected } from '../components/NotConnected'
import { RankedTable } from '../components/RankedTable'
import { formatVolume } from '../lib/format'

export const Route = createFileRoute('/apps')({
  component: Apps,
})

function Apps() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
          App leaderboard
        </h2>
        {isSupabaseConfigured ? <Leaderboard /> : <NotConnected table="app_stats" />}
      </section>

      <section className="space-y-4">
        <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
          PSP member performance
        </h2>
        {isSupabaseConfigured ? (
          <PspPerformance />
        ) : (
          <NotConnected table="psp_member_performance" />
        )}
      </section>
    </div>
  )
}

function Leaderboard() {
  const { data, isPending, error } = useLatestAppStats()

  if (isPending) return <p className="text-[var(--text-secondary)]">Loading…</p>
  if (error) return <p className="text-[#f4715c]">Failed to load: {error.message}</p>
  if (!data.length) return <NotConnected table="app_stats" />

  const total = data.reduce((sum, r) => sum + r.volume_mn, 0)

  return (
    <RankedTable
      rows={data}
      rowKey={(r) => r.app_name}
      columns={[
        { header: 'App', render: (r) => r.app_name },
        {
          header: 'Volume',
          align: 'right',
          render: (r) => <span className="font-mono-label">{formatVolume(r.volume_mn)}</span>,
        },
        {
          header: 'Share',
          align: 'right',
          render: (r) => (
            <span className="text-[var(--text-secondary)]">
              {((r.volume_mn / total) * 100).toFixed(2)}%
            </span>
          ),
        },
      ]}
    />
  )
}

function PspPerformance() {
  const { data, isPending, error } = usePspMemberPerformance()

  if (isPending) return <p className="text-[var(--text-secondary)]">Loading…</p>
  if (error) return <p className="text-[#f4715c]">Failed to load: {error.message}</p>
  if (!data.length) return <NotConnected table="psp_member_performance" />

  const byDirection = new Map<string, PspPerformanceRow[]>()
  for (const row of data) {
    const group = byDirection.get(row.direction) ?? []
    group.push(row)
    byDirection.set(row.direction, group)
  }

  return (
    <div className="space-y-8">
      {[...byDirection.entries()].map(([direction, rows]) => (
        <div key={direction} className="space-y-3">
          <h3 className="text-sm text-[var(--text-secondary)]">{direction}</h3>
          <RankedTable
            rows={rows}
            rowKey={(r) => r.entity_name}
            columns={[
              { header: 'Entity', render: (r) => r.entity_name },
              {
                header: 'Volume',
                align: 'right',
                render: (r) => <span className="font-mono-label">{formatVolume(r.volume_mn)}</span>,
              },
              {
                header: 'Approved',
                align: 'right',
                render: (r) => <span className="text-[var(--teal)]">{r.approved_pct.toFixed(1)}%</span>,
              },
              {
                header: 'Bank declined',
                align: 'right',
                render: (r) => (
                  <span className="text-[var(--text-secondary)]">{r.bd_pct.toFixed(1)}%</span>
                ),
              },
              {
                header: 'Tech declined',
                align: 'right',
                render: (r) => (
                  <span className="text-[#f4715c]">{r.td_pct.toFixed(1)}%</span>
                ),
              },
            ]}
          />
        </div>
      ))}
    </div>
  )
}
