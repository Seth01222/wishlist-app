'use client'

import { PRIORITY_META } from '@/lib/itemMeta'

// A small colored pill shown on items with a priority set.
export function PriorityBadge({ p }: { p: number }) {
  if (!p) return null
  const m = PRIORITY_META[p]
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.cls}`}>
      {p === 3 ? '🔺' : p === 2 ? '◆' : '▪'} {m.short}
    </span>
  )
}

// Compact picker for setting an item's priority.
export function PriorityControl({ value, onChange }: { value: number; onChange: (p: number) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-line overflow-hidden" onClick={e => e.stopPropagation()}>
      {[0, 1, 2, 3].map(p => {
        const active = value === p
        const m = PRIORITY_META[p]
        return (
          <button
            key={p}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onChange(p) }}
            title={m.label}
            className={`px-2 py-1 text-[11px] font-semibold spring ${active ? 'text-white' : 'bg-raised text-dim hover:text-ink'}`}
            style={active ? { background: m.color } : {}}
          >
            {m.short}
          </button>
        )
      })}
    </div>
  )
}
