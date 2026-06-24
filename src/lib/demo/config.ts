// Demo mode lets anyone explore the app with pre-seeded data, without a
// Supabase account. It's gated entirely by a single cookie so it can be
// detected on both the server (next/headers) and the browser (document.cookie).

export const DEMO_COOKIE = 'wl-demo'
export const DEMO_EMAIL = 'demo@wishlist.app'
// Any password works for the demo account — this is just what we show as a hint.
export const DEMO_PASSWORD = 'demo'
export const DEMO_USER_ID = 'demo-user'

// 30 days, matches how long the demo session stays active.
const MAX_AGE = 60 * 60 * 24 * 30

/** True when the demo cookie is present in the browser. */
export function isDemoBrowser(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').some(c => c === `${DEMO_COOKIE}=1`)
}

/** Turn demo mode on (browser only). */
export function setDemoCookie(): void {
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${MAX_AGE}; samesite=lax`
}

/** Turn demo mode off (browser only). */
export function clearDemoCookie(): void {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`
}
