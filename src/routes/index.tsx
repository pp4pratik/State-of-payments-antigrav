import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { NotConnected } from '../components/NotConnected'

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
      {isSupabaseConfigured ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {/* TODO: wire up monthly trend query once schema.sql has been run */}
          Supabase is configured — trend chart goes here.
        </div>
      ) : (
        <NotConnected table="monthly_trend" />
      )}
    </div>
  )
}
