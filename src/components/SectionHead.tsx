import type { ReactNode } from 'react'

export function SectionHead({
  title,
  note,
  onRawToggle,
  rawOpen,
  onCsv,
  csvLabel = 'Download CSV',
  children,
}: {
  title: ReactNode
  note?: ReactNode
  onRawToggle?: () => void
  rawOpen?: boolean
  onCsv?: () => void
  csvLabel?: string
  children?: ReactNode
}) {
  return (
    <div className="section-head">
      <p className="section-title">{title}</p>
      <div className="section-actions">
        {note && <p className="section-note">{note}</p>}
        {children}
        {onRawToggle && (
          <button className="mini-btn" onClick={onRawToggle}>
            Raw data {rawOpen ? '▴' : '▾'}
          </button>
        )}
        {onCsv && (
          <button className="mini-btn" onClick={onCsv}>
            {csvLabel}
          </button>
        )}
      </div>
    </div>
  )
}
