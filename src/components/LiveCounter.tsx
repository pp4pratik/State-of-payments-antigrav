import { useState } from 'react'
import { Play, Radio, Square } from 'lucide-react'
import { useLiveCounter } from '../lib/useLiveCounter'
import { liveCounterStartMs, markLiveCounterStarted, resetLiveCounter } from '../lib/sessionStart'

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
  // Initialized from the module-level timestamp (not null) so switching views away
  // and back resumes an already-started count instead of showing the button again.
  const [startedAt, setStartedAt] = useState<number | null>(liveCounterStartMs)
  const { count, elapsedSeconds } = useLiveCounter(perSecondRate, startedAt)

  if (startedAt === null) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Radio size={16} color="var(--text-muted)" />
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)' }}>See UPI payments tick up in real time, starting now</p>
        </div>
        <button
          onClick={() => setStartedAt(markLiveCounterStarted())}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: 'var(--marigold-dim)',
            color: 'var(--marigold)',
            border: '1px solid rgba(245,165,36,0.3)',
            borderRadius: 10,
            padding: '9px 16px',
            fontSize: 13.5,
            fontWeight: 500,
            fontFamily: "'Inter',sans-serif",
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <Play size={13} />
          Start live count
        </button>
      </div>
    )
  }

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Radio size={16} color="var(--teal)" />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)' }}>UPI payments since you started</p>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono',monospace" }}>
            {formatClock(elapsedSeconds)}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
        <button
          className="mini-btn"
          onClick={() => {
            resetLiveCounter()
            setStartedAt(null)
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Square size={11} />
          Stop
        </button>
      </div>
    </div>
  )
}
