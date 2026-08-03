import { Download } from 'lucide-react'

export function CsvButton({ onClick, label = 'Download CSV' }: { onClick: () => void; label?: string }) {
  return (
    <button className="mini-btn" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Download size={12} />
      {label}
    </button>
  )
}
