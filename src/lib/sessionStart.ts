// The live counter no longer starts automatically on page load - it starts when the
// user clicks the button. This module-level (not component-level) variable is what
// makes that "started" state survive switching away from the UPI view and back
// (LiveCounter unmounts on a view switch, so component state alone wouldn't persist)
// while still resetting on an actual page refresh, since the whole module re-evaluates
// then and `liveCounterStartMs` goes back to null.
export let liveCounterStartMs: number | null = null

export function markLiveCounterStarted(): number {
  if (liveCounterStartMs === null) liveCounterStartMs = Date.now()
  return liveCounterStartMs
}

export function resetLiveCounter(): void {
  liveCounterStartMs = null
}
