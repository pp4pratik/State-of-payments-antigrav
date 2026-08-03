import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/apps', label: 'All apps' },
  { to: '/spending', label: 'Spending' },
  { to: '/geography', label: 'Geography' },
  { to: '/autopay', label: 'AutoPay' },
  { to: '/rbi', label: 'RBI' },
  { to: '/circulars', label: 'Circulars' },
]

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-8 py-6">
          <div className="font-mono-label mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--marigold)]">
            <span className="h-[7px] w-[7px] rounded-full bg-[var(--marigold)]" />
            NPCI &middot; RBI &middot; Live Index
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-serif-display text-4xl italic">State of Payments</h1>
            <nav className="flex gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]"
                  activeProps={{ className: 'bg-[var(--surface)] text-[var(--text)]' }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
