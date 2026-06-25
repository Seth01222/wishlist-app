'use client'

import { money } from '@/lib/price'

// Per-list budget bar, intertwined with item status: already-spent ("got") and
// money-set-aside ("saved up") fill the bar; "want" is what you still need to
// plan for. Turns rose when the total exceeds the budget.
export default function BudgetMeter({
  budget,
  want,
  saved,
  spent,
  currency = 'USD',
}: {
  budget: number
  want: number
  saved: number
  spent: number
  currency?: string
}) {
  const planned = want + saved + spent
  const remaining = budget - planned
  const over = remaining < 0
  const pct = (n: number) => (budget > 0 ? Math.max(0, Math.min(100, (n / budget) * 100)) : 0)

  return (
    <div className="bg-card border border-line rounded-2xl px-4 py-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-dim uppercase tracking-wide">Budget</span>
        <span className="text-sm font-semibold text-ink">{money(budget, currency)}</span>
      </div>

      <div className="h-2.5 rounded-full bg-raised overflow-hidden flex">
        <div className="h-full transition-all duration-500" style={{ width: `${pct(spent)}%`, background: 'linear-gradient(90deg,#34d399,#10b981)' }} title={`Got: ${money(spent, currency)}`} />
        <div className="h-full transition-all duration-500" style={{ width: `${pct(saved)}%`, background: 'linear-gradient(90deg,#fbbf24,#f59e0b)' }} title={`Saved up: ${money(saved, currency)}`} />
        <div className="h-full transition-all duration-500" style={{ width: `${pct(want)}%`, background: 'var(--line)' }} title={`Want: ${money(want, currency)}`} />
      </div>

      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-ghost">
          {spent > 0 && <span><span className="text-emerald-500">●</span> {money(spent, currency)} got</span>}
          {saved > 0 && <span><span className="text-amber-500">●</span> {money(saved, currency)} saved</span>}
          {want > 0 && <span><span style={{ color: 'var(--ghost)' }}>●</span> {money(want, currency)} want</span>}
        </span>
        {over
          ? <span className="font-semibold text-rose-500 shrink-0">{money(Math.abs(remaining), currency)} over</span>
          : <span className="font-semibold text-emerald-500 shrink-0">{money(remaining, currency)} left</span>}
      </div>
    </div>
  )
}
