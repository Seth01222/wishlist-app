'use client'

import { useId } from 'react'
import { type PriceRecord, withinRange, money } from '@/lib/price'

// A compact price-history chart: gradient area, a line colored by overall trend
// (down = good/emerald, up = rose), an optional dashed target line, and a dot on
// the latest point. Pure SVG with a viewBox, so it scales to any container.
export default function Sparkline({
  history,
  target,
  currency = 'USD',
  rangeDays = 0,
  height = 40,
  showTarget = true,
}: {
  history: PriceRecord[]
  target?: number | null
  currency?: string
  rangeDays?: number
  height?: number
  showTarget?: boolean
}) {
  const gid = useId()
  const data = withinRange(history, rangeDays)
    .map(r => ({ t: new Date(r.recorded_at).getTime(), p: Number(r.price) }))
    .filter(d => !isNaN(d.p) && d.p > 0)
    .sort((a, b) => a.t - b.t)

  if (data.length < 2) {
    return <div className="text-[11px] text-ghost py-1">No price history yet</div>
  }

  const W = 100, H = height, PAD = 4
  const prices = data.map(d => d.p)
  const times = data.map(d => d.t)
  let min = Math.min(...prices, target ?? Infinity)
  let max = Math.max(...prices, target ?? -Infinity)
  if (min === max) { min -= 1; max += 1 }
  const tMin = Math.min(...times), tMax = Math.max(...times)

  const x = (t: number) => (tMax === tMin ? W / 2 : ((t - tMin) / (tMax - tMin)) * (W - PAD * 2) + PAD)
  const y = (p: number) => H - PAD - ((p - min) / (max - min)) * (H - PAD * 2)

  const pts = data.map(d => `${x(d.t).toFixed(2)},${y(d.p).toFixed(2)}`)
  const line = `M${pts.join(' L')}`
  const area = `${line} L${x(tMax).toFixed(2)},${H} L${x(tMin).toFixed(2)},${H} Z`

  const down = data[data.length - 1].p <= data[0].p
  const stroke = down ? '#10b981' : '#f43f5e'
  const last = data[data.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="overflow-visible" role="img" aria-label={`Price history, currently ${money(last.p, currency)}`}>
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showTarget && target != null && target >= min && target <= max && (
        <line x1={PAD} y1={y(target)} x2={W - PAD} y2={y(target)} stroke="var(--a500)" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.7" />
      )}
      <path d={area} fill={`url(#spark-${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last.t)} cy={y(last.p)} r="1.8" fill={stroke} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
