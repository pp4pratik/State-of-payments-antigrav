import { useMemo } from 'react'
import { useDashboard, type ViewKey } from '../lib/DashboardContext'

const VIEWS: { value: ViewKey; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'autopay', label: 'UPI AutoPay' },
  { value: 'rbi', label: 'RBI Cards' },
  { value: 'rbipayments', label: 'RBI Payments' },
  { value: 'circulars', label: 'Circulars' },
]

const VIEWS_WITHOUT_SELECTOR = new Set<ViewKey>(['autopay', 'circulars'])

export function Controls({ onDownloadAll }: { onDownloadAll: () => void }) {
  const { view, setView, metric, setMetric, months, selectedMonth, setSelectedMonth } = useDashboard()
  const showSelector = !VIEWS_WITHOUT_SELECTOR.has(view)

  const yearGroups = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const m of months) {
      const year = m.slice(0, 4)
      const list = groups.get(year) ?? []
      list.push(m)
      groups.set(year, list)
    }
    return groups
  }, [months])

  const years = [...yearGroups.keys()].sort()
  const selectedYear = selectedMonth?.slice(0, 4) ?? years[years.length - 1]
  const monthsInYear = yearGroups.get(selectedYear) ?? []

  return (
    <div className="controls-row">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select
          className="month-select"
          aria-label="Select view"
          value={view}
          onChange={(e) => setView(e.target.value as ViewKey)}
        >
          {VIEWS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>

        {showSelector && (
          <div className="toggle" role="tablist">
            <button
              className={`toggle-btn metric ${metric === 'volume' ? 'active' : ''}`}
              role="tab"
              aria-selected={metric === 'volume'}
              onClick={() => setMetric('volume')}
            >
              Volume
            </button>
            <button
              className={`toggle-btn metric ${metric === 'value' ? 'active' : ''}`}
              role="tab"
              aria-selected={metric === 'value'}
              onClick={() => setMetric('value')}
            >
              Value
            </button>
          </div>
        )}

        {showSelector && (
          <select
            className="month-select"
            aria-label="Select year"
            value={selectedYear}
            onChange={(e) => {
              const opts = yearGroups.get(e.target.value) ?? []
              const prevMonthName = selectedMonth?.slice(5, 7)
              const match = opts.find((m) => m.slice(5, 7) === prevMonthName)
              setSelectedMonth(match ?? opts[opts.length - 1])
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}

        {showSelector && (
          <select
            className="month-select"
            aria-label="Select month"
            value={selectedMonth ?? ''}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthsInYear.map((m) => (
              <option key={m} value={m}>
                {new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1).toLocaleDateString('en-US', {
                  month: 'long',
                })}
              </option>
            ))}
          </select>
        )}
      </div>
      <button className="btn-ghost" onClick={onDownloadAll}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
        </svg>
        Download all data (CSV)
      </button>
    </div>
  )
}
