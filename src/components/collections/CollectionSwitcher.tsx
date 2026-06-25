'use client'

import { ACCENTS } from '@/lib/theme'

type Collection = { id: string; name: string; emoji: string | null; description: string | null; color: string | null; sort_order: number }

const accentHex = (id: string | null | undefined) => ACCENTS.find(a => a.id === id)?.hex ?? 'var(--a600)'

// Horizontal pill switcher for master lists. Active pill is themed in the
// collection's color; the active collection also exposes an edit affordance.
export default function CollectionSwitcher({
  collections, selected, counts, onSelect, onAdd, onEdit,
}: {
  collections: Collection[]
  selected: string | 'all'
  counts: Map<string, number>
  onSelect: (id: string | 'all') => void
  onAdd: () => void
  onEdit: (c: Collection) => void
}) {
  return (
    <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1.5 -mx-1 px-1">
      <button
        onClick={() => onSelect('all')}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium spring border ${selected === 'all' ? 'text-[var(--a-on)] border-transparent' : 'bg-card border-line text-dim hover:text-ink'}`}
        style={selected === 'all' ? { background: 'var(--a600)' } : {}}
      >
        ✨ All
      </button>

      {collections.map(c => {
        const active = selected === c.id
        const hex = accentHex(c.color)
        const count = counts.get(c.id) ?? 0
        return (
          <div key={c.id} className="shrink-0 relative group">
            <button
              onClick={() => onSelect(c.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium spring border ${active ? 'text-white border-transparent' : 'bg-card border-line text-dim hover:text-ink'}`}
              style={active ? { background: hex } : {}}
            >
              <span>{c.emoji ?? '📂'}</span>
              {c.name}
              {count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-raised text-ghost'}`}>{count}</span>}
              {active && (
                <span onClick={e => { e.stopPropagation(); onEdit(c) }} role="button" title="Edit master list" className="ml-0.5 -mr-1 p-0.5 rounded hover:bg-white/20">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </span>
              )}
            </button>
          </div>
        )
      })}

      <button
        onClick={onAdd}
        title="New master list"
        className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium bg-raised border border-dashed border-line text-dim hover:text-ink spring"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        Master list
      </button>
    </div>
  )
}
