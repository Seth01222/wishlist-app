'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type WishlistItem = {
  id: string
  name: string
  url: string | null
  image_url: string | null
  notes: string | null
  target_price: number | null
  priority: number | null
  tags: string[] | null
  created_at: string
}

type Wishlist = {
  id: string
  name: string
  description: string | null
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
  const [notes, setNotes] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        notes: notes.trim() || null,
        target_price: targetPrice ? parseFloat(targetPrice) : null,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setItems([data, ...items])
      setName('')
      setUrl('')
      setNotes('')
      setTargetPrice('')
      setShowForm(false)
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
      <div className="mb-8">
        <Link href="/wishlists" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All lists
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{wishlist.name}</h1>
            {wishlist.description && (
              <p className="text-slate-500 text-sm mt-1">{wishlist.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition shadow-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add item
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Add a new item</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={addItem} className="space-y-4">
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium text-slate-700 mb-1.5">
                Product name <span className="text-red-500">*</span>
              </label>
              <input
                id="itemName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Sony WH-1000XM5 Headphones"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label htmlFor="itemUrl" className="block text-sm font-medium text-slate-700 mb-1.5">
                Product URL <span className="text-slate-400 font-normal">(optional — paste a link to look up price later)</span>
              </label>
              <input
                id="itemUrl"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.amazon.com/..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="itemPrice" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Target price ($) <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="itemPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="Alert me if it drops below…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label htmlFor="itemNotes" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="itemNotes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Color, size, or anything else…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? 'Adding…' : 'Add item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <div className="text-center py-24 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">This list is empty</h3>
          <p className="text-slate-500 text-sm mb-6">Add the first item to start tracking prices.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition"
          >
            Add your first item
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{item.name}</h3>
                      {item.notes && (
                        <p className="text-sm text-slate-500 mt-0.5">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.target_price && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          🎯 ${item.target_price.toFixed(2)}
                        </span>
                      )}
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-2 transition"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View product
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
