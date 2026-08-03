import { downloadCSV } from '../lib/csv'
import { CsvButton } from './CsvButton'
import { lakhToCr } from '../lib/format'

export type FlatMetaEntry = [key: string, label: string, depth: 0 | 1 | 2, isGrandTotal?: boolean, formula?: string]

function labelStyle(depth: 0 | 1 | 2, isGrandTotal?: boolean): React.CSSProperties {
  if (isGrandTotal) return { fontWeight: 700 }
  if (depth === 0) return { fontWeight: 600, color: 'var(--text)' }
  if (depth === 1) return { paddingLeft: 18, fontWeight: 400, color: 'var(--text-secondary)' }
  return { paddingLeft: 36, fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }
}

export function RbiPaymentsFlatTable({
  meta,
  row,
  csvName,
}: {
  meta: FlatMetaEntry[]
  row: Record<string, number>
  csvName: string
}) {
  const rows = meta.map(([key, label, depth, isGrandTotal, formula]) => {
    const vol = lakhToCr(row[`${key}_volume`])
    const val = row[`${key}_value`] ?? null
    return { key, label, depth, isGrandTotal, formula, vol, val }
  })

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Volume (Cr)</th>
            <th>Value (₹ Cr)</th>
            <th>Avg ticket (₹)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ticket = r.val != null && r.vol ? r.val / r.vol : null
            return (
              <tr key={r.key} style={r.isGrandTotal ? { borderTop: '1px solid var(--border)' } : undefined}>
                <td className="name" style={labelStyle(r.depth, r.isGrandTotal)}>
                  {r.label}
                  {r.isGrandTotal && r.formula && (
                    <>
                      <br />
                      <span style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--text-muted)' }}>= {r.formula}</span>
                    </>
                  )}
                </td>
                <td>{r.vol == null ? '—' : r.vol.toLocaleString('en-IN', { maximumFractionDigits: 4 })}</td>
                <td>{r.val == null ? '—' : r.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td>{ticket != null && isFinite(ticket) ? `₹${ticket.toFixed(0)}` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 10 }}>
        <CsvButton
          label="CSV"
          onClick={() =>
            downloadCSV(csvName, [
              ['Category', 'Volume (Cr)', 'Value (Cr)', 'Avg ticket (Rs)'],
              ...rows.map((r) => {
                const ticket = r.val != null && r.vol ? r.val / r.vol : null
                return [r.label, r.vol ?? '', r.val ?? '', ticket != null && isFinite(ticket) ? ticket.toFixed(0) : '']
              }),
            ])
          }
        />
      </div>
    </div>
  )
}
