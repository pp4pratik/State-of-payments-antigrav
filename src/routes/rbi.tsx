import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { useRbiCards, useRbiPayments } from '../lib/queries'
import type { RbiCardsRow } from '../lib/queries'
import { NotConnected } from '../components/NotConnected'
import { StatCard } from '../components/StatCard'
import { RankedTable } from '../components/RankedTable'
import { formatCount, formatValueCr, formatVolume } from '../lib/format'

export const Route = createFileRoute('/rbi')({
  component: Rbi,
})

function Rbi() {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
          RBI
        </h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          Card and ATM/PoS infrastructure, plus headline Payment System Indicators from RBI's
          monthly release - a broader lens than UPI alone.
        </p>
      </div>
      {isSupabaseConfigured ? <RbiContent /> : <NotConnected table="rbi_cards" />}
    </div>
  )
}

function RbiContent() {
  const cards = useRbiCards()
  const payments = useRbiPayments()

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h3 className="text-sm text-[var(--text-secondary)]">Infrastructure</h3>
        {cards.isPending && <p className="text-[var(--text-secondary)]">Loading…</p>}
        {cards.error && <p className="text-[#f4715c]">Failed to load: {cards.error.message}</p>}
        {cards.data && <Infrastructure data={cards.data} />}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm text-[var(--text-secondary)]">Cards outstanding</h3>
        {cards.data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Credit cards" value={formatVolume(cards.data.credit_cards_outstanding / 1e6)} />
            <StatCard label="Debit cards" value={formatVolume(cards.data.debit_cards_outstanding / 1e6)} />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm text-[var(--text-secondary)]">Card spend by channel</h3>
        {cards.data && <ChannelBreakdown data={cards.data} />}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm text-[var(--text-secondary)]">Payment System Indicators</h3>
        {payments.isPending && <p className="text-[var(--text-secondary)]">Loading…</p>}
        {payments.error && (
          <p className="text-[#f4715c]">Failed to load: {payments.error.message}</p>
        )}
        {payments.data && (
          <RankedTable
            rows={payments.data}
            rowKey={(r) => r.key}
            showRank={false}
            columns={[
              { header: 'System', render: (r) => r.label },
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

function Infrastructure({ data }: { data: RbiCardsRow }) {
  const tiles = [
    { label: 'ATMs', value: data.atms_onsite + data.atms_offsite },
    { label: 'PoS terminals', value: data.pos_terminals },
    { label: 'Micro ATMs', value: data.micro_atms },
    { label: 'Bharat QR', value: data.bharat_qr_codes },
    { label: 'UPI QR', value: data.upi_qr_codes },
  ]
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <StatCard key={t.label} label={t.label} value={formatCount(t.value)} />
      ))}
    </div>
  )
}

function ChannelBreakdown({ data }: { data: RbiCardsRow }) {
  const rows = [
    {
      channel: 'PoS',
      creditVol: data.credit_pos_volume,
      creditVal: data.credit_pos_value,
      debitVol: data.debit_pos_volume,
      debitVal: data.debit_pos_value,
    },
    {
      channel: 'Online',
      creditVol: data.credit_online_volume,
      creditVal: data.credit_online_value,
      debitVol: data.debit_online_volume,
      debitVal: data.debit_online_value,
    },
    {
      channel: 'ATM withdrawal',
      creditVol: data.credit_atm_withdrawal_volume,
      creditVal: data.credit_atm_withdrawal_value,
      debitVol: data.debit_atm_withdrawal_volume,
      debitVal: data.debit_atm_withdrawal_value,
    },
  ]

  return (
    <RankedTable
      rows={rows}
      rowKey={(r) => r.channel}
      showRank={false}
      columns={[
        { header: 'Channel', render: (r) => r.channel },
        {
          header: 'Credit volume',
          align: 'right',
          render: (r) => <span className="font-mono-label">{formatVolume(r.creditVol / 1e6)}</span>,
        },
        {
          header: 'Credit value',
          align: 'right',
          render: (r) => (
            <span className="text-[var(--text-secondary)]">{formatValueCr(r.creditVal / 1e4)}</span>
          ),
        },
        {
          header: 'Debit volume',
          align: 'right',
          render: (r) => <span className="font-mono-label">{formatVolume(r.debitVol / 1e6)}</span>,
        },
        {
          header: 'Debit value',
          align: 'right',
          render: (r) => (
            <span className="text-[var(--text-secondary)]">{formatValueCr(r.debitVal / 1e4)}</span>
          ),
        },
      ]}
    />
  )
}
