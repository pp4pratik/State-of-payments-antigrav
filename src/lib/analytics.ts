import type { PostHog } from 'posthog-js'

const apiKey = import.meta.env.VITE_POSTHOG_KEY

export const isAnalyticsConfigured = Boolean(apiKey)

let posthogInstance: PostHog | null = null
let initPromise: Promise<PostHog | null> | null = null

// Lazy-loaded so posthog-js never ends up in the main bundle for the (common) case
// where analytics isn't configured - matches how upidashboard.com defers its own
// analytics chunk behind a dynamic import instead of loading it eagerly.
async function getPostHog(): Promise<PostHog | null> {
  if (!isAnalyticsConfigured) return null
  if (!initPromise) {
    initPromise = import('posthog-js').then(({ default: posthog }) => {
      posthog.init(apiKey, {
        api_host: 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: true,
      })
      posthogInstance = posthog
      return posthog
    })
  }
  return initPromise
}

export function initAnalytics(): void {
  if (isAnalyticsConfigured) void getPostHog()
}

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!isAnalyticsConfigured) return
  if (posthogInstance) {
    posthogInstance.capture(name, properties)
  } else {
    void getPostHog().then((ph) => ph?.capture(name, properties))
  }
}
