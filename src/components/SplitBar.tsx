type Segment = { label: string; pct: number; color: string }

export function SplitBar({ segments, height = 7 }: { segments: Segment[]; height?: number }) {
  return (
    <div style={{ display: 'flex', width: '100%', height, borderRadius: height / 2, overflow: 'hidden', background: 'var(--surface2)' }}>
      {segments
        .filter((s) => s.pct > 0)
        .map((s) => (
          <div key={s.label} title={`${s.label}: ${s.pct}%`} style={{ width: `${s.pct}%`, background: s.color }} />
        ))}
    </div>
  )
}

// Two-way split (P2P/P2M, Debit/Credit, ...) shown as percentage labels above a slim
// segmented bar - larger share first, matching how the eye already reads it.
export function SplitBarPair({ title, a, b }: { title: string; a: Segment; b: Segment }) {
  const [first, second] = a.pct >= b.pct ? [a, b] : [b, a]
  return (
    <div>
      <p className="section-note" style={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11, margin: '0 0 10px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5 }}>
        <span style={{ color: first.color, fontWeight: 600 }}>
          {first.label} {first.pct}%
        </span>
        <span style={{ color: second.color, fontWeight: 600 }}>
          {second.label} {second.pct}%
        </span>
      </div>
      <SplitBar segments={[first, second]} />
    </div>
  )
}
