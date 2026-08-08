// Evaluated once when this module first loads - i.e. once per page load/refresh,
// not once per component mount. Anchoring the live counter to this (rather than
// a useState/useRef inside the component) means switching between views doesn't
// reset it, but an actual page refresh does, since the whole JS bundle re-evaluates.
export const SESSION_START_MS = Date.now()
