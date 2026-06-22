'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Wishlist = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function WishlistsClient({ initialWishlists }: { initialWishlists: Wishlist[] }) {
  const router = useRouter()
  const [wishlists, setWishlists] = useState(initialWishlists)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createWishlist(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('wishlists')
      .insert({ name: name.trim(), description: description.trim() || null })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setWishlists([data, ...wishlists])
      setName('')
      setDescription('')
      setShowForm(false)
      setLoading(false)
    }
  }

  async function deleteWishlist(id: string) {
    const supabase = createClient()
    await supabase.from('wishlists').delete().eq('id', id)
    setWishlists(wishlists.filter(w => w.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Wishlists</h1>
          <p className="text-slate-500 text-sm mt-1">Organize the things you want</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New List
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Create a new list</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={createWishlist} className="space-y-4">
            <div>
              <label htmlFor="listName" className="block text-sm font-medium text-slate-700 mb-1.5">
                List name <span className="text-red-500">*</span>
              </label>
              <input
                id="listName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Birthday wishlist, Home office gear…"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label htmlFor="listDesc" className="block text-sm font-medium text-slate-700 mb-1.5">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="listDesc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this list for?"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
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
                {loading ? 'Creating…' : 'Create list'}
              </button>
            </div>
          </form>
        </div>
      )}

      {wishlists.length === 0 && !showForm ? (
        <div className="text-center py-24 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No wishlists yet</h3>
          <p className="text-slate-500 text-sm mb-6">Create your first list to start tracking what you want.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition"
          >
            Create your first list
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {wishlists.map((list) => (
            <div key={list.id} className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/wishlists/${list.id}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition truncate">{list.name}</h3>
                  {list.description && (
                    <p className="text-sm text-slate-500 mt-0.5 truncate">{list.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    Created {new Date(list.created_at).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={() => deleteWishlist(list.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="Delete list"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
