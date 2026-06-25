'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { INPUT_CLASS as INPUT, RING_STYLE as RING } from '@/lib/ui'
import { statusOf, STATUS_META, PRIORITY_META, type ItemStatus } from '@/lib/itemMeta'
import { money } from '@/lib/price'
import { PriorityBadge } from '@/components/items/Priority'

export type SearchRow = {
  id: string; name: string; image_url: string | null
  auto_price: number | null; target_price: number | null
  priority: number | null; status: string | null; purchased?: boolean | null
  tags: string[] | null; wishlist_id: string; list_name: string; list_emoji: string | null
}

const priceOf = (r: SearchRow) => Number(r.auto_price ?? r.target_price ?? 0)

export default function SearchClient({ items }: { items: SearchRow[] }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ItemStatus | 'all'>('all')
  const [priority, setPriority] = useState<number | 'all'>('all')
  const [tag, setTag] = useState<string>('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')

  const allTags = useMemo(() => [...new Set(items.flatMap(i => i.tags ?? []))].sort(), [items])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter(r => {
      if (needle && !(r.name.toLowerCase().includes(needle) || r.tags?.some(t => t.includes(needle)) || r.list_name.toLowerCase().includes(needle))) return false
      if (status !== 'all' && statusOf(r) !== status) return false
      if (priority !== 'all' && (r.priority ?? 0) !== priority) return false
      if (tag && !r.tags?.includes(tag)) return false
      const p = priceOf(r)
      if (min && p < parseFloat(min)) return false
      if (max && p > parseFloat(max)) return false
      return true
    }).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name))
  }, [items, q, status, priority, tag, min, max])

  const chip = (active: boolean, color?: string) =>
    `px-2.5 py-1 text-xs rounded-full border spring ${active ? 'text-[var(--a-on)] border-transparent' : 'border-line bg-raised text-dim hover:text-ink'}`

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-ink mb-1">Search</h1>
      <p className="text-dim text-sm mb-4">Search every item across all your lists.</p>

      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search items, tags, lists…" className={`${INPUT} pl-10`} style={RING} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {(['all', 'want', 'saved', 'got'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)} className={chip(status === s)} style={status === s ? { background: s === 'all' ? 'var(--a600)' : STATUS_META[s].dot } : {}}>
            {s === 'all' ? 'Any status' : STATUS_META[s].label}
          </button>
        ))}
        <span className="w-px h-4 bg-line mx-0.5" />
        {([['all', 'Any'], [3, 'High'], [2, 'Med'], [1, 'Low']] as const).map(([p, label]) => (
          <button key={String(p)} onClick={() => setPriority(p === 'all' ? 'all' : (p as number))} className={chip(priority === p)} style={priority === p ? { background: p === 'all' ? 'var(--a600)' : PRIORITY_META[p as number].color } : {}}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {allTags.length > 0 && (
          <select value={tag} onChange={e => setTag(e.target.value)} className="px-3 py-1.5 text-sm rounded-lg border border-line bg-raised text-ink focus:outline-none focus:ring-2 spring" style={RING}>
            <option value="">All tags</option>
            {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
          </select>
        )}
        <div className="flex items-center gap-1.5 text-sm text-dim">
          <span>$</span>
          <input value={min} onChange={e => setMin(e.target.value)} type="number" min="0" placeholder="min" className="w-20 px-2 py-1.5 text-sm rounded-lg border border-line bg-raised text-ink focus:outline-none focus:ring-2" style={RING} />
          <span>–</span>
          <input value={max} onChange={e => setMax(e.target.value)} type="number" min="0" placeholder="max" className="w-20 px-2 py-1.5 text-sm rounded-lg border border-line bg-raised text-ink focus:outline-none focus:ring-2" style={RING} />
        </div>
        <span className="text-xs text-ghost ml-auto">{results.length} result{results.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="text-center py-20 text-dim text-sm">No items match your search.</div>
      ) : (
        <div className="space-y-1.5">
          {results.map(r => {
            const st = statusOf(r)
            return (
              <Link key={r.id} href={`/wishlists/${r.wishlist_id}`} className="flex items-center gap-3 bg-card border border-line rounded-xl px-3 py-2.5 hover:border-[var(--a200)] spring">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-raised overflow-hidden">
                  {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-ghost text-xs">?</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {(r.priority ?? 0) > 0 && <PriorityBadge p={r.priority ?? 0} />}
                    <span className={`text-sm font-medium text-ink truncate ${st === 'got' ? 'line-through text-dim' : ''}`}>{r.name}</span>
                  </div>
                  <p className="text-xs text-ghost truncate">{r.list_emoji ?? '🛍️'} {r.list_name}</p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_META[st].cls}`}>{STATUS_META[st].short}</span>
                {priceOf(r) > 0 && <span className="text-sm font-semibold text-ink shrink-0">{money(priceOf(r))}</span>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
