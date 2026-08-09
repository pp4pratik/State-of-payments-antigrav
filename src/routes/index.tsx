import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { DashboardProvider, useDashboard } from '../lib/DashboardContext'
import { useAppStatsAll } from '../lib/queries'
import { Controls } from '../components/Controls'
import { LandingView } from '../components/LandingView'
import { UpiView } from '../components/UpiView'
import { AutoPayView } from '../components/AutoPayView'
import { RbiCardsView } from '../components/RbiCardsView'
import { RbiPaymentsView } from '../components/RbiPaymentsView'
import { CircularsView } from '../components/CircularsView'

export const Route = createFileRoute('/')({
  component: Landing,
})

function Landing() {
  const [entered, setEntered] = useState(false)
  if (!entered) return <LandingView onEnter={() => setEntered(true)} />
  return <Dashboard />
}

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
      <h1>Payments Pulse</h1>
      <p className="subtitle">India's UPI &amp; RBI payments data, live from NPCI and RBI.</p>
    </>
  )
}

function ActiveView() {
  const { view } = useDashboard()
  return (
    <>
      <Controls />
      {view === 'upi' && <UpiView />}
      {view === 'autopay' && <AutoPayView />}
      {view === 'rbi' && <RbiCardsView />}
      {view === 'rbipayments' && <RbiPaymentsView />}
      {view === 'circulars' && <CircularsView />}
    </>
  )
}
