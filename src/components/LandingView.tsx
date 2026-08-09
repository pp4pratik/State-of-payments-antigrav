import { useState } from 'react'
import { ArrowRight, Moon, Play, Sun } from 'lucide-react'
import { useMonthlyTrend } from '../lib/queries'
import { useLiveCounter } from '../lib/useLiveCounter'
import { crNum } from '../lib/format'
import '../landing.css'

const TICKER_ITEMS = ['UPI', 'AUTOPAY', 'RTGS', 'NEFT', 'IMPS', 'RBI CARDS', 'CIRCULARS', 'GEOGRAPHY']

function secondsInMonth(monthIso: string): number {
  const [y, m] = monthIso.split('-').map(Number)
  return new Date(y, m, 0).getDate() * 86400
}

export function LandingView({ onEnter }: { onEnter: () => void }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [startedAt] = useState(() => Date.now())
  const trend = useMonthlyTrend()

  const latest = trend.data && trend.data.length > 0 ? trend.data[trend.data.length - 1] : null
  const secs = latest ? secondsInMonth(latest.month) : 0
  const volRate = latest ? (latest.total_volume_mn * 1_000_000) / secs : 0
  const valRateCr = latest ? latest.total_value_cr / secs : 0

  const vol = useLiveCounter(volRate, startedAt)
  const val = useLiveCounter(valRateCr, startedAt)

  return (
    <div className="landing" data-theme={theme}>
      <nav className="landing-nav">
        <span className="landing-wordmark">
          <span className="dot" />
          PAYMENTS PULSE
        </span>
        <div className="landing-nav-actions">
          <button
            type="button"
            className="landing-icon-btn"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button type="button" className="landing-btn" onClick={onEnter}>
            Enter dashboard
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="landing-eyebrow">
            <span className="dot" />
            Live · straight from NPCI &amp; RBI
          </p>
          <h1 className="landing-h1">
            Every rupee,
            <span className="accent">tracked live.</span>
          </h1>
          <p className="landing-sub">
            UPI, AutoPay, RTGS, NEFT, IMPS — <strong>the rails moving India's money</strong>, pulled straight from
            NPCI and RBI's own published numbers. No paywall, no spin, updated every month.
          </p>
          <div className="landing-cta-row">
            <button type="button" className="landing-btn" onClick={onEnter}>
              <Play size={13} />
              Enter the dashboard
            </button>
            <a href="#landing-stats" className="landing-btn ghost">
              See today's numbers
              <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
            </a>
          </div>
          <p className="landing-hint">
            Prefer to jump straight in? <button type="button" onClick={onEnter}>Skip to the data →</button>
          </p>
        </div>
      </header>

      <div className="landing-ticker" aria-hidden="true">
        <div className="landing-ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span className="landing-ticker-item" key={`${item}-${i}`}>
              <span className="sep">•</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      <section className="landing-stats" id="landing-stats">
        <div className="landing-stats-head">
          <p className="landing-eyebrow">
            <span className="dot" />
            Right now, while you're here
          </p>
          <h2 className="landing-h2">The rails never sleep.</h2>
        </div>
        <div className="landing-stats-grid">
          <div className="landing-stat-card">
            <p className="landing-stat-label">UPI payments since you opened this page</p>
            <p className="landing-stat-value">{Math.floor(vol.count).toLocaleString('en-IN')}</p>
          </div>
          <div className="landing-stat-card">
            <p className="landing-stat-label">Value moved since you opened this page</p>
            <p className="landing-stat-value">
              {crNum(val.count, 2)}
              <span className="unit">₹ Cr</span>
            </p>
          </div>
          <div className="landing-stat-card">
            <p className="landing-stat-label">Estimated UPI throughput, right now</p>
            <p className="landing-stat-value">
              {Math.round(volRate).toLocaleString('en-IN')}
              <span className="unit">txns / sec</span>
            </p>
          </div>
          <div className="landing-stat-card">
            <p className="landing-stat-label">Latest month covered</p>
            <p className="landing-stat-value" style={{ fontSize: 'clamp(20px, 2.4vw, 28px)' }}>
              {latest ? new Date(`${latest.month}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
        <p className="landing-disclaimer">
          These counters spread NPCI's latest published monthly total evenly across a second — a directional feel
          for scale, not a real-time feed or an accounting figure.
        </p>
      </section>

      <div className="landing-footer-cta">
        <button type="button" className="landing-btn" onClick={onEnter}>
          Enter the dashboard
          <ArrowRight size={16} />
        </button>
        <p className="landing-footer-note">Sourced from NPCI &amp; RBI's official statistics.</p>
      </div>
    </div>
  )
}
