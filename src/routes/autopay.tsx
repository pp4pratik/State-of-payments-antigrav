import { createFileRoute } from '@tanstack/react-router'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAutoPayExecutions, useAutoPayRegistrations } from '../lib/queries'
import { NotConnected } from '../components/NotConnected'
import { RankedTable } from '../components/RankedTable'
import { formatVolume } from '../lib/format'

export const Route = createFileRoute('/autopay')({
  component: AutoPay,
})

function AutoPay() {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-mono-label text-xs uppercase tracking-wider text-[var(--text-muted)]">
          UPI AutoPay
        </h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          New e-mandate registrations by app, and recurring-payment executions by bank.
        </p>
      </div>
      {isSupabaseConfigured ? <AutoPayContent /> : <NotConnected table="autopay_registrations" />}
    </div>
  )
}

function AutoPayContent() {
  const registrations = useAutoPayRegistrations()
  const executions = useAutoPayExecutions()

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h3 className="text-sm text-[var(--text-secondary)]">Registrations by PSP</h3>
        {registrations.isPending && <p className="text-[var(--text-secondary)]">Loading…</p>}
        {registrations.error && (
          <p className="text-[#f4715c]">Failed to load: {registrations.error.message}</p>
        )}
        {registrations.data && (
          <RankedTable
            rows={registrations.data}
            rowKey={(r) => r.psp}
            columns={[
              { header: 'PSP', render: (r) => r.psp },
              {
                header: 'Registrations',
                align: 'right',
                render: (r) => (
                  <span className="font-mono-label">{formatVolume(r.registrations_mn)}</span>
                ),
              },
            ]}
          />
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm text-[var(--text-secondary)]">Executions by bank</h3>
        {executions.isPending && <p className="text-[var(--text-secondary)]">Loading…</p>}
        {executions.error && (
          <p className="text-[#f4715c]">Failed to load: {executions.error.message}</p>
        )}
        {executions.data && (
          <RankedTable
            rows={executions.data}
            rowKey={(r) => r.bank}
            columns={[
              { header: 'Bank', render: (r) => r.bank },
              {
                header: 'Executions',
                align: 'right',
                render: (r) => <span className="font-mono-label">{formatVolume(r.executions_mn)}</span>,
              },
            ]}
          />
        )}
      </section>
    </div>
  )
}
