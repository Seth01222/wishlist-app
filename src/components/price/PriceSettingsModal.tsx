'use client'

import { usePriceSettings, type SparkRange } from '@/lib/usePriceInsights'

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      role="switch" aria-checked={on} onClick={onClick}
      className={`relative w-9 rounded-full transition-colors spring shrink-0 ${on ? '' : 'bg-line'}`}
      style={{ height: '20px', ...(on ? { background: 'var(--a600)' } : {}) }}
    >
      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? 'translateX(16px)' : 'translateX(0)' }} />
    </button>
  )
}

const RANGES: { value: SparkRange; label: string }[] = [
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 0, label: 'All' },
]

export default function PriceSettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, update, reset } = usePriceSettings()

  const rows: { key: 'showProgress' | 'showSparkline' | 'showBadges' | 'showBudget'; title: string; desc: string }[] = [
    { key: 'showProgress',  title: 'Target progress bar', desc: 'Show how close each price is to your target.' },
    { key: 'showSparkline', title: 'Price history chart', desc: 'Mini sparkline of an item’s price over time.' },
    { key: 'showBadges',    title: 'Deal badges',         desc: '“Lowest ever”, price drops, target met.' },
    { key: 'showBudget',    title: 'List budget meter',   desc: 'Track a list’s total against a budget.' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-ink">Price insights</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ghost hover:text-ink hover:bg-raised spring">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p className="text-dim text-sm mb-4">Choose what to show on your items and lists.</p>

        <div className="space-y-1">
          {rows.map(r => (
            <div key={r.key} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{r.title}</p>
                <p className="text-xs text-ghost">{r.desc}</p>
              </div>
              <Toggle on={settings[r.key]} onClick={() => update({ [r.key]: !settings[r.key] })} />
            </div>
          ))}
        </div>

        {/* Sparkline range */}
        <div className={`flex items-center justify-between gap-4 py-3 mt-1 border-t border-line ${settings.showSparkline ? '' : 'opacity-40 pointer-events-none'}`}>
          <div>
            <p className="text-sm font-medium text-ink">Chart range</p>
            <p className="text-xs text-ghost">How much history the sparkline shows.</p>
          </div>
          <div className="flex rounded-lg border border-line overflow-hidden shrink-0">
            {RANGES.map(r => (
              <button key={r.label} onClick={() => update({ sparkRange: r.value })}
                className={`px-3 py-1.5 text-xs font-medium spring ${settings.sparkRange === r.value ? 'text-[var(--a-on)]' : 'bg-raised text-dim hover:text-ink'}`}
                style={settings.sparkRange === r.value ? { background: 'var(--a600)' } : {}}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button onClick={reset} className="text-sm text-dim hover:text-ink spring">Reset to defaults</button>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg spring" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>Done</button>
        </div>
      </div>
    </div>
  )
}
