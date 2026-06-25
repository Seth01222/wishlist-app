'use client'

import { useState } from 'react'
import { STATUS_ORDER, STATUS_META, PRIORITY_META, type ItemStatus } from '@/lib/itemMeta'

type OtherList = { id: string; name: string; emoji: string | null }

// Floating action bar shown when one or more items are selected. Status,
// priority, and move open small popovers; delete and clear act immediately.
export default function BulkBar({
  count, lists, onStatus, onPriority, onMove, onDelete, onClear,
}: {
  count: number
  lists: OtherList[]
  onStatus: (s: ItemStatus) => void
  onPriority: (p: number) => void
  onMove: (listId: string) => void
  onDelete: () => void
  onClear: () => void
}) {
  const [menu, setMenu] = useState<null | 'status' | 'priority' | 'move'>(null)
  const toggle = (m: 'status' | 'priority' | 'move') => setMenu(prev => (prev === m ? null : m))

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto bg-card border border-line rounded-2xl shadow-2xl flex items-center gap-1 p-1.5 animate-[slideUp_.2s_ease]">
        <span className="px-3 text-sm font-semibold text-ink">{count} selected</span>

        {/* Status */}
        <div className="relative">
          <button onClick={() => toggle('status')} className="px-3 py-2 rounded-xl text-sm font-medium bg-raised text-dim hover:text-ink spring">Status</button>
          {menu === 'status' && (
            <div className="absolute bottom-full mb-2 left-0 bg-card border border-line rounded-xl shadow-xl p-1 w-36">
              {STATUS_ORDER.map(s => (
                <button key={s} onClick={() => { onStatus(s); setMenu(null) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-raised spring">
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS_META[s].dot }} />{STATUS_META[s].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="relative">
          <button onClick={() => toggle('priority')} className="px-3 py-2 rounded-xl text-sm font-medium bg-raised text-dim hover:text-ink spring">Priority</button>
          {menu === 'priority' && (
            <div className="absolute bottom-full mb-2 left-0 bg-card border border-line rounded-xl shadow-xl p-1 w-36">
              {[3, 2, 1, 0].map(p => (
                <button key={p} onClick={() => { onPriority(p); setMenu(null) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-raised spring">
                  <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_META[p].color }} />{PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Move */}
        {lists.length > 0 && (
          <div className="relative">
            <button onClick={() => toggle('move')} className="px-3 py-2 rounded-xl text-sm font-medium bg-raised text-dim hover:text-ink spring">Move</button>
            {menu === 'move' && (
              <div className="absolute bottom-full mb-2 left-0 bg-card border border-line rounded-xl shadow-xl p-1 w-48 max-h-60 overflow-y-auto">
                {lists.map(l => (
                  <button key={l.id} onClick={() => { onMove(l.id); setMenu(null) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink hover:bg-raised spring text-left">
                    <span>{l.emoji ?? '🛍️'}</span>{l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={onDelete} className="px-3 py-2 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/10 spring">Delete</button>
        <button onClick={onClear} title="Clear selection" className="px-2.5 py-2 rounded-xl text-dim hover:text-ink hover:bg-raised spring">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  )
}
