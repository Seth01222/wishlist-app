// Pure helpers for the "price smarts" features. No React, no I/O — just math on
// an item's current price, target, and recorded history, so it's trivial to test
// and reuse across the card, row, and budget views.

export type PriceRecord = { price: number; recorded_at: string; currency?: string | null }

export type PriceInsight = {
  current: number | null
  target: number | null
  currency: string
  lowest: number | null
  highest: number | null
  first: number | null
  /** 0..1 — how close the current price is to the target (1 = met or below). */
  targetPct: number | null
  targetMet: boolean
  /** Amount over the target (positive) when not yet met. */
  overTarget: number | null
  /** first − current; positive means the price has dropped since we started tracking. */
  dropFromFirst: number | null
  dropPct: number | null
  isLowestEver: boolean
  hasHistory: boolean
}

const EPS = 0.005

export function computeInsight(opts: {
  current?: number | null
  target?: number | null
  currency?: string | null
  history?: PriceRecord[]
}): PriceInsight {
  const current = opts.current ?? null
  const target = opts.target ?? null
  const currency = opts.currency || 'USD'

  const sorted = [...(opts.history ?? [])].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  )
  const prices = sorted.map(r => Number(r.price)).filter(n => !isNaN(n) && n > 0)
  if (current != null) prices.push(current)

  const hasHistory = sorted.length >= 2
  const lowest = prices.length ? Math.min(...prices) : null
  const highest = prices.length ? Math.max(...prices) : null
  const first = sorted.length ? Number(sorted[0].price) : null

  let targetPct: number | null = null
  let targetMet = false
  let overTarget: number | null = null
  if (current != null && target != null && target > 0) {
    targetMet = current <= target + EPS
    overTarget = targetMet ? 0 : current - target
    // Bar fills as the price approaches the target (target/current), 1 when met.
    targetPct = targetMet ? 1 : Math.max(0, Math.min(1, target / current))
  }

  const dropFromFirst = hasHistory && current != null && first != null ? first - current : null
  const dropPct = dropFromFirst != null && first ? dropFromFirst / first : null
  const isLowestEver = hasHistory && current != null && lowest != null && current <= lowest + EPS

  return { current, target, currency, lowest, highest, first, targetPct, targetMet, overTarget, dropFromFirst, dropPct, isLowestEver, hasHistory }
}

export function money(n: number, currency = 'USD'): string {
  const whole = Math.abs(n % 1) < 0.005
  try {
    return n.toLocaleString('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    })
  } catch {
    return `$${n.toFixed(whole ? 0 : 2)}`
  }
}

/** Filter history to the last `days` (0 = all). */
export function withinRange(history: PriceRecord[], days: number): PriceRecord[] {
  if (!days) return history
  const cutoff = Date.now() - days * 86_400_000
  return history.filter(r => new Date(r.recorded_at).getTime() >= cutoff)
}
