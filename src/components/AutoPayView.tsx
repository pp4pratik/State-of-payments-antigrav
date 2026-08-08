import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useAutoPayExecutions, useAutoPayExecutionsByPsp, useAutoPayRegistrations, useAutoPayRegistrationsByBank } from '../lib/queries'
import { Footer } from './Footer'
import { downloadCSV } from '../lib/csv'
import { CsvButton } from './CsvButton'
import { crNum, fullLabel, mnToCr } from '../lib/format'

const USE_CASES = [
  'Mobile & electricity bills',
  'EMI payments',
  'OTT subscriptions',
  'Insurance premiums',
  'Mutual fund SIPs',
  'FASTag & NCMC top-ups',
]

export function AutoPayView() {
  const [mode, setMode] = useState<'registration' | 'execution'>('registration')

  const registrations = useAutoPayRegistrations()
  const executions = useAutoPayExecutions()
  const registrationsByBank = useAutoPayRegistrationsByBank()
  const executionsByPsp = useAutoPayExecutionsByPsp()

  if (registrations.isPending || executions.isPending || registrationsByBank.isPending || executionsByPsp.isPending) {
    return <p className="section-note">Loading…</p>
  }
  const err = registrations.error || executions.error || registrationsByBank.error || executionsByPsp.error
  if (err) return <p className="section-note">Failed to load: {err.message}</p>

  const totalRegCr = registrations.data.rows.reduce((s, r) => s + r.registrations_mn, 0) / 10
  const totalExecCr = executions.data.rows.reduce((s, r) => s + r.executions_mn, 0) / 10

  // Approved/BD/TD % straight from AutoPay's own Executions table (bank-level, weighted
  // by that bank's execution volume) - replaces an earlier approximation borrowed from
  // the general UPI PSP Member Performance table, which wasn't AutoPay-specific at all.
  // Rows missing a given % (not yet backfilled for older months) are excluded from that
  // rate's average rather than treated as 0, so one gap doesn't drag the whole rate down.
  const weightedExec = (key: 'approved_pct' | 'bd_pct' | 'td_pct') => {
    const rows = executions.data.rows.filter((r) => r[key] != null)
    const vol = rows.reduce((s, r) => s + r.executions_mn, 0)
    if (!vol) return null
    return rows.reduce((s, r) => s + r.executions_mn * r[key]!, 0) / vol
  }
  const bdRate = weightedExec('bd_pct')
  const tdRate = weightedExec('td_pct')

  // Total Volume = every attempt NPCI logged; Final Volume = the subset that actually
  // went through (Total Volume x Approved %). Approved % can be null for months
  // fetched before this field was captured - final volume falls back to null (shows
  // as a gap in the chart / blank in the CSV) rather than silently pretending 0.
  const finalCr = (volumeMn: number, approvedPct: number | null) =>
    approvedPct == null ? null : mnToCr((volumeMn * approvedPct) / 100)!

  // "By PSP" and "by remitter bank" for Registrations, and the mirror pair for
  // Executions - NPCI's Ecosystem Statistics page has all 4 as separate tabs, so
  // these are 4 independently-fetched tables, not one dataset sliced two ways.
  // PSP counts are small (~13-19) so every PSP gets a bar; remitter bank counts run
  // up to 50, so those charts cap at the top 10 like Geography's district table does.
  const regByPspLabels = registrations.data.rows.map((r) => r.psp)
  const regByPspTotal = registrations.data.rows.map((r) => mnToCr(r.registrations_mn)!)
  const regByPspFinal = registrations.data.rows.map((r) => finalCr(r.registrations_mn, r.approved_pct))

  const regByBankLabels = registrationsByBank.data.rows.slice(0, 10).map((r) => r.remitter_bank)
  const regByBankTotal = registrationsByBank.data.rows.slice(0, 10).map((r) => mnToCr(r.registrations_mn)!)
  const regByBankFinal = registrationsByBank.data.rows.slice(0, 10).map((r) => finalCr(r.registrations_mn, r.approved_pct))

  const execByBankLabels = executions.data.rows.slice(0, 10).map((r) => r.bank)
  const execByBankTotal = executions.data.rows.slice(0, 10).map((r) => mnToCr(r.executions_mn)!)
  const execByBankFinal = executions.data.rows.slice(0, 10).map((r) => finalCr(r.executions_mn, r.approved_pct))

  const execByPspLabels = executionsByPsp.data.rows.map((r) => r.psp)
  const execByPspTotal = executionsByPsp.data.rows.map((r) => mnToCr(r.executions_mn)!)
  const execByPspFinal = executionsByPsp.data.rows.map((r) => finalCr(r.executions_mn, r.approved_pct))

  // Same Total-vs-Final split as the bar charts, rolled up into one headline pair per
  // KPI tile - null (not 0) if any entity is missing Approved % that month, so an
  // incomplete sum never gets presented as a real approved total. KPI tiles use the
  // by-PSP tables' full totals (not the by-bank tables), matching what the hero
  // figures always represented before this breakdown existed.
  const totalRegFinalCr = regByPspFinal.some((v) => v == null) ? null : regByPspFinal.reduce<number>((s, v) => s + (v ?? 0), 0)
  const regApprovalPct = totalRegFinalCr != null && totalRegCr ? (totalRegFinalCr / totalRegCr) * 100 : null
  const execByBankFinalAll = executions.data.rows.map((r) => finalCr(r.executions_mn, r.approved_pct))
  const totalExecFinalCr = execByBankFinalAll.some((v) => v == null) ? null : execByBankFinalAll.reduce<number>((s, v) => s + (v ?? 0), 0)
  const execApprovalPct = totalExecFinalCr != null && totalExecCr ? (totalExecFinalCr / totalExecCr) * 100 : null

  const isReg = mode === 'registration'
  const modeLabel = isReg ? 'Registrations' : 'Executions'
  const modeMonth = fullLabel(isReg ? registrations.data.month : executions.data.month)
  const modeColor = isReg ? '#3FC1A8' : '#F5A524'
  const modeColorFaint = isReg ? 'rgba(63,193,168,0.35)' : 'rgba(245,165,36,0.35)'
  const modeUnit = isReg ? 'Registrations' : 'Executions'
  const pspLabels = isReg ? regByPspLabels : execByPspLabels
  const pspTotal = isReg ? regByPspTotal : execByPspTotal
  const pspFinal = isReg ? regByPspFinal : execByPspFinal
  const pspApprovedPcts = (isReg ? registrations.data.rows : executionsByPsp.data.rows).map((r) => r.approved_pct)
  const bankLabels = isReg ? regByBankLabels : execByBankLabels
  const bankTotal = isReg ? regByBankTotal : execByBankTotal
  const bankFinal = isReg ? regByBankFinal : execByBankFinal
  const bankApprovedPcts = (isReg ? registrationsByBank.data.rows.slice(0, 10) : executions.data.rows.slice(0, 10)).map((r) => r.approved_pct)

  const barOptions = (horizontal: boolean) => ({
    indexAxis: horizontal ? ('y' as const) : ('x' as const),
    responsive: true,
    maintainAspectRatio: false,
    scales: horizontal
      ? { x: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Crore', font: { size: 11 } } }, y: { grid: { display: false } } }
      : { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Crore', font: { size: 11 } } } },
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { callbacks: { label: (c: { dataset: { label?: string }; raw: unknown }) => `${c.dataset.label}: ${c.raw == null ? '—' : Number(c.raw).toFixed(2) + ' Cr'}` } },
    },
  })

  return (
    <div>
      <div className="kpi-strip four">
        <div className="kpi">
          <p className="kpi-label">Registrations, {fullLabel(registrations.data.month)} · final (approved)</p>
          <p className="kpi-value" style={{ color: 'var(--green)' }}>
            {totalRegFinalCr == null ? '—' : `${crNum(totalRegFinalCr)} Cr`}
            {totalRegFinalCr != null && <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 6 }}>~{regApprovalPct!.toFixed(1)}%</span>}
          </p>
          <p className="kpi-sub">
            {totalRegFinalCr == null && 'Approval % not yet available · '}
            {crNum(totalRegCr)} Cr attempted (total) · across {registrations.data.rows.length} payer PSPs
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Executions, {fullLabel(executions.data.month)} · final (approved)</p>
          <p className="kpi-value" style={{ color: 'var(--green)' }}>
            {totalExecFinalCr == null ? '—' : `${crNum(totalExecFinalCr)} Cr`}
            {totalExecFinalCr != null && <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 6 }}>~{execApprovalPct!.toFixed(1)}%</span>}
          </p>
          <p className="kpi-sub">
            {totalExecFinalCr == null && 'Approval % not yet available · '}
            {crNum(totalExecCr)} Cr attempted (total) · across {executions.data.rows.length} remitter banks
          </p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Weighted business decline</p>
          <p className="kpi-value">{bdRate == null ? '—' : `~${bdRate.toFixed(1)}%`}</p>
          <p className="kpi-sub">insufficient balance & similar</p>
        </div>
        <div className="kpi">
          <p className="kpi-label">Weighted technical decline</p>
          <p className="kpi-value">{tdRate == null ? '—' : `~${tdRate.toFixed(1)}%`}</p>
          <p className="kpi-sub">bank/NPCI system issues</p>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <p className="section-title">{modeLabel}</p>
          <div className="section-actions">
            <p className="section-note">{modeMonth} · Total vs Final (approved)</p>
            <div className="toggle" role="tablist">
              <button className={`toggle-btn ${isReg ? 'active' : ''}`} role="tab" aria-selected={isReg} onClick={() => setMode('registration')}>
                Registration
              </button>
              <button className={`toggle-btn ${!isReg ? 'active' : ''}`} role="tab" aria-selected={!isReg} onClick={() => setMode('execution')}>
                Execution
              </button>
            </div>
          </div>
        </div>
        <div className="row-2">
          <div className="card">
            <div className="section-head">
              <p className="section-title">By PSP</p>
              <CsvButton
                label="CSV"
                onClick={() =>
                  downloadCSV(`upi-pulse-autopay-${mode}-by-psp.csv`, [
                    ['PSP', 'Total Volume (Cr)', 'Final Volume (Cr)', 'Approved %'],
                    ...pspLabels.map((l, i) => [l, pspTotal[i], pspFinal[i] ?? '', pspApprovedPcts[i] ?? '']),
                  ])
                }
              />
            </div>
            <div style={{ position: 'relative', height: 260 }}>
              <Bar
                data={{
                  labels: pspLabels,
                  datasets: [
                    { label: 'Total Volume (Cr)', data: pspTotal, backgroundColor: modeColorFaint, borderRadius: 4 },
                    { label: 'Final Volume (Cr)', data: pspFinal, backgroundColor: modeColor, borderRadius: 4 },
                  ],
                }}
                options={barOptions(false)}
              />
            </div>
          </div>
          <div className="card">
            <div className="section-head">
              <p className="section-title">By remitter bank</p>
              <CsvButton
                label="CSV"
                onClick={() =>
                  downloadCSV(`upi-pulse-autopay-${mode}-by-bank.csv`, [
                    ['Bank', 'Total Volume (Cr)', 'Final Volume (Cr)', 'Approved %'],
                    ...bankLabels.map((l, i) => [l, bankTotal[i], bankFinal[i] ?? '', bankApprovedPcts[i] ?? '']),
                  ])
                }
              />
            </div>
            <div style={{ position: 'relative', height: 260 }}>
              <Bar
                data={{
                  labels: bankLabels,
                  datasets: [
                    { label: 'Total Volume (Cr)', data: bankTotal, backgroundColor: modeColorFaint, borderRadius: 4 },
                    { label: 'Final Volume (Cr)', data: bankFinal, backgroundColor: modeColor, borderRadius: 4 },
                  ],
                }}
                options={barOptions(true)}
              />
            </div>
          </div>
        </div>
        <p className="section-note" style={{ marginTop: 10 }}>
          {modeUnit} by remitter bank shows the top 10 of {isReg ? registrationsByBank.data.rows.length : executions.data.rows.length} banks NPCI publishes.
        </p>
      </div>

      <div className="section">
        <div className="card">
          <div className="section-head">
            <p className="section-title">Common use cases</p>
            <p className="section-note">Qualitative — NPCI doesn't publish a category split</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {USE_CASES.map((u) => (
              <span key={u} className="tag">
                {u}
              </span>
            ))}
          </div>
          <p className="section-note" style={{ marginTop: 16 }}>
            NPCI raised the AFA limit for recurring credit card bill, mutual fund, and insurance payments from ₹15,000 to ₹1,00,000.
          </p>
        </div>
      </div>

      <Footer
        sources={[{ href: 'https://www.npci.org.in/product/ecosystem-statistics/autopay', label: 'NPCI — AutoPay Ecosystem Statistics' }]}
        disclaimer="Pulled from NPCI's AutoPay Ecosystem Statistics via Airtable, which publishes Registrations and Executions each broken down two ways - by payer PSP and by remitter bank. Registrations and executions each show the latest month NPCI has published, which may differ by one month from each other. Total Volume is every attempt NPCI logged; Final Volume is the subset actually approved (Total Volume x Approved %). Approval/business-decline/technical-decline rates in the KPI strip are volume-weighted averages across AutoPay's own remitter banks for the latest available execution month."
      />
    </div>
  )
}
