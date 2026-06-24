'use client'

import { type PriceInsight, money } from '@/lib/price'

// Small status pills derived from price history: lowest-ever, price drop/rise
// since tracking began, and target-met. Renders nothing when there's nothing
// noteworthy to say.
export default function DealBadges({ insight }: { insight: PriceInsight }) {
  const badges: { key: string; label: string; cls: string }[] = []

  if (insight.isLowestEver && insight.hasHistory) {
    badges.push({ key: 'low', label: '🔥 Lowest ever', cls: 'bg-emerald-500/15 text-emerald-500' })
  }

  if (insight.dropFromFirst != null && Math.abs(insight.dropFromFirst) >= 1) {
    const dropped = insight.dropFromFirst > 0
    const pct = insight.dropPct != null ? Math.round(Math.abs(insight.dropPct) * 100) : null
    badges.push({
      key: 'delta',
      label: `${dropped ? '▼' : '▲'} ${money(Math.abs(insight.dropFromFirst), insight.currency)}${pct != null ? ` (${pct}%)` : ''}`,
      cls: dropped ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500',
    })
  }

  if (insight.targetMet) {
    badges.push({ key: 'target', label: '🎯 Target met', cls: 'bg-emerald-500/15 text-emerald-500' })
  }

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {badges.map(b => (
        <span key={b.key} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${b.cls}`}>
          {b.label}
        </span>
      ))}
    </div>
  )
}
