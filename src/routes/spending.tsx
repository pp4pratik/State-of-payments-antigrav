import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { useMerchantCategories, useP2pSplit } from '../lib/queries'
import { NotConnected } from '../components/NotConnected'
import { RankedTable } from '../components/RankedTable'
import { formatValueCr, formatVolume } from '../lib/format'

export const Route = createFileRoute('/spending')({
  component: Spending,
})

function Spending() {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Spending
        </h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          How UPI spend splits between person-to-person transfers and merchant payments, and
          which merchant categories drive the most volume.
        </p>
      </div>
      {isSupabaseConfigured ? <SpendingContent /> : <NotConnected table="p2p_p2m" />}
    </div>
  )
}

function SpendingContent() {
  const split = useP2pSplit()
  const categories = useMerchantCategories()

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h3 className="text-sm text-[var(--text-secondary)]">P2P vs P2M split</h3>
        {split.isPending && <p className="text-[var(--text-secondary)]">Loading…</p>}
        {split.error && <p className="text-[#f4715c]">Failed to load: {split.error.message}</p>}
        {split.data && <P2pSplitBar data={split.data} />}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm text-[var(--text-secondary)]">Top merchant categories</h3>
        {categories.isPending && <p className="text-[var(--text-secondary)]">Loading…</p>}
        {categories.error && (
          <p className="text-[#f4715c]">Failed to load: {categories.error.message}</p>
        )}
        {categories.data && (
          <RankedTable
            rows={categories.data}
            rowKey={(r) => r.description}
            columns={[
              {
                header: 'Category',
                render: (r) => (
                  <div>
                    <p>{r.description}</p>
                    {r.type && <p className="text-xs text-[var(--text-muted)]">{r.type}</p>}
                  </div>
                ),
              },
              {
                header: 'Volume',
                align: 'right',
                render: (r) => <span className="font-mono-label">{formatVolume(r.volume_mn)}</span>,
              },
              {
                header: 'Value',
                align: 'right',
                render: (r) => (
                  <span className="text-[var(--text-secondary)]">{formatValueCr(r.value_cr)}</span>
                ),
              },
            ]}
          />
        )}
      </section>
    </div>
  )
}

function P2pSplitBar({
  data,
}: {
  data: { p2p_volume_mn: number; p2m_volume_mn: number; p2p_value_cr: number; p2m_value_cr: number }
}) {
  const totalVol = data.p2p_volume_mn + data.p2m_volume_mn
  const p2pPct = (data.p2p_volume_mn / totalVol) * 100

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex h-3 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full bg-[var(--marigold)]" style={{ width: `${p2pPct}%` }} />
        <div className="h-full bg-[var(--teal)]" style={{ width: `${100 - p2pPct}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono-label text-xs text-[var(--marigold)]">
            P2P &middot; {p2pPct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xl">{formatVolume(data.p2p_volume_mn)}</p>
          <p className="text-xs text-[var(--text-secondary)]">{formatValueCr(data.p2p_value_cr)}</p>
        </div>
        <div>
          <p className="font-mono-label text-xs text-[var(--teal)]">
            P2M &middot; {(100 - p2pPct).toFixed(1)}%
          </p>
          <p className="mt-1 text-xl">{formatVolume(data.p2m_volume_mn)}</p>
          <p className="text-xs text-[var(--text-secondary)]">{formatValueCr(data.p2m_value_cr)}</p>
        </div>
      </div>
    </div>
  )
}
