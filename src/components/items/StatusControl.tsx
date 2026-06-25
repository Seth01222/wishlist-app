'use client'

import { STATUS_ORDER, STATUS_META, type ItemStatus } from '@/lib/itemMeta'

// Tri-state Want / Saved up / Got it segmented control.
export default function StatusControl({ value, onChange }: { value: ItemStatus; onChange: (s: ItemStatus) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-line overflow-hidden shrink-0" onClick={e => e.stopPropagation()}>
      {STATUS_ORDER.map(s => {
        const active = value === s
        const m = STATUS_META[s]
        return (
          <button
            key={s}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onChange(s) }}
            title={m.label}
            className={`px-2.5 py-1 text-[11px] font-semibold spring ${active ? 'text-white' : 'bg-raised text-dim hover:text-ink'}`}
            style={active ? { background: m.dot } : {}}
          >
            {m.short}
          </button>
        )
      })}
    </div>
  )
}
