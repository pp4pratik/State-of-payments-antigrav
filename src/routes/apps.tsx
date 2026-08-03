import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { NotConnected } from '../components/NotConnected'

export const Route = createFileRoute('/apps')({
  component: Apps,
})

function Apps() {
  return (
    <div className="space-y-6">
      <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
        App leaderboard
      </h2>
      {isSupabaseConfigured ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          {/* TODO: wire up app_stats query once schema.sql has been run */}
          Supabase is configured — leaderboard table goes here.
        </div>
      ) : (
        <NotConnected table="app_stats" />
      )}
    </div>
  )
}
