import { Bar } from 'react-chartjs-2'
import { TrendingUp } from 'lucide-react'
import { useAutoPayExecutions, useAutoPayRegistrations } from '../lib/queries'
import { SectionHead } from './SectionHead'
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
  const registrations = useAutoPayRegistrations()
  const executions = useAutoPayExecutions()

  if (registrations.isPending || executions.isPending) return <p className="section-note">Loading…</p>
  const err = registrations.error || executions.error
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
  const approvalRate = weightedExec('approved_pct')
  const bdRate = weightedExec('bd_pct')
  const tdRate = weightedExec('td_pct')

  // Total Volume = every attempt NPCI logged; Final Volume = the subset that actually
  // went through (Total Volume x Approved %). Approved % can be null for months
  // fetched before this field was captured - final volume falls back to null (shows
  // as a gap in the chart / blank in the CSV) rather than silently pretending 0.
  const finalCr = (volumeMn: number, approvedPct: number | null) =>
    approvedPct == null ? null : mnToCr((volumeMn * approvedPct) / 100)!

  const regLabels = registrations.data.rows.map((r) => r.psp)
  const regTotalData = registrations.data.rows.map((r) => mnToCr(r.registrations_mn)!)
  const regFinalData = registrations.data.rows.map((r) => finalCr(r.registrations_mn, r.approved_pct))
  const execFinalDataAll = executions.data.rows.map((r) => finalCr(r.executions_mn, r.approved_pct))
  const execLabels = executions.data.rows.slice(0, 10).map((r) => r.bank)
  const execTotalData = executions.data.rows.slice(0, 10).map((r) => mnToCr(r.executions_mn)!)
  const execFinalData = execFinalDataAll.slice(0, 10)

  // Same Total-vs-Final split as the bar charts, rolled up into one headline pair per
  // KPI tile - null (not 0) if any entity is missing Approved % that month, so an
  // incomplete sum never gets presented as a real approved total.
  const totalRegFinalCr = regFinalData.some((v) => v == null) ? null : regFinalData.reduce<number>((s, v) => s + (v ?? 0), 0)
  const regApprovalPct = totalRegFinalCr != null && totalRegCr ? (totalRegFinalCr / totalRegCr) * 100 : null
  const totalExecFinalCr = execFinalDataAll.some((v) => v == null) ? null : execFinalDataAll.reduce<number>((s, v) => s + (v ?? 0), 0)
  const execApprovalPct = totalExecFinalCr != null && totalExecCr ? (totalExecFinalCr / totalExecCr) * 100 : null

  return (
    <div>
      <div className="hero">
        <div className="hero-grid">
          <div>
            <p className="hero-label">{fullLabel(executions.data.month)} · mandate executions (top remitter banks)</p>
            <p className="hero-value">
              {totalExecCr.toFixed(0)}
              <span> Cr</span>
            </p>
            <p className="hero-sub">recurring debits processed across the top remitter banks</p>
            <div className="chips">
              <span className="chip up">
                <TrendingUp size={13} />~{totalRegCr.toFixed(1)} Cr new registrations, {fullLabel(registrations.data.month)}
              </span>
            </div>
          </div>
          <div>
            <svg className="pulse-svg" viewBox="0 0 400 90" preserveAspectRatio="none">
              <polyline
                points="0,75 60,72 100,68 140,58 180,50 220,42 260,35 300,28 340,20 400,10"
                fill="none"
                stroke="#3FC1A8"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="kpi-strip five">
        <div className="kpi">
          <p className="kpi-label">Registrations, {fullLabel(registrations.data.month)}</p>
          <p className="kpi-value">{crNum(totalRegCr)} Cr</p>
          <p className="kpi-sub">Total (attempts) · across {registrations.data.rows.length} payer PSPs</p>
          <div className="chips" style={{ marginTop: 8 }}>
            <span className="chip up">
              <TrendingUp size={13} />
              {totalRegFinalCr == null ? 'Final volume — not yet available' : `~${crNum(totalRegFinalCr)} Cr final (approved), ~${regApprovalPct!.toFixed(1)}%`}
            </span>
          </div>
        </div>
        <div className="kpi">
          <p className="kpi-label">Executions, {fullLabel(executions.data.month)}</p>
          <p className="kpi-value">{crNum(totalExecCr)} Cr</p>
          <p className="kpi-sub">Total (attempts) · across {executions.data.rows.length} remitter banks</p>
          <div className="chips" style={{ marginTop: 8 }}>
            <span className="chip up">
              <TrendingUp size={13} />
              {totalExecFinalCr == null ? 'Final volume — not yet available' : `~${crNum(totalExecFinalCr)} Cr final (approved), ~${execApprovalPct!.toFixed(1)}%`}
            </span>
          </div>
        </div>
        <div className="kpi">
          <p className="kpi-label">Weighted approval rate</p>
          <p className="kpi-value">{approvalRate == null ? '—' : `~${approvalRate.toFixed(1)}%`}</p>
          <p className="kpi-sub">of execution attempts</p>
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
        <SectionHead
          title="Registrations by PSP"
          note={`${fullLabel(registrations.data.month)} · Total Volume (attempts) vs Final Volume (approved)`}
          onCsv={() =>
            downloadCSV('upi-pulse-autopayReg.csv', [
              ['PSP', 'Total Volume (Cr)', 'Final Volume (Cr)', 'Approved %'],
              ...regLabels.map((l, i) => [l, regTotalData[i], regFinalData[i] ?? '', registrations.data.rows[i].approved_pct ?? '']),
            ])
          }
        />
        <div className="card">
          <div style={{ position: 'relative', height: 260 }}>
            <Bar
              data={{
                labels: regLabels,
                datasets: [
                  { label: 'Total Volume (Cr)', data: regTotalData, backgroundColor: 'rgba(63,193,168,0.35)', borderRadius: 4 },
                  { label: 'Final Volume (Cr)', data: regFinalData, backgroundColor: '#3FC1A8', borderRadius: 4 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Crore', font: { size: 11 } } } },
                plugins: {
                  legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                  tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw == null ? '—' : Number(c.raw).toFixed(2) + ' Cr'}` } },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="row-2">
          <div className="card">
            <div className="section-head">
              <p className="section-title">Execution volume by remitter bank</p>
              <div className="section-actions">
                <p className="section-note">{fullLabel(executions.data.month)} · Total vs Final (approved)</p>
                <CsvButton
                  label="CSV"
                  onClick={() =>
                    downloadCSV('upi-pulse-autopayExec.csv', [
                      ['Bank', 'Total Volume (Cr)', 'Final Volume (Cr)', 'Approved %'],
                      ...execLabels.map((l, i) => [l, execTotalData[i], execFinalData[i] ?? '', executions.data.rows[i].approved_pct ?? '']),
                    ])
                  }
                />
              </div>
            </div>
            <div style={{ position: 'relative', height: 240 }}>
              <Bar
                data={{
                  labels: execLabels,
                  datasets: [
                    { label: 'Total Volume (Cr)', data: execTotalData, backgroundColor: 'rgba(245,165,36,0.35)', borderRadius: 4 },
                    { label: 'Final Volume (Cr)', data: execFinalData, backgroundColor: '#F5A524', borderRadius: 4 },
                  ],
                }}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { x: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Crore', font: { size: 11 } } }, y: { grid: { display: false } } },
                  plugins: {
                    legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw == null ? '—' : Number(c.raw).toFixed(2) + ' Cr'}` } },
                  },
                }}
              />
            </div>
          </div>
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
      </div>

      <Footer
        sources={[{ href: 'https://www.npci.org.in/product/ecosystem-statistics/autopay', label: 'NPCI — AutoPay Ecosystem Statistics' }]}
        disclaimer="Pulled from NPCI's AutoPay Ecosystem Statistics via Airtable. Registrations and executions each show the latest month NPCI has published, which may differ by one month from each other. Total Volume is every attempt NPCI logged; Final Volume is the subset actually approved (Total Volume x Approved %). Approval/business-decline/technical-decline rates are volume-weighted averages across AutoPay's own remitter banks for the latest available execution month."
      />
    </div>
  )
}
