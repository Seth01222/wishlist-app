'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type WishlistItem = {
  id: string
  name: string
  url: string | null
  image_url: string | null
  notes: string | null
  target_price: number | null
  auto_price: number | null
  auto_currency: string | null
  priority: number | null
  tags: string[] | null
  created_at: string
}

type Wishlist = {
  id: string
  name: string
  description: string | null
}

type FetchedMeta = {
  title: string | null
  image: string | null
  price: string | null
  currency: string
  siteName: string | null
  error?: string
}

async function fetchUrlMeta(url: string): Promise<FetchedMeta | null> {
  try {
    const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`)
    const json = await res.json()
    return json
  } catch {
    return null
  }
}

export default function WishlistDetailClient({
  wishlist,
  initialItems,
}: {
  wishlist: Wishlist
  initialItems: WishlistItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [manualImageUrl, setManualImageUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [fetchedMeta, setFetchedMeta] = useState<FetchedMeta | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchNote, setFetchNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const urlFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Use refs so the setTimeout callback always reads the latest values
  const nameRef = useRef(name)
  const targetPriceRef = useRef(targetPrice)
  nameRef.current = name
  targetPriceRef.current = targetPrice

  function handleUrlChange(val: string) {
    setUrl(val)
    setFetchNote(null)
    if (urlFetchTimer.current) clearTimeout(urlFetchTimer.current)
    if (!val.trim().startsWith('http')) return
    urlFetchTimer.current = setTimeout(async () => {
      setFetching(true)
      const meta = await fetchUrlMeta(val.trim())
      setFetching(false)
      if (!meta || meta.error) {
        setFetchNote(meta?.error?.includes('403') || meta?.error?.includes('404')
          ? 'This site blocks automatic lookups. Fill in the details manually below.'
          : 'Couldn\'t reach this page. Fill in the details manually.')
        return
      }
      setFetchedMeta(meta)
      if (meta.title && !nameRef.current) setName(meta.title)
      if (meta.price && !targetPriceRef.current) setTargetPrice(meta.price)
      if (!meta.image) {
        setFetchNote('Found the title but no image. To add one: right-click the product photo → "Copy Image Address," then paste it in the Image URL field below.')
      }
    }, 700)
  }

  const displayImage = manualImageUrl || fetchedMeta?.image || null

  function resetForm() {
    setName(''); setUrl(''); setManualImageUrl(''); setNotes(''); setTargetPrice('')
    setFetchedMeta(null); setFetchNote(null); setError(null)
    setShowForm(false)
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({
        wishlist_id: wishlist.id,
        name: name.trim(),
        url: url.trim() || null,
        image_url: displayImage || null,
        notes: notes.trim() || null,
        target_price: targetPrice ? parseFloat(targetPrice) : null,
        auto_price: fetchedMeta?.price ? parseFloat(fetchedMeta.price) : null,
        auto_currency: fetchedMeta?.currency ?? null,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setItems([data, ...items])
      resetForm()
      setLoading(false)
    }
  }

  async function deleteItem(id: string) {
    const supabase = createClient()
    await supabase.from('wishlist_items').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/wishlists"
          className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All lists
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">{wishlist.name}</h1>
            {wishlist.description && <p className="text-dim text-sm mt-1">{wishlist.description}</p>}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shrink-0"
            style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add item
          </button>
        </div>
      </div>

      {/* Add item form */}
      {showForm && (
        <div className="mb-6 bg-card border border-line rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-ink mb-1">Add a new item</h2>
          <p className="text-dim text-xs mb-4">Paste a product URL and we&apos;ll auto-fill the details.</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          {/* URL — drives auto-fill */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink mb-1.5">
              Product URL
              <span className="ml-2 text-xs font-normal text-dim">paste a link to auto-fill name & price</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder="https://www.amazon.com/..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
              />
              {fetching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 border-2 border-line rounded-full animate-spin" style={{ borderTopColor: 'var(--a500)' }} />
                  <span className="text-xs text-ghost">Looking up…</span>
                </div>
              )}
            </div>
            {fetchNote && (
              <p className="mt-1.5 text-xs text-amber-500">{fetchNote}</p>
            )}
          </div>

          {/* Image preview + name row */}
          <div className="flex gap-3 mb-4">
            <div className="shrink-0">
              <div className="w-20 h-20 rounded-xl border border-line bg-raised overflow-hidden flex items-center justify-center">
                {displayImage ? (
                  <img src={displayImage} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-7 h-7 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-ink mb-1.5">
                Product name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Sony WH-1000XM5 Headphones"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Image URL (manual) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink mb-1.5">
              Image URL
              <span className="ml-2 text-xs font-normal text-dim">
                {displayImage ? '✓ image found' : 'right-click any product photo → Copy Image Address'}
              </span>
            </label>
            <input
              type="url"
              value={manualImageUrl}
              onChange={e => setManualImageUrl(e.target.value)}
              placeholder="https://…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
              style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Price ($) {fetchedMeta?.price && <span className="text-ghost text-xs font-normal">auto-found</span>}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Color, size…"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-dim hover:text-ink rounded-lg hover:bg-raised transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addItem}
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
              style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
            >
              {loading ? 'Adding…' : 'Add item'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showForm && (
        <div className="text-center py-24 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'var(--a50)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--a500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">This list is empty</h3>
          <p className="text-dim text-sm mb-6">Add the first item — paste a URL and we&apos;ll grab the image and price automatically.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
          >
            Add your first item
          </button>
        </div>
      )}

      {/* Item grid */}
      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(item => (
            <ItemCard key={item.id} item={item} onDelete={deleteItem} />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemCard({ item, onDelete }: { item: WishlistItem; onDelete: (id: string) => void }) {
  const [imgError, setImgError] = useState(false)
  const displayPrice = item.auto_price ?? item.target_price

  return (
    <div className="group relative bg-card border border-line rounded-2xl overflow-hidden hover:border-[var(--a200)] transition-colors">
      {/* Delete button */}
      <button
        onClick={() => onDelete(item.id)}
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-card/80 backdrop-blur-sm text-ghost hover:text-red-400 hover:bg-red-500/10 transition-all"
        title="Remove"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex gap-0">
        {/* Image */}
        <div className="w-28 shrink-0 bg-raised flex items-center justify-center overflow-hidden">
          {item.image_url && !imgError ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full min-h-[112px] p-3">
              <svg className="w-8 h-8 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <h3 className="font-semibold text-ink text-sm leading-tight line-clamp-2 mb-2">{item.name}</h3>

          {displayPrice && (
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-xl font-bold" style={{ color: 'var(--a500)' }}>
                ${Number(displayPrice).toFixed(2)}
              </span>
              <span className="text-xs text-ghost">{item.auto_currency ?? 'USD'}</span>
            </div>
          )}

          {item.target_price && item.auto_price && item.auto_price !== item.target_price && (
            <div className="text-xs text-dim mb-2">
              Target: <span className="font-medium text-ink">${item.target_price.toFixed(2)}</span>
              {item.auto_price < item.target_price && (
                <span className="ml-1.5 text-emerald-400 font-medium">✓ below target!</span>
              )}
            </div>
          )}

          {item.notes && (
            <p className="text-xs text-dim mb-2 line-clamp-1">{item.notes}</p>
          )}

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'var(--a500)' }}
            >
              View product
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
