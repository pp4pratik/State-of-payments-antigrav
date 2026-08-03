import { ExternalLink } from 'lucide-react'

export function Footer({
  sources,
  disclaimer,
}: {
  sources: { href: string; label: string }[]
  disclaimer: string
}) {
  return (
    <div className="footer">
      <p className="footer-title">Source</p>
      <div className="sources">
        {sources.map((s) => (
          <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {s.label}
            <ExternalLink size={12} />
          </a>
        ))}
      </div>
      <p className="disclaimer">{disclaimer}</p>
    </div>
  )
}
