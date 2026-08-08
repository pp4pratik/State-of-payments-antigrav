import { Radio } from 'lucide-react'
import { useLiveCounter } from '../lib/useLiveCounter'

function formatClock(totalSeconds: number): string {
  const s = Math.floor(totalSeconds)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

// Isolated into its own component so its 10x/sec re-render doesn't cascade into
// the much heavier UpiView tree above it - only this small card re-renders.
export function LiveCounter({ perSecondRate }: { perSecondRate: number }) {
  const { count, elapsedSeconds } = useLiveCounter(perSecondRate)

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span className="eyebrow" style={{ margin: 0 }}>
          <span className="dot" />
          <Radio size={12} />
          LIVE
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)' }}>UPI payments since you arrived</p>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono',monospace" }}>
            {formatClock(elapsedSeconds)} elapsed · estimated from NPCI's latest published monthly average, not a live feed
          </p>
        </div>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "'Space Grotesk',sans-serif",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--teal)',
          whiteSpace: 'nowrap',
        }}
      >
        {Math.floor(count).toLocaleString('en-IN')}
      </p>
    </div>
  )
}
