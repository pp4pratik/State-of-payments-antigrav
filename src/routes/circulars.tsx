import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { useCirculars } from '../lib/queries'
import { NotConnected } from '../components/NotConnected'

export const Route = createFileRoute('/circulars')({
  component: Circulars,
})

function Circulars() {
  return (
    <div className="space-y-6">
      <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
        NPCI circulars
      </h2>
      {isSupabaseConfigured ? <CircularsList /> : <NotConnected table="circulars" />}
    </div>
  )
}

function CircularsList() {
  const { data, isPending, error } = useCirculars()

  if (isPending) return <p className="text-[var(--text-secondary)]">Loading…</p>
  if (error) return <p className="text-[#f4715c]">Failed to load: {error.message}</p>
  if (!data.length) return <NotConnected table="circulars" />

  return (
    <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      {data.map((c) => (
        <li key={`${c.fy}-${c.ref}`} className="flex items-start justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-mono-label text-xs text-[var(--text-muted)]">
              {c.ref} &middot; FY {c.fy}
            </p>
            <p className="mt-1 text-sm">{c.title}</p>
          </div>
          {c.pdf_url && (
            <a
              href={c.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-sm text-[var(--teal)] hover:underline"
            >
              PDF ↗
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
