import { createFileRoute } from '@tanstack/react-router'
import { DashboardProvider, useDashboard } from '../lib/DashboardContext'
import { useAppStatsAll } from '../lib/queries'
import { Controls } from '../components/Controls'
import { UpiView } from '../components/UpiView'
import { AutoPayView } from '../components/AutoPayView'
import { RbiCardsView } from '../components/RbiCardsView'
import { RbiPaymentsView } from '../components/RbiPaymentsView'
import { CircularsView } from '../components/CircularsView'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const appStats = useAppStatsAll()

  if (appStats.isPending) return <Shell>Loading…</Shell>
  if (appStats.error) return <Shell>Failed to load: {appStats.error.message}</Shell>

  return (
    <DashboardProvider months={appStats.data.months}>
      <Header />
      <ActiveView />
    </DashboardProvider>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <p className="section-note">{children}</p>
    </>
  )
}

function Header() {
  return (
    <>
      <p className="eyebrow">
        <span className="dot" />
        NPCI · UPI ecosystem tracker
      </p>
      <h1>UPI Pulse</h1>
      <p className="subtitle">
        Monthly trends, app leaderboard, ticket size, and circulars for India's Unified Payments
        Interface — every number sourced from NPCI and RBI via a live database, no click-through
        required.
      </p>
    </>
  )
}

function ActiveView() {
  const { view } = useDashboard()
  return (
    <>
      {/* TODO: a combined "download all" export per view, like UPI-Dash's downloadAllBtn */}
      <Controls onDownloadAll={() => {}} />
      {view === 'upi' && <UpiView />}
      {view === 'autopay' && <AutoPayView />}
      {view === 'rbi' && <RbiCardsView />}
      {view === 'rbipayments' && <RbiPaymentsView />}
      {view === 'circulars' && <CircularsView />}
    </>
  )
}
