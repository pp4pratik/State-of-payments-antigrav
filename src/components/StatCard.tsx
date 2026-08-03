export function StatCard({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: number | null
}) {
  const isDown = (delta ?? 0) < 0
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="font-serif-display mt-2 text-3xl">{value}</p>
      {delta != null && (
        <p
          className="mt-1 text-xs"
          style={{ color: isDown ? '#f4715c' : 'var(--teal)' }}
        >
          {isDown ? '▼' : '▲'} {Math.abs(delta).toFixed(2)}% vs prev month
        </p>
      )}
    </div>
  )
}
