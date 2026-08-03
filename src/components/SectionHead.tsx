import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { CsvButton } from './CsvButton'

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
          <button className="mini-btn" onClick={onRawToggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Raw data {rawOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        {onCsv && <CsvButton onClick={onCsv} label={csvLabel} />}
      </div>
    </div>
  )
}
