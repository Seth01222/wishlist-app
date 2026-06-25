'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TiltCard from '@/components/TiltCard'
import StarRating from '@/components/StarRating'
import TaxPrice from '@/components/TaxPrice'
import { useTheme } from '@/components/ThemeProvider'
import { INPUT_CLASS as INPUT, RING_STYLE as RING } from '@/lib/ui'
import { usePriceSettings } from '@/lib/usePriceInsights'
import { type PriceRecord } from '@/lib/price'
import PriceInsights from '@/components/price/PriceInsights'
import BudgetMeter from '@/components/price/BudgetMeter'
import RecheckButton from '@/components/price/RecheckButton'
import StatusControl from '@/components/items/StatusControl'
import { PriorityBadge, PriorityControl } from '@/components/items/Priority'
import BulkBar from '@/components/items/BulkBar'
import { statusOf, STATUS_META, PRIORITY_META, type ItemStatus } from '@/lib/itemMeta'

/* ─── Types ──────────────────────────────────────────────────── */
type Item = {
  id: string; name: string; url: string | null; image_url: string | null
  notes: string | null; target_price: number | null; auto_price: number | null
  auto_currency: string | null; star_rating: number; quantity: number
  purchased: boolean; purchased_at: string | null; tags: string[] | null
  priority: number; status: string; sort_order: number
  created_at: string
}
type Wishlist = { id: string; name: string; description: string | null; budget?: number | null }
type OtherList = { id: string; name: string; emoji: string | null }
type FetchedMeta = { title: string | null; image: string | null; price: string | null; currency: string; error?: string }
type ViewMode = 'card' | 'compact'
type SortKey = 'date' | 'name' | 'price-asc' | 'price-desc' | 'stars' | 'smart' | 'priority' | 'manual'

