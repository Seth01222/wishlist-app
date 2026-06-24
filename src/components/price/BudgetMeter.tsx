'use client'

import { money } from '@/lib/price'

// Per-list budget bar. Compares what's still planned (unpurchased total) against
// the list's budget, with already-spent shown as context. Turns rose when over.
export default function BudgetMeter({
  budget,
  committed,
  spent,
  currency = 'USD',
}: {
  budget: number
  committed: number
  spent: number
  currency?: string
}) {
  const remaining = budget - committed
  const over = remaining < 0
  const pct = budget > 0 ? Math.min(1, committed / budget) : 0
  const overPct = over && budget > 0 ? Math.min(1, Math.abs(remaining) / budget) : 0

  return (
    <div className="bg-card border border-line rounded-2xl px-4 py-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-dim uppercase tracking-wide">Budget</span>
        <span className="text-sm font-semibold text-ink">{money(budget, currency)}</span>
      </div>

      <div className="h-2.5 rounded-full bg-raised overflow-hidden flex">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${Math.round(pct * 100)}%`,
            background: over ? 'linear-gradient(90deg,#fb7185,#e11d48)' : 'linear-gradient(90deg,var(--a500),var(--a600))',
          }}
        />
        {over && (
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${Math.round(overPct * 100)}%`, background: 'repeating-linear-gradient(45deg,#e11d48,#e11d48 3px,#be123c 3px,#be123c 6px)' }}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-ghost">{money(committed, currency)} planned{spent > 0 && ` · ${money(spent, currency)} spent`}</span>
        {over
          ? <span className="font-semibold text-rose-500">{money(Math.abs(remaining), currency)} over</span>
          : <span className="font-semibold text-emerald-500">{money(remaining, currency)} left</span>}
      </div>
    </div>
  )
}
