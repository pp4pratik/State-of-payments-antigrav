import { useEffect, useState } from 'react'
import { SESSION_START_MS } from './sessionStart'

// Ticks a count up from 0 at `perSecondRate` per second, timed off SESSION_START_MS
// (not off when this hook itself mounted) so switching views and back doesn't
// restart it - only an actual page refresh (which re-evaluates SESSION_START_MS)
// does. Updates 10x/sec via setInterval - plenty smooth for a number that moves
// by thousands per tick at UPI's real transaction volume; requestAnimationFrame's
// 60fps would just be 6x the re-renders for no visible benefit here.
export function useLiveCounter(perSecondRate: number): { count: number; elapsedSeconds: number } {
  const [state, setState] = useState({ count: 0, elapsedSeconds: 0 })

  useEffect(() => {
    const tick = () => {
      const elapsedSeconds = Math.max(0, (Date.now() - SESSION_START_MS) / 1000)
      setState({ count: Number.isFinite(perSecondRate) ? elapsedSeconds * perSecondRate : 0, elapsedSeconds })
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [perSecondRate])

  return state
}