/* ─── Helpers ────────────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const itemPrice = (i: Item) => Number(i.auto_price ?? i.target_price ?? 0)

function retailerName(url: string | null): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname // e.g. "www.amazon.com"
    const parts = host.replace(/^www\./, '').split('.')
    // Return the domain name (first part before the TLD)
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0]
  } catch { return null }
}
const itemTotal = (i: Item) => itemPrice(i) * (i.quantity ?? 1)

async function fetchMeta(url: string): Promise<FetchedMeta | null> {
  try {
    const r = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`)
    return await r.json()
  } catch { return null }
}

/* ─── Main component ─────────────────────────────────────────── */
export default function WishlistDetailClient({
  wishlist, initialItems, otherLists, historyByItem = {},
}: { wishlist: Wishlist; initialItems: Item[]; otherLists: OtherList[]; historyByItem?: Record<string, PriceRecord[]> }) {
  const { settings } = usePriceSettings()
  const [items, setItems] = useState(initialItems)
  const [budget, setBudget] = useState<number | null>(wishlist.budget ?? null)
  const [budgetInput, setBudgetInput] = useState(wishlist.budget != null ? String(wishlist.budget) : '')
  const [history, setHistory] = useState<Record<string, PriceRecord[]>>(historyByItem)
  const [view, setView] = useState<ViewMode>('card')
  const [sort, setSort] = useState<SortKey>('date')
  const [search, setSearch] = useState('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<ItemStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<number | 'all'>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [showPurchased, setShowPurchased] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editingListName, setEditingListName] = useState(false)
  const [listName, setListName] = useState(wishlist.name)
  const [listDesc, setListDesc] = useState(wishlist.description ?? '')
  const [movingItem, setMovingItem] = useState<Item | null>(null)
  const [ptrVisible, setPtrVisible] = useState(false)
  const [refreshingImages, setRefreshingImages] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState(0)
  const [refreshResult, setRefreshResult] = useState<{ found: number; total: number } | null>(null)
  const { taxEnabled, taxRate } = useTheme()

  // Load saved view from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wl-view-${wishlist.id}`) as ViewMode | null
    if (saved) setView(saved)
  }, [wishlist.id])

  function setViewAndSave(v: ViewMode) {
    setView(v)
    localStorage.setItem(`wl-view-${wishlist.id}`, v)
  }

  // Pull-to-refresh
  useEffect(() => {
    let startY = 0; let triggered = false
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; triggered = false }
    const onMove = (e: TouchEvent) => {
      if (window.scrollY > 0 || triggered) return
      const dy = e.touches[0].clientY - startY
      if (dy > 60) { triggered = true; setPtrVisible(true); setTimeout(() => { window.location.reload() }, 600) }
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    return () => { document.removeEventListener('touchstart', onStart); document.removeEventListener('touchmove', onMove) }
  }, [])

  /* ── Derived values ── */
  const allTags = useMemo(() => [...new Set(items.flatMap(i => i.tags ?? []))].sort(), [items])
  const active      = items.filter(i => statusOf(i) !== 'got')          // want + saved
  const purchased   = items.filter(i => statusOf(i) === 'got')
  const totalBase   = active.reduce((s, i) => s + itemTotal(i), 0)
  const taxMult     = taxEnabled && taxRate > 0 ? 1 + taxRate / 100 : 1
  const totalValue  = totalBase * taxMult
  const totalSpent  = purchased.reduce((s, i) => s + itemTotal(i) * taxMult, 0)

  // Budget-intertwined status totals (pre-tax).
  const wantTotal  = items.filter(i => statusOf(i) === 'want').reduce((s, i) => s + itemTotal(i), 0)
  const savedTotal = items.filter(i => statusOf(i) === 'saved').reduce((s, i) => s + itemTotal(i), 0)
  const gotTotal   = purchased.reduce((s, i) => s + itemTotal(i), 0)

  const filtered = useMemo(() => {
    let r = active
    if (search) r = r.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())))
    if (filterTags.length) r = r.filter(i => filterTags.every(t => i.tags?.includes(t)))
    if (filterStatus !== 'all') r = r.filter(i => statusOf(i) === filterStatus)
    if (filterPriority !== 'all') r = r.filter(i => (i.priority ?? 0) === filterPriority)
    switch (sort) {
      case 'name':       r = [...r].sort((a,b) => a.name.localeCompare(b.name)); break
      case 'price-asc':  r = [...r].sort((a,b) => itemPrice(a) - itemPrice(b)); break
      case 'price-desc': r = [...r].sort((a,b) => itemPrice(b) - itemPrice(a)); break
      case 'stars':      r = [...r].sort((a,b) => b.star_rating - a.star_rating); break
      case 'priority':   r = [...r].sort((a,b) => (b.priority ?? 0) - (a.priority ?? 0)); break
      case 'manual':     r = [...r].sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)); break
      case 'smart':      r = [...r].sort((a,b) => (b.star_rating*20 - itemPrice(b)/50) - (a.star_rating*20 - itemPrice(a)/50)); break
      default:           r = [...r].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return r
  }, [active, search, filterTags, filterStatus, filterPriority, sort])

  /* ── Supabase mutations ── */
  async function patchItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
    const supabase = createClient()
    await supabase.from('wishlist_items').update(patch).eq('id', id)
  }

  // Status is the source of truth; keep purchased/purchased_at in sync so all
  // the existing "got it" logic and stats keep working.
  function statusPatch(item: Item | null, s: ItemStatus): Partial<Item> {
    return { status: s, purchased: s === 'got', purchased_at: s === 'got' ? (item?.purchased_at ?? new Date().toISOString()) : null }
  }
  async function setStatus(item: Item, s: ItemStatus) {
    await patchItem(item.id, statusPatch(item, s))
  }

  /* ── Bulk actions ── */
  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function clearSelection() { setSelected(new Set()); setSelectMode(false) }

  async function bulkApply(patchFor: (i: Item) => Partial<Item>, remove = false) {
    const ids = [...selected]
    if (ids.length === 0) return
    if (remove) setItems(prev => prev.filter(i => !ids.includes(i.id)))
    else setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, ...patchFor(i) } : i))
    const supabase = createClient()
    await Promise.all(ids.map(id => {
      const q = supabase.from('wishlist_items')
      return remove ? q.delete().eq('id', id) : q.update(patchFor(items.find(x => x.id === id) ?? ({} as Item))).eq('id', id)
    }))
    clearSelection()
  }
  const bulkStatus   = (s: ItemStatus) => bulkApply(i => statusPatch(i, s))
  const bulkPriority = (p: number) => bulkApply(() => ({ priority: p }))
  const bulkMove     = (listId: string) => bulkApply(() => ({ wishlist_id: listId } as Partial<Item>), true)
  const bulkDelete   = () => { if (confirm(`Delete ${selected.size} item(s)?`)) bulkApply(() => ({}), true) }

  /* ── Drag-to-reorder (manual sort) ── */
  async function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); return }
    const order = filtered.map(i => i.id)
    const from = order.indexOf(draggingId), to = order.indexOf(targetId)
    if (from < 0 || to < 0) { setDraggingId(null); return }
    order.splice(to, 0, order.splice(from, 1)[0])
    const pos = new Map(order.map((id, idx) => [id, idx]))
    setItems(prev => prev.map(i => pos.has(i.id) ? { ...i, sort_order: pos.get(i.id)! } : i))
    setDraggingId(null)
    const supabase = createClient()
    await Promise.all(order.map((id, idx) => supabase.from('wishlist_items').update({ sort_order: idx }).eq('id', id)))
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    const supabase = createClient()
    await supabase.from('wishlist_items').delete().eq('id', id)
  }

  async function moveItem(item: Item, targetListId: string) {
    setItems(prev => prev.filter(i => i.id !== item.id))
    const supabase = createClient()
    await supabase.from('wishlist_items').update({ wishlist_id: targetListId }).eq('id', item.id)
    setMovingItem(null)
  }

  async function saveListName() {
    setEditingListName(false)
    const parsedBudget = budgetInput.trim() ? parseFloat(budgetInput) : null
    const nextBudget = parsedBudget != null && !isNaN(parsedBudget) && parsedBudget >= 0 ? parsedBudget : null
    setBudget(nextBudget)
    const supabase = createClient()
    await supabase.from('wishlists')
      .update({ name: listName.trim() || wishlist.name, description: listDesc.trim() || null, budget: nextBudget })
      .eq('id', wishlist.id)
  }

  // Append a price observation to history (DB + local state for a live chart).
  async function recordPrice(itemId: string, price: number, currency: string | null) {
    if (!price || price <= 0) return
    setHistory(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] ?? []), { price, currency: currency || 'USD', recorded_at: new Date().toISOString() }],
    }))
    const supabase = createClient()
    await supabase.from('price_records').insert({ item_id: itemId, price, currency: currency || 'USD', source: 'auto' })
  }

  // Re-fetch the current price for a single item and log it to history.
  async function recheckPrice(item: Item): Promise<boolean> {
    if (!item.url) return false
    const meta = await fetchMeta(item.url)
    if (!meta || meta.error || !meta.price) return false
    const n = parseFloat(meta.price)
    if (isNaN(n) || n <= 0) return false
    const currency = meta.currency || item.auto_currency || 'USD'
    const patch: Partial<Item> = { auto_price: n, auto_currency: currency }
    if (meta.image?.startsWith('http') && !item.image_url) patch.image_url = meta.image
    await patchItem(item.id, patch)
    await recordPrice(item.id, n, currency)
    return true
  }

  function copyToClipboard() {
    const lines = [
      `📋 ${listName}`,
      listDesc ? `${listDesc}\n` : '',
      ...active.map(i => {
        const price = itemPrice(i) ? ` — ${fmt(itemPrice(i))}` : ''
        const qty   = (i.quantity ?? 1) > 1 ? ` (x${i.quantity})` : ''
        const stars = i.star_rating ? ' ' + '★'.repeat(i.star_rating) : ''
        const url   = i.url ? `\n  ${i.url}` : ''
        return `• ${i.name}${qty}${price}${stars}${url}`
      }),
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(lines)
      .then(() => alert('Copied to clipboard!'))
      .catch(() => alert('Could not copy. Try selecting text manually.'))
  }

  async function refreshAllImages() {
    const withUrls = items.filter(i => i.url)
    if (withUrls.length === 0) return
    setRefreshingImages(true)
    setRefreshProgress(0)
    setRefreshResult(null)
    const supabase = createClient()
    const BATCH = 4
    let done = 0
    let found = 0

    // Collect all updates first, then apply in one setItems call to avoid race conditions
    const updates: Record<string, Partial<Item>> = {}

    for (let b = 0; b < withUrls.length; b += BATCH) {
      await Promise.all(withUrls.slice(b, b + BATCH).map(async item => {
        try {
          const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(item.url!)}`)
          if (!res.ok) return
          const meta = await res.json()
          if (meta?.error) return // site blocked us

          const patch: Partial<Item> = {}
          if (meta?.image?.startsWith('http')) patch.image_url = meta.image
          if (meta?.price && item.auto_price == null && item.target_price == null) {
            const n = parseFloat(meta.price)
            if (!isNaN(n) && n > 0) patch.auto_price = n
          }
          if (Object.keys(patch).length > 0) {
            updates[item.id] = patch
            if (patch.image_url) found++
            await supabase.from('wishlist_items').update(patch).eq('id', item.id)
          }
        } catch {}
        done++
        setRefreshProgress(Math.round((done / withUrls.length) * 100))
      }))
    }

    // Apply all image updates in a single state update
    if (Object.keys(updates).length > 0) {
      setItems(prev => prev.map(i => updates[i.id] ? { ...i, ...updates[i.id] } : i))
    }

    setRefreshingImages(false)
    setRefreshResult({ found, total: withUrls.length })
  }

  return (
    <div>
      {/* Pull-to-refresh indicator */}
      <div className={`ptr-indicator${ptrVisible ? ' visible' : ''}`}>↻ Refreshing…</div>

      {/* ── Header ── */}
      <div className="mb-6">
        <Link href="/wishlists" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-3 spring">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          All lists
        </Link>

        {editingListName ? (
          <div className="space-y-2 mb-4">
            <input value={listName} onChange={e => setListName(e.target.value)} className={INPUT} style={RING} placeholder="List name" autoFocus onKeyDown={e => e.key === 'Enter' && saveListName()} />
            <input value={listDesc} onChange={e => setListDesc(e.target.value)} className={INPUT} style={RING} placeholder="Description (optional)" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost text-sm">$</span>
              <input value={budgetInput} onChange={e => setBudgetInput(e.target.value)} type="number" min="0" step="0.01" className={`${INPUT} pl-7`} style={RING} placeholder="Budget for this list (optional)" onKeyDown={e => e.key === 'Enter' && saveListName()} />
            </div>
            <div className="flex gap-2">
              <button onClick={saveListName} className="px-3 py-1.5 text-sm rounded-lg spring" style={{ background:'var(--a600)', color:'var(--a-on)' }}>Save</button>
              <button onClick={() => setEditingListName(false)} className="px-3 py-1.5 text-sm rounded-lg bg-raised text-dim hover:text-ink spring">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 mb-1">
            <button onClick={() => setEditingListName(true)} className="text-left group">
              <h1 className="text-2xl font-bold text-ink group-hover:text-[var(--a500)] transition-colors">{listName}</h1>
              {listDesc && <p className="text-dim text-sm mt-0.5">{listDesc}</p>}
            </button>
            <div className="flex items-center gap-1.5 shrink-0">
              {totalBase > 0 && (
                <span className="text-sm font-semibold text-ink bg-card border border-line rounded-full px-3 py-1">
                  <TaxPrice price={totalBase} variant="total" />
                </span>
              )}
              <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium spring" style={{ background:'var(--a600)', color:'var(--a-on)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Add
              </button>
            </div>
          </div>
        )}

        {/* ── Budget meter ── */}
        {settings.showBudget && budget != null && budget > 0 && (
          <BudgetMeter budget={budget} want={wantTotal} saved={savedTotal} spent={gotTotal} currency="USD" />
        )}

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[140px]">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors" style={RING} />
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="px-3 py-1.5 text-sm rounded-lg border border-line bg-raised text-ink focus:outline-none focus:ring-2 spring" style={RING}>
            <option value="date">Newest</option>
            <option value="name">Name</option>
            <option value="stars">Stars</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="priority">Priority</option>
            <option value="smart">Smart sort</option>
            <option value="manual">Manual order</option>
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-line overflow-hidden">
            {(['card','compact'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewAndSave(v)} className={`px-3 py-1.5 text-sm spring ${view===v ? 'text-[var(--a-on)]' : 'bg-raised text-dim hover:text-ink'}`} style={view===v ? { background:'var(--a600)' } : {}}>
                {v === 'card' ? '▦' : '≡'}
              </button>
            ))}
          </div>

          {/* Refresh images */}
          <button onClick={refreshAllImages} disabled={refreshingImages} title="Re-fetch images from product pages" className="p-2 rounded-lg bg-raised text-dim hover:text-ink spring disabled:opacity-40 relative">
            <svg className={`w-4 h-4 ${refreshingImages ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>

          {/* Copy */}
          <button onClick={copyToClipboard} title="Copy list to clipboard" className="p-2 rounded-lg bg-raised text-dim hover:text-ink spring">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          </button>

          {/* Select (bulk) */}
          <button onClick={() => { setSelectMode(m => !m); setSelected(new Set()) }} title="Select multiple"
            className={`px-3 py-1.5 text-sm rounded-lg spring font-medium ${selectMode ? 'text-[var(--a-on)]' : 'bg-raised text-dim hover:text-ink'}`}
            style={selectMode ? { background: 'var(--a600)' } : {}}>
            {selectMode ? 'Done' : 'Select'}
          </button>
        </div>

        {/* Refresh progress bar */}
        {refreshingImages && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs" style={{ color:'var(--a500)' }}>Fetching images… {refreshProgress}%</p>
            </div>
            <div className="h-1 rounded-full bg-raised overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width:`${refreshProgress}%`, background:'var(--a500)' }} />
            </div>
          </div>
        )}
        {!refreshingImages && refreshResult && (
          <p className={`text-xs mt-1.5 ${refreshResult.found > 0 ? 'text-emerald-400' : 'text-amber-500'}`}>
            {refreshResult.found > 0
              ? `✓ Updated ${refreshResult.found} image${refreshResult.found !== 1 ? 's' : ''} (${refreshResult.total - refreshResult.found} sites blocked the request)`
              : `⚠ No images found — all ${refreshResult.total} sites blocked the request. Try editing items and pasting an image URL manually.`
            }
          </p>
        )}

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {allTags.map(t => (
              <button key={t} onClick={() => setFilterTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                className={`px-2.5 py-0.5 text-xs rounded-full border spring transition-colors ${filterTags.includes(t) ? 'text-[var(--a-on)] border-transparent' : 'border-line bg-raised text-dim hover:text-ink'}`}
                style={filterTags.includes(t) ? { background:'var(--a600)' } : {}}>
                #{t}
              </button>
            ))}
            {filterTags.length > 0 && (
              <button onClick={() => setFilterTags([])} className="px-2.5 py-0.5 text-xs rounded-full text-ghost hover:text-dim spring">✕ clear</button>
            )}
          </div>
        )}

        {/* Status + priority filters */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {(['all', 'want', 'saved'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-0.5 text-xs rounded-full border spring ${filterStatus === s ? 'text-[var(--a-on)] border-transparent' : 'border-line bg-raised text-dim hover:text-ink'}`}
              style={filterStatus === s ? { background: s === 'all' ? 'var(--a600)' : STATUS_META[s].dot } : {}}>
              {s === 'all' ? 'All' : STATUS_META[s].label}
            </button>
          ))}
          <span className="w-px h-4 bg-line mx-0.5" />
          {([['all', 'Any'], [3, 'High'], [2, 'Med'], [1, 'Low']] as const).map(([p, label]) => (
            <button key={String(p)} onClick={() => setFilterPriority(p === 'all' ? 'all' : (p as number))}
              className={`px-2.5 py-0.5 text-xs rounded-full border spring ${filterPriority === p ? 'text-[var(--a-on)] border-transparent' : 'border-line bg-raised text-dim hover:text-ink'}`}
              style={filterPriority === p ? { background: p === 'all' ? 'var(--a600)' : PRIORITY_META[p as number].color } : {}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Add item form ── */}
      {showAddForm && (
        <AddItemForm wishlistId={wishlist.id} onAdd={item => { setItems(p => [item, ...p]); if (item.auto_price) recordPrice(item.id, item.auto_price, item.auto_currency); setShowAddForm(false) }} onCancel={() => setShowAddForm(false)} />
      )}

      {/* ── Want section ── */}
      {filtered.length === 0 && !showAddForm ? (
        <EmptyState onAdd={() => setShowAddForm(true)} hasSearch={!!search || filterTags.length > 0} />
      ) : (
        <div className={view === 'card' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-1.5'}>
          {filtered.map(item => {
            const common = { item, history: history[item.id] ?? [], onRecheck: recheckPrice, onEdit: setEditingItem, onDelete: deleteItem, onStatus: setStatus, onPatch: patchItem, onMove: () => setMovingItem(item), selectMode, isSelected: selected.has(item.id), onToggleSelect: toggleSelect }
            const canDrag = sort === 'manual' && !selectMode
            return (
              <div key={item.id}
                draggable={canDrag}
                onDragStart={canDrag ? () => setDraggingId(item.id) : undefined}
                onDragOver={canDrag ? (e => e.preventDefault()) : undefined}
                onDrop={canDrag ? (() => handleDrop(item.id)) : undefined}
                onDragEnd={canDrag ? (() => setDraggingId(null)) : undefined}
                className={canDrag ? `cursor-move ${draggingId === item.id ? 'opacity-40' : ''}` : ''}
              >
                {view === 'card' ? <CardItem {...common} /> : <RowItem {...common} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Manual-order hint */}
      {sort === 'manual' && !selectMode && filtered.length > 1 && (
        <p className="text-xs text-ghost mt-2">↕ Drag items to reorder them.</p>
      )}

      {/* ── Got it section ── */}
      {purchased.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowPurchased(p => !p)} className="flex items-center gap-2 text-sm font-medium text-dim hover:text-ink spring mb-3">
            <span className={`transition-transform ${showPurchased ? 'rotate-90' : ''}`}>▶</span>
            Got it ({purchased.length})
            {totalSpent > 0 && (
              <span className="text-ghost">· saved <TaxPrice price={purchased.reduce((s,i) => s + itemTotal(i), 0)} variant="total" /></span>
            )}
          </button>
          {showPurchased && (
            <div className="space-y-1.5">
              {purchased.map(item => (
                <div key={item.id} className="purchased-item">
                  <RowItem item={item} history={history[item.id] ?? []} onRecheck={recheckPrice} onEdit={setEditingItem} onDelete={deleteItem} onStatus={setStatus} onPatch={patchItem} onMove={() => setMovingItem(item)} selectMode={selectMode} isSelected={selected.has(item.id)} onToggleSelect={toggleSelect} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingItem && (
        <EditItemModal item={editingItem} onSave={async (patch) => { await patchItem(editingItem.id, patch); setEditingItem(null) }} onClose={() => setEditingItem(null)} />
      )}

      {/* ── Move modal ── */}
      {movingItem && (
        <MoveModal item={movingItem} lists={otherLists.filter(l => l.id !== wishlist.id)} onMove={moveItem} onClose={() => setMovingItem(null)} />
      )}

      {/* ── Bulk action bar ── */}
      {selectMode && selected.size > 0 && (
        <BulkBar
          count={selected.size}
          lists={otherLists.filter(l => l.id !== wishlist.id)}
          onStatus={bulkStatus}
          onPriority={bulkPriority}
          onMove={bulkMove}
          onDelete={bulkDelete}
          onClear={clearSelection}
        />
      )}
    </div>
  )
}

/* ─── Card view item ─────────────────────────────────────────── */
function CardItem({ item, history, onRecheck, onEdit, onDelete, onStatus, onPatch, onMove, selectMode, isSelected, onToggleSelect }: {
  item: Item; history: PriceRecord[]; onRecheck: (i: Item) => Promise<boolean>
  onEdit: (i: Item) => void; onDelete: (id: string) => void
  onStatus: (i: Item, s: ItemStatus) => void; onPatch: (id: string, p: Partial<Item>) => void
  onMove: () => void
  selectMode: boolean; isSelected: boolean; onToggleSelect: (id: string) => void
}) {
  const [imgErr, setImgErr] = useState(false)
  const [fetchingImg, setFetchingImg] = useState(false)

  async function refreshImage() {
    if (!item.url || fetchingImg) return
    setFetchingImg(true)
    try {
      const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(item.url)}`)
      const meta = await res.json()
      if (meta?.image?.startsWith('http')) {
        setImgErr(false)
        onPatch(item.id, { image_url: meta.image })
      }
    } catch {}
    setFetchingImg(false)
  }
  const price = itemPrice(item)

  return (
    <TiltCard className={`bg-card border rounded-2xl overflow-hidden hover:border-[var(--a200)] group ${isSelected ? 'border-[var(--a500)] ring-2 ring-[var(--a500)]' : 'border-line'}`}>
      {selectMode && (
        <button onClick={() => onToggleSelect(item.id)} className="absolute top-2 left-2 z-20 w-6 h-6 rounded-md flex items-center justify-center border-2 shadow-sm spring"
          style={isSelected ? { background: 'var(--a600)', borderColor: 'var(--a600)' } : { background: 'var(--card)', borderColor: 'var(--line)' }}>
          {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
        </button>
      )}
      <div className="flex">
        {/* Image */}
        <div className="w-28 shrink-0 bg-raised flex items-center justify-center overflow-hidden min-h-[120px] relative group/img">
          {item.image_url && !imgErr
            ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover img-lazy loaded" onError={() => setImgErr(true)} loading="lazy" />
            : item.url
              ? <button onClick={refreshImage} disabled={fetchingImg} className="flex flex-col items-center gap-1.5 text-ghost hover:text-ink spring p-2 text-center">
                  <svg className={`w-6 h-6 ${fetchingImg ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span className="text-[10px] leading-tight">{fetchingImg ? 'Fetching…' : 'Fetch image'}</span>
                </button>
              : <svg className="w-8 h-8 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          }
          {/* Refresh overlay on existing image */}
          {item.image_url && !imgErr && item.url && (
            <button onClick={refreshImage} disabled={fetchingImg} title="Re-fetch image" className="absolute inset-0 bg-black/0 hover:bg-black/40 touch:bg-black/25 flex items-center justify-center opacity-0 group-hover/img:opacity-100 touch:opacity-100 transition-all spring">
              <svg className={`w-5 h-5 text-white drop-shadow ${fetchingImg ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              {item.priority > 0 && <div className="mb-1"><PriorityBadge p={item.priority} /></div>}
              <h3 className="font-semibold text-ink text-sm leading-snug line-clamp-2">{item.name}</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 touch:opacity-100 transition-opacity">
              <button onClick={() => onEdit(item)} className="p-1 rounded text-ghost hover:text-ink spring" title="Edit"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
              <button onClick={onMove} className="p-1 rounded text-ghost hover:text-ink spring" title="Move to list"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg></button>
              <button onClick={() => onDelete(item.id)} className="p-1 rounded text-ghost hover:text-red-400 spring" title="Delete"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
          </div>

          <StarRating value={item.star_rating} onChange={v => onPatch(item.id, { star_rating: v })} />

          {retailerName(item.url) && (
            <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-raised text-ghost">
              {retailerName(item.url)}
            </span>
          )}

          {price > 0 && (
            <div className="mt-1 flex items-center justify-between gap-2">
              <span>
                <TaxPrice price={price * (item.quantity ?? 1)} variant="card" />
                {(item.quantity ?? 1) > 1 && <span className="text-xs text-ghost">×{item.quantity} qty</span>}
              </span>
              {item.url && <RecheckButton onClick={() => onRecheck(item)} />}
            </div>
          )}

          <PriceInsights current={item.auto_price} target={item.target_price} currency={item.auto_currency ?? 'USD'} history={history} />

          {item.notes && <p className="text-xs text-dim mt-1 line-clamp-1">{item.notes}</p>}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.tags.map(t => <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-raised text-ghost">#{t}</span>)}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-2.5">
            <StatusControl value={statusOf(item)} onChange={s => onStatus(item, s)} />
            {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium spring shrink-0" style={{ color:'var(--a500)' }}>View ↗</a>}
          </div>
        </div>
      </div>
    </TiltCard>
  )
}

/* ─── Compact / row item ─────────────────────────────────────── */
function RowItem({ item, history, onRecheck, onEdit, onDelete, onStatus, onPatch, onMove, selectMode, isSelected, onToggleSelect }: {
  item: Item; history: PriceRecord[]; onRecheck: (i: Item) => Promise<boolean>
  onEdit: (i: Item) => void; onDelete: (id: string) => void
  onStatus: (i: Item, s: ItemStatus) => void; onPatch: (id: string, p: Partial<Item>) => void
  onMove: () => void
  selectMode: boolean; isSelected: boolean; onToggleSelect: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [swipeX, setSwipeX] = useState(0)
  const touchStart = useRef(0)
  const price = itemPrice(item)
  const st = statusOf(item)
  const cycleStatus = () => onStatus(item, st === 'want' ? 'saved' : st === 'saved' ? 'got' : 'want')

  function onTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0].clientX }
  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStart.current
    if (dx < 0) setSwipeX(Math.max(dx, -80))
  }
  function onTouchEnd() {
    if (swipeX < -60) onDelete(item.id)
    setSwipeX(0)
  }

  return (
    <div className="swipe-container rounded-xl item-row-enter"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="swipe-action" style={{ transform: swipeX < -20 ? 'translateX(0)' : 'translateX(100%)', borderRadius: '0 12px 12px 0' }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </div>
      <div className={`swipe-content bg-card border rounded-xl px-3 py-2.5 flex items-center gap-3 group transition-colors ${isSelected ? 'border-[var(--a500)] ring-1 ring-[var(--a500)]' : 'border-line hover:border-[var(--a200)]'}`}
        style={{ transform: `translateX(${swipeX}px)` }}>

        {/* Select checkbox (bulk mode) */}
        {selectMode && (
          <button onClick={() => onToggleSelect(item.id)} className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center spring"
            style={isSelected ? { background: 'var(--a600)', borderColor: 'var(--a600)' } : { borderColor: 'var(--line)' }}>
            {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
          </button>
        )}

        {/* Thumbnail */}
        <div className="w-10 h-10 shrink-0 rounded-lg bg-raised overflow-hidden">
          {item.image_url
            ? <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-ghost text-xs">?</div>
          }
        </div>

        {/* Status cycle (Want → Saved → Got) */}
        <button onClick={cycleStatus} title={`${STATUS_META[st].label} — click to change`}
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center spring ${st === 'got' ? 'bg-emerald-400 border-emerald-400' : st === 'saved' ? 'border-amber-400' : 'border-ghost hover:border-[var(--a500)]'}`}
          style={st === 'saved' ? { background: 'color-mix(in oklab, #f59e0b 22%, transparent)' } : {}}>
          {st === 'got' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
          {st === 'saved' && <span className="text-[9px]">💰</span>}
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {item.priority > 0 && <PriorityBadge p={item.priority} />}
            <span className={`text-sm font-medium text-ink truncate ${st === 'got' ? 'line-through text-dim' : ''}`}>{item.name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {retailerName(item.url) && (
              <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-raised text-ghost">
                {retailerName(item.url)}
              </span>
            )}
            {item.tags && item.tags.length > 0 && (
              <span className="text-xs text-ghost">{item.tags.map(t => `#${t}`).join(' ')}</span>
            )}
          </div>
          <PriceInsights current={item.auto_price} target={item.target_price} currency={item.auto_currency ?? 'USD'} history={history} compact />
        </div>

        <StarRating value={item.star_rating} onChange={v => onPatch(item.id, { star_rating: v })} />

        {price > 0 && <TaxPrice price={price * (item.quantity ?? 1)} variant="row" className="shrink-0" />}

        {/* Actions (hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 touch:opacity-100 transition-opacity">
          {item.url && <RecheckButton onClick={() => onRecheck(item)} className="mr-0.5" />}
          <button onClick={() => onEdit(item)} className="p-1 text-ghost hover:text-ink spring"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
          <button onClick={onMove} className="p-1 text-ghost hover:text-ink spring"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg></button>
          <button onClick={() => onDelete(item.id)} className="p-1 text-ghost hover:text-red-400 spring"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
      </div>
    </div>
  )
}

/* ─── Add item form ──────────────────────────────────────────── */
function AddItemForm({ wishlistId, onAdd, onCancel }: {
  wishlistId: string; onAdd: (item: Item) => void; onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [manualImg, setManualImg] = useState('')
  const [notes, setNotes] = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('1')
  const [tags, setTags] = useState('')
  const [stars, setStars] = useState(0)
  const [priority, setPriority] = useState(0)
  const [fetching, setFetching] = useState(false)
  const [fetchNote, setFetchNote] = useState<string | null>(null)
  const [fetchedMeta, setFetchedMeta] = useState<FetchedMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nameRef = useRef(name)
  const priceRef = useRef(price)
  nameRef.current = name; priceRef.current = price

  function handleUrlChange(val: string) {
    setUrl(val); setFetchNote(null)
    if (timer.current) clearTimeout(timer.current)
    if (!val.trim().startsWith('http')) return
    timer.current = setTimeout(async () => {
      setFetching(true)
      const meta = await fetchMeta(val.trim())
      setFetching(false)
      if (!meta || meta.error) { setFetchNote('Couldn\'t auto-fill this URL — fill in below.'); return }
      setFetchedMeta(meta)
      if (meta.title && !nameRef.current) setName(meta.title)
      if (meta.price && !priceRef.current) setPrice(meta.price)
      if (!meta.image) setFetchNote('No image found. Right-click the product photo → Copy Image Address, paste below.')
    }, 700)
  }

  const displayImg = manualImg || fetchedMeta?.image || null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data, error } = await supabase.from('wishlist_items').insert({
      wishlist_id: wishlistId,
      name: name.trim(), url: url.trim() || null,
      image_url: displayImg || null,
      notes: notes.trim() || null,
      target_price: price ? parseFloat(price) : null,
      auto_price: fetchedMeta?.price ? parseFloat(fetchedMeta.price) : null,
      auto_currency: fetchedMeta?.currency ?? null,
      quantity: parseInt(qty) || 1,
      star_rating: stars,
      priority,
      status: 'want',
      tags: tags.trim() ? tags.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean) : null,
    }).select().single()
    if (error) { setError(error.message); setLoading(false) }
    else { onAdd(data as Item) }
  }

  return (
    <div className="mb-6 bg-card border border-line rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-ink mb-3">Add a new item</h2>
      {error && <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-3">
        {/* URL */}
        <div>
          <label className="text-sm font-medium text-ink">Product URL <span className="text-ghost font-normal text-xs ml-1">— auto-fills name & price</span></label>
          <div className="relative mt-1">
            <input type="url" value={url} onChange={e => handleUrlChange(e.target.value)} placeholder="https://amazon.com/..." className={INPUT} style={RING} />
            {fetching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-line rounded-full animate-spin" style={{ borderTopColor:'var(--a500)' }} />}
          </div>
          {fetchNote && <p className="text-xs text-amber-500 mt-1">{fetchNote}</p>}
        </div>

        {/* Image + name row */}
        <div className="flex gap-3">
          <div className="w-16 h-16 shrink-0 rounded-xl border border-line bg-raised overflow-hidden flex items-center justify-center">
            {displayImg ? <img src={displayImg} alt="preview" className="w-full h-full object-cover" /> : <span className="text-ghost text-2xl">🖼️</span>}
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-ink">Name <span className="text-red-400">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Product name" className={`${INPUT} mt-1`} style={RING} autoFocus />
          </div>
        </div>

        {/* Image URL manual */}
        <div>
          <label className="text-sm font-medium text-ink">Image URL <span className="text-ghost font-normal text-xs ml-1">{displayImg ? '✓ found' : 'paste or right-click → Copy Image Address'}</span></label>
          <input type="url" value={manualImg} onChange={e => setManualImg(e.target.value)} placeholder="https://…" className={`${INPUT} mt-1`} style={RING} />
        </div>

        {/* Price / Qty / Stars row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-ink">Price ($)</label>
            <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={`${INPUT} mt-1`} style={RING} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Qty</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className={`${INPUT} mt-1`} style={RING} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Rating</label>
            <div className="mt-2.5">
              <StarRating value={stars} onChange={setStars} size="md" />
            </div>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="text-sm font-medium text-ink">Priority</label>
          <div className="mt-1.5"><PriorityControl value={priority} onChange={setPriority} /></div>
        </div>

        {/* Notes / Tags */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-ink">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Color, size…" className={`${INPUT} mt-1`} style={RING} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Tags <span className="text-ghost font-normal text-xs">comma separated</span></label>
            <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="electronics, gift…" className={`${INPUT} mt-1`} style={RING} />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-dim hover:text-ink rounded-lg hover:bg-raised spring">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg spring disabled:opacity-40" style={{ background:'var(--a600)', color:'var(--a-on)' }}>
            {loading ? 'Adding…' : 'Add item'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Edit item modal ────────────────────────────────────────── */
function EditItemModal({ item, onSave, onClose }: {
  item: Item; onSave: (patch: Partial<Item>) => Promise<void>; onClose: () => void
}) {
  const [name, setName] = useState(item.name)
  const [url, setUrl] = useState(item.url ?? '')
  const [imageUrl, setImageUrl] = useState(item.image_url ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [price, setPrice] = useState(String(item.target_price ?? item.auto_price ?? ''))
  const [qty, setQty] = useState(String(item.quantity ?? 1))
  const [stars, setStars] = useState(item.star_rating ?? 0)
  const [priority, setPriority] = useState(item.priority ?? 0)
  const [tags, setTags] = useState((item.tags ?? []).join(', '))
  const [loading, setLoading] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await onSave({
      name: name.trim(), url: url.trim() || null, image_url: imageUrl.trim() || null,
      notes: notes.trim() || null,
      target_price: price ? parseFloat(price) : null,
      quantity: parseInt(qty) || 1, star_rating: stars, priority,
      tags: tags.trim() ? tags.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean) : null,
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink">Edit item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ghost hover:text-ink hover:bg-raised spring"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div className="flex gap-3">
            <div className="w-16 h-16 shrink-0 rounded-xl border border-line bg-raised overflow-hidden flex items-center justify-center">
              {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-ghost text-2xl">🖼️</span>}
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-ink">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className={`${INPUT} mt-1`} style={RING} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Image URL</label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" className={`${INPUT} mt-1`} style={RING} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Product URL</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className={`${INPUT} mt-1`} style={RING} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-ink">Price ($)</label>
              <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={`${INPUT} mt-1`} style={RING} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink">Qty</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className={`${INPUT} mt-1`} style={RING} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink">Stars</label>
              <div className="mt-2.5"><StarRating value={stars} onChange={setStars} size="md" /></div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Priority</label>
            <div className="mt-1.5"><PriorityControl value={priority} onChange={setPriority} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink">Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={`${INPUT} mt-1`} style={RING} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink">Tags</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="electronics, gift…" className={`${INPUT} mt-1`} style={RING} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-dim hover:text-ink rounded-lg hover:bg-raised spring">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg spring disabled:opacity-40" style={{ background:'var(--a600)', color:'var(--a-on)' }}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Move to list modal ─────────────────────────────────────── */
function MoveModal({ item, lists, onMove, onClose }: {
  item: Item; lists: OtherList[]; onMove: (item: Item, targetId: string) => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <h2 className="font-semibold text-ink mb-1">Move "{item.name}"</h2>
        <p className="text-dim text-sm mb-4">Choose a list to move this item to:</p>
        {lists.length === 0
          ? <p className="text-ghost text-sm">No other lists yet.</p>
          : <div className="space-y-1.5">
              {lists.map(l => (
                <button key={l.id} onClick={() => onMove(item, l.id)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-raised hover:bg-[var(--a50)] text-ink text-sm font-medium spring text-left">
                  <span>{l.emoji ?? '🛍️'}</span>{l.name}
                </button>
              ))}
            </div>
        }
        <button onClick={onClose} className="mt-4 w-full py-2 text-sm text-dim hover:text-ink rounded-lg hover:bg-raised spring">Cancel</button>
      </div>
    </div>
  )
}

/* ─── Empty state ────────────────────────────────────────────── */
function EmptyState({ onAdd, hasSearch }: { onAdd: () => void; hasSearch: boolean }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl" style={{ background:'var(--a50)' }}>
        {hasSearch ? '🔍' : '🛍️'}
      </div>
      <h3 className="text-lg font-semibold text-ink mb-2">{hasSearch ? 'No items match' : 'This list is empty'}</h3>
      <p className="text-dim text-sm mb-6">{hasSearch ? 'Try a different search or clear the filters.' : 'Add your first item — paste a URL to auto-fill.'}</p>
      {!hasSearch && (
        <button onClick={onAdd} className="px-5 py-2.5 rounded-xl font-medium text-sm spring" style={{ background:'var(--a600)', color:'var(--a-on)' }}>
          Add your first item
        </button>
      )}
    </div>
  )
}
