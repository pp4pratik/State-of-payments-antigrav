import { useEffect, useRef, useState } from 'react'

// Animates from the previous value (0 on first mount) to `target` - used for
// AutoPay's headline KPI numbers so a month switch feels alive instead of the
// figure just snapping. Skipped entirely under prefers-reduced-motion.
export function useCountUp(target: number | null, duration = 700): number | null {
  const [value, setValue] = useState<number | null>(target == null ? null : 0)
  const prevTarget = useRef(0)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (target == null) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = prevTarget.current
    const to = target
    if (prefersReduced || from === to) {
      setValue(to)
      prevTarget.current = to
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (to - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevTarget.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}
