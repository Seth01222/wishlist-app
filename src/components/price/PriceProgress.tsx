'use client'

import { money } from '@/lib/price'

// A target-price progress bar. The fill grows as the current price approaches
// the target; when the target is met it turns celebratory green.
export default function PriceProgress({
  current,
  target,
  currency = 'USD',
  pct,
  met,
  overTarget,
}: {
  current: number
  target: number
  currency?: string
  pct: number
  met: boolean
  overTarget: number | null
}) {
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-ghost">Target {money(target, currency)}</span>
        {met
          ? <span className="font-semibold text-emerald-500">🎯 Met · {money(target - current >= 0 ? target - current : 0, currency)} under</span>
          : <span className="text-dim">{money(overTarget ?? current - target, currency)} to go</span>}
      </div>
      <div className="h-2 rounded-full bg-raised overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.round(pct * 100)}%`,
            background: met
              ? 'linear-gradient(90deg,#34d399,#10b981)'
              : 'linear-gradient(90deg,var(--a500),var(--a600))',
          }}
        />
      </div>
    </div>
  )
}
