import { Bar } from 'react-chartjs-2'
import { TrendingUp } from 'lucide-react'
import { useAutoPayExecutions, useAutoPayRegistrations, usePspMemberPerformance } from '../lib/queries'
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
  const perf = usePspMemberPerformance()

  if (registrations.isPending || executions.isPending || perf.isPending) return <p className="section-note">Loading…</p>
  const err = registrations.error || executions.error || perf.error
  if (err) return <p className="section-note">Failed to load: {err.message}</p>

  const totalRegCr = registrations.data.rows.reduce((s, r) => s + r.registrations_mn, 0) / 10
  const totalExecCr = executions.data.rows.reduce((s, r) => s + r.executions_mn, 0) / 10

  const weighted = (key: 'approved_pct' | 'bd_pct' | 'td_pct') => {
    const totalVol = perf.data.rows.reduce((s, r) => s + r.volume_mn, 0)
    if (!totalVol) return null
    return perf.data.rows.reduce((s, r) => s + r.volume_mn * r[key], 0) / totalVol
  }
  const approvalRate = weighted('approved_pct')
  const bdRate = weighted('bd_pct')
  const tdRate = weighted('td_pct')

  const regLabels = registrations.data.rows.map((r) => r.psp)
  const regData = registrations.data.rows.map((r) => mnToCr(r.registrations_mn)!)
  const execLabels = executions.data.rows.slice(0, 10).map((r) => r.bank)
  const execData = executions.data.rows.slice(0, 10).map((r) => mnToCr(r.executions_mn)!)

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

      <div className="kpi-strip four">
        <div className="kpi">
          <p className="kpi-label">Registrations, {fullLabel(registrations.data.month)}</p>
          <p className="kpi-value">{crNum(totalRegCr)} Cr</p>
          <p className="kpi-sub">across {registrations.data.rows.length} payer PSPs</p>
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
          note={fullLabel(registrations.data.month)}
          onCsv={() => downloadCSV('upi-pulse-autopayReg.csv', [['PSP', 'Registrations (Cr)'], ...regLabels.map((l, i) => [l, regData[i]])])}
        />
        <div className="card">
          <div style={{ position: 'relative', height: 260 }}>
            <Bar
              data={{ labels: regLabels, datasets: [{ label: 'Registrations (Cr)', data: regData, backgroundColor: '#3FC1A8', borderRadius: 4 }] }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Crore', font: { size: 11 } } } },
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${Number(c.raw).toFixed(2)} Cr` } } },
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
                <p className="section-note">{fullLabel(executions.data.month)}</p>
                <CsvButton
                  label="CSV"
                  onClick={() => downloadCSV('upi-pulse-autopayExec.csv', [['Bank', 'Executions (Cr)'], ...execLabels.map((l, i) => [l, execData[i]])])}
                />
              </div>
            </div>
            <div style={{ position: 'relative', height: 240 }}>
              <Bar
                data={{ labels: execLabels, datasets: [{ label: 'Executions (Cr)', data: execData, backgroundColor: '#F5A524', borderRadius: 4 }] }}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { x: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Crore', font: { size: 11 } } }, y: { grid: { display: false } } },
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${Number(c.raw).toFixed(2)} Cr` } } },
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
        disclaimer="Pulled from NPCI's AutoPay Ecosystem Statistics via Airtable. Registrations and executions each show the latest month NPCI has published, which may differ by one month from each other. Approval/decline rates are volume-weighted averages across PSP Member Performance entities for the latest available month."
      />
    </div>
  )
}
