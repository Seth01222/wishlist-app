'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TiltCard from '@/components/TiltCard'
import StarRating from '@/components/StarRating'
import TaxPrice from '@/components/TaxPrice'
import { useTheme } from '@/components/ThemeProvider'
import { INPUT_CLASS as INPUT, RING_STYLE as RING } from '@/lib/ui'

/* ─── Types ──────────────────────────────────────────────────── */
type Item = {
  id: string; name: string; url: string | null; image_url: string | null
  notes: string | null; target_price: number | null; auto_price: number | null
  auto_currency: string | null; star_rating: number; quantity: number
  purchased: boolean; purchased_at: string | null; tags: string[] | null
  created_at: string
}
type Wishlist = { id: string; name: string; description: string | null }
type OtherList = { id: string; name: string; emoji: string | null }
type FetchedMeta = { title: string | null; image: string | null; price: string | null; currency: string; error?: string }
type ViewMode = 'card' | 'compact'
type SortKey = 'date' | 'name' | 'price-asc' | 'price-desc' | 'stars' | 'smart'

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
  wishlist, initialItems, otherLists,
}: { wishlist: Wishlist; initialItems: Item[]; otherLists: OtherList[] }) {
  const [items, setItems] = useState(initialItems)
  const [view, setView] = useState<ViewMode>('card')
  const [sort, setSort] = useState<SortKey>('date')
  const [search, setSearch] = useState('')
  const [filterTags, setFilterTags] = useState<string[]>([])
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
  const unpurchased = items.filter(i => !i.purchased)
  const purchased   = items.filter(i => i.purchased)
  const totalBase   = unpurchased.reduce((s, i) => s + itemTotal(i), 0)
  const taxMult     = taxEnabled && taxRate > 0 ? 1 + taxRate / 100 : 1
  const totalValue  = totalBase * taxMult
  const totalSpent  = purchased.reduce((s, i) => s + itemTotal(i) * taxMult, 0)

  const filtered = useMemo(() => {
    let r = unpurchased
    if (search) r = r.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())))
    if (filterTags.length) r = r.filter(i => filterTags.every(t => i.tags?.includes(t)))
    switch (sort) {
      case 'name':       r = [...r].sort((a,b) => a.name.localeCompare(b.name)); break
      case 'price-asc':  r = [...r].sort((a,b) => itemPrice(a) - itemPrice(b)); break
      case 'price-desc': r = [...r].sort((a,b) => itemPrice(b) - itemPrice(a)); break
      case 'stars':      r = [...r].sort((a,b) => b.star_rating - a.star_rating); break
      case 'smart':      r = [...r].sort((a,b) => (b.star_rating*20 - itemPrice(b)/50) - (a.star_rating*20 - itemPrice(a)/50)); break
      default:           r = [...r].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return r
  }, [unpurchased, search, filterTags, sort])

  /* ── Supabase mutations ── */
  async function patchItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
    const supabase = createClient()
    await supabase.from('wishlist_items').update(patch).eq('id', id)
  }

  async function togglePurchased(item: Item) {
    const purchased = !item.purchased
    await patchItem(item.id, { purchased, purchased_at: purchased ? new Date().toISOString() : null })
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
    const supabase = createClient()
    await supabase.from('wishlists').update({ name: listName.trim() || wishlist.name, description: listDesc.trim() || null }).eq('id', wishlist.id)
  }

  function copyToClipboard() {
    const lines = [
      `📋 ${listName}`,
      listDesc ? `${listDesc}\n` : '',
      ...unpurchased.map(i => {
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
            <option value="smart">Smart sort</option>
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
      </div>

      {/* ── Add item form ── */}
      {showAddForm && (
        <AddItemForm wishlistId={wishlist.id} onAdd={item => { setItems(p => [item, ...p]); setShowAddForm(false) }} onCancel={() => setShowAddForm(false)} />
      )}

      {/* ── Want section ── */}
      {filtered.length === 0 && !showAddForm ? (
        <EmptyState onAdd={() => setShowAddForm(true)} hasSearch={!!search || filterTags.length > 0} />
      ) : (
        <div className={view === 'card' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-1.5'}>
          {filtered.map(item => view === 'card'
            ? <CardItem key={item.id} item={item} onEdit={setEditingItem} onDelete={deleteItem} onTogglePurchased={togglePurchased} onPatch={patchItem} onMove={() => setMovingItem(item)} />
            : <RowItem   key={item.id} item={item} onEdit={setEditingItem} onDelete={deleteItem} onTogglePurchased={togglePurchased} onPatch={patchItem} onMove={() => setMovingItem(item)} />
          )}
        </div>
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
                  <RowItem item={item} onEdit={setEditingItem} onDelete={deleteItem} onTogglePurchased={togglePurchased} onPatch={patchItem} onMove={() => setMovingItem(item)} />
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
    </div>
  )
}

/* ─── Card view item ─────────────────────────────────────────── */
function CardItem({ item, onEdit, onDelete, onTogglePurchased, onPatch, onMove }: {
  item: Item; onEdit: (i: Item) => void; onDelete: (id: string) => void
  onTogglePurchased: (i: Item) => void; onPatch: (id: string, p: Partial<Item>) => void
  onMove: () => void
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
    <TiltCard className="bg-card border border-line rounded-2xl overflow-hidden hover:border-[var(--a200)] group">
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
            <button onClick={refreshImage} disabled={fetchingImg} title="Re-fetch image" className="absolute inset-0 bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all spring">
              <svg className={`w-5 h-5 text-white drop-shadow ${fetchingImg ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-ink text-sm leading-snug line-clamp-2">{item.name}</h3>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div className="mt-1">
              <TaxPrice price={price * (item.quantity ?? 1)} variant="card" />
              {(item.quantity ?? 1) > 1 && <span className="text-xs text-ghost">×{item.quantity} qty</span>}
            </div>
          )}

          {item.notes && <p className="text-xs text-dim mt-1 line-clamp-1">{item.notes}</p>}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.tags.map(t => <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-raised text-ghost">#{t}</span>)}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            {item.url
              ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium spring" style={{ color:'var(--a500)' }}>View ↗</a>
              : <span />
            }
            <button onClick={() => onTogglePurchased(item)} className={`text-xs px-2.5 py-1 rounded-full spring font-medium ${item.purchased ? 'bg-emerald-500/15 text-emerald-400' : 'bg-raised text-ghost hover:text-ink'}`}>
              {item.purchased ? '✓ Got it' : 'Mark got it'}
            </button>
          </div>
        </div>
      </div>
    </TiltCard>
  )
}

/* ─── Compact / row item ─────────────────────────────────────── */
function RowItem({ item, onEdit, onDelete, onTogglePurchased, onPatch, onMove }: {
  item: Item; onEdit: (i: Item) => void; onDelete: (id: string) => void
  onTogglePurchased: (i: Item) => void; onPatch: (id: string, p: Partial<Item>) => void
  onMove: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [swipeX, setSwipeX] = useState(0)
  const touchStart = useRef(0)
  const price = itemPrice(item)

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
      <div className="swipe-content bg-card border border-line rounded-xl px-3 py-2.5 flex items-center gap-3 group hover:border-[var(--a200)] transition-colors"
        style={{ transform: `translateX(${swipeX}px)` }}>

        {/* Thumbnail */}
        <div className="w-10 h-10 shrink-0 rounded-lg bg-raised overflow-hidden">
          {item.image_url
            ? <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-ghost text-xs">?</div>
          }
        </div>

        {/* Check */}
        <button onClick={() => onTogglePurchased(item)} className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center spring ${item.purchased ? 'border-emerald-400 bg-emerald-400' : 'border-ghost hover:border-[var(--a500)]'}`}>
          {item.purchased && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium text-ink truncate block ${item.purchased ? 'line-through text-dim' : ''}`}>{item.name}</span>
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
        </div>

        <StarRating value={item.star_rating} onChange={v => onPatch(item.id, { star_rating: v })} />

        {price > 0 && <TaxPrice price={price * (item.quantity ?? 1)} variant="row" className="shrink-0" />}

        {/* Actions (hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <label className="text-sm font-medium text-ink">Priority</label>
            <div className="mt-2.5">
              <StarRating value={stars} onChange={setStars} size="md" />
            </div>
          </div>
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
  const [tags, setTags] = useState((item.tags ?? []).join(', '))
  const [loading, setLoading] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await onSave({
      name: name.trim(), url: url.trim() || null, image_url: imageUrl.trim() || null,
      notes: notes.trim() || null,
      target_price: price ? parseFloat(price) : null,
      quantity: parseInt(qty) || 1, star_rating: stars,
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
