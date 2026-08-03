import { useState } from 'react'
import { useCirculars } from '../lib/queries'
import { Footer } from './Footer'
import { downloadCSV } from '../lib/csv'

export function CircularsView() {
  const circulars = useCirculars()
  const [search, setSearch] = useState('')

  if (circulars.isPending) return <p className="section-note">Loading…</p>
  if (circulars.error) return <p className="section-note">Failed to load: {circulars.error.message}</p>

  const filtered = circulars.data.filter((c) => {
    if (!search) return true
    const t = `${c.ref} ${c.title}`.toLowerCase()
    return t.includes(search.toLowerCase())
  })

  return (
    <div>
      <div className="section">
        <div className="section-head">
          <p className="section-title">Circulars &amp; notifications</p>
          <div className="section-actions">
            <p className="section-note">NPCI · UPI, newest first</p>
            <button
              className="mini-btn"
              onClick={() =>
                downloadCSV(
                  'upi-pulse-circulars.csv',
                  [['Reference', 'FY', 'Title', 'PDF URL'], ...circulars.data.map((c) => [c.ref, c.fy, c.title, c.pdf_url ?? ''])],
                )
              }
            >
              Download CSV
            </button>
          </div>
        </div>
        <div className="card">
          <input
            type="text"
            className="circular-search"
            placeholder="Search circulars by keyword or OC number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="circular-list">
            <table>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>FY</th>
                  <th>Title</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="name">
                      No matches.
                    </td>
                  </tr>
                )}
                {filtered.map((c) => (
                  <tr key={`${c.fy}-${c.ref}`}>
                    <td style={{ whiteSpace: 'nowrap' }}>{c.ref}</td>
                    <td>
                      <span className="fy-badge">FY {c.fy}</span>
                    </td>
                    <td className="name">{c.title}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {c.pdf_url ? (
                        <a href={c.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', textDecoration: 'none' }}>
                          View PDF
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-note" style={{ marginTop: 14 }}>
            Covers all circulars synced from the Airtable base ({circulars.data.length} total). Earlier/archived
            circulars are on{' '}
            <a href="https://www.npci.org.in/circulars/upi" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>
              NPCI's site
            </a>{' '}
            directly.
          </p>
        </div>
      </div>

      <Footer
        sources={[{ href: 'https://www.npci.org.in/circulars/upi', label: 'NPCI — UPI Circulars & Notifications' }]}
        disclaimer="Operating circulars and notifications issued by NPCI for UPI, synced via Airtable. This is a reference/document list, not numeric statistics — there's no month or metric to select, which is why the selector and Volume/Value toggle are hidden on this view."
      />
    </div>
  )
}
