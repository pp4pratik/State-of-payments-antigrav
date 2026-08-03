import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMonth } from '../lib/format'
import type { MonthlyTrendRow } from '../lib/queries'

export function TrendChart({ rows }: { rows: MonthlyTrendRow[] }) {
  const data = rows.map((r) => ({ ...r, label: formatMonth(r.month) }))

  return (
    <div className="h-72 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--marigold)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--marigold)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value ?? 0).toFixed(1)}M`, 'Volume']}
          />
          <Area
            type="monotone"
            dataKey="total_volume_mn"
            stroke="var(--marigold)"
            strokeWidth={2}
            fill="url(#volumeFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
