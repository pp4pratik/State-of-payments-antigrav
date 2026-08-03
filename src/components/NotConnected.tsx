export function NotConnected({ table }: { table: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-[var(--text-secondary)]">
      <p className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
        Not connected
      </p>
      <p className="mt-2 text-sm">
        Set <code className="text-[var(--teal)]">VITE_SUPABASE_URL</code> and{' '}
        <code className="text-[var(--teal)]">VITE_SUPABASE_ANON_KEY</code> to load data from the{' '}
        <code className="text-[var(--teal)]">{table}</code> table.
      </p>
    </div>
  )
}
