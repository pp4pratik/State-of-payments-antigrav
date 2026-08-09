import { useEffect, useState } from 'react'

// Ticks a count up from 0 at `perSecondRate` per second, timed off `startedAt` (a
// timestamp the caller controls, not this hook) - `null` means "not started yet" and
// holds the count at 0 without running the interval. Passing the same `startedAt`
// across remounts (see src/lib/sessionStart.ts) resumes the same clock instead of
// restarting it. Updates 10x/sec via setInterval - plenty smooth for a number that
// moves by thousands per tick at UPI's real transaction volume; requestAnimationFrame's
// 60fps would just be 6x the re-renders for no visible benefit here.
export function useLiveCounter(perSecondRate: number, startedAt: number | null): { count: number; elapsedSeconds: number } {
  const [state, setState] = useState({ count: 0, elapsedSeconds: 0 })

  useEffect(() => {
    if (startedAt === null) {
      setState({ count: 0, elapsedSeconds: 0 })
      return
    }
    const tick = () => {
      const elapsedSeconds = Math.max(0, (Date.now() - startedAt) / 1000)
      setState({ count: Number.isFinite(perSecondRate) ? elapsedSeconds * perSecondRate : 0, elapsedSeconds })
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [perSecondRate, startedAt])

  return state
}
