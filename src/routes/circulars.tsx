import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
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
      {isSupabaseConfigured ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {/* TODO: wire up circulars query once schema.sql has been run */}
          Supabase is configured — circulars list goes here.
        </div>
      ) : (
        <NotConnected table="circulars" />
      )}
    </div>
  )
}
