import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { useLatestAppStats } from '../lib/queries'
import { NotConnected } from '../components/NotConnected'
import { formatVolume } from '../lib/format'

export const Route = createFileRoute('/apps')({
  component: Apps,
})

function Apps() {
  return (
    <div className="space-y-6">
      <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
        App leaderboard
      </h2>
      {isSupabaseConfigured ? <Leaderboard /> : <NotConnected table="app_stats" />}
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
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
            <th className="px-6 py-3 font-medium">#</th>
            <th className="px-6 py-3 font-medium">App</th>
            <th className="px-6 py-3 text-right font-medium">Volume</th>
            <th className="px-6 py-3 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.app_name} className="border-b border-[var(--border)] last:border-0">
              <td className="px-6 py-3 text-[var(--text-muted)]">{i + 1}</td>
              <td className="px-6 py-3">{row.app_name}</td>
              <td className="px-6 py-3 text-right font-mono-label">
                {formatVolume(row.volume_mn)}
              </td>
              <td className="px-6 py-3 text-right text-[var(--text-secondary)]">
                {((row.volume_mn / total) * 100).toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
