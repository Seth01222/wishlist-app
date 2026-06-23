'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Wishlist = {
  id: string
  name: string
  description: string | null
  created_at: string
  emoji: string | null
}

const EMOJIS = ['🛍️','🎮','👟','📱','🏠','🎁','📚','🎵','🌿','✈️','🍳','💄','⌚','🎨','🧘','🐾']

export default function WishlistsClient({ initialWishlists }: { initialWishlists: Wishlist[] }) {
  const [wishlists, setWishlists] = useState(initialWishlists)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🛍️')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createWishlist(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in.'); setLoading(false); return }

    const { data, error } = await supabase
      .from('wishlists')
      .insert({ name: name.trim(), description: description.trim() || null, user_id: user.id, emoji })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setWishlists([data, ...wishlists])
      setName(''); setDescription(''); setEmoji('🛍️')
      setShowForm(false); setLoading(false)
    }
  }

  async function deleteWishlist(id: string) {
    const supabase = createClient()
    await supabase.from('wishlists').delete().eq('id', id)
    setWishlists(wishlists.filter(w => w.id !== id))
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Wishlists</h1>
          <p className="text-dim text-sm mt-1">
            {wishlists.length === 0 ? 'Start by creating a list' : `${wishlists.length} list${wishlists.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
          style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New list
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 bg-card border border-line rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-ink mb-4">Create a new list</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}
          <form onSubmit={createWishlist} className="space-y-4">
            {/* Emoji picker */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Pick an icon</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`w-9 h-9 text-lg rounded-lg transition-all ${
                      emoji === e
                        ? 'ring-2 scale-110'
                        : 'bg-raised hover:bg-elevated'
                    }`}
                    style={emoji === e ? { ringColor: 'var(--a500)', background: 'var(--a100)' } : {}}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="listName" className="block text-sm font-medium text-ink mb-1.5">
                List name <span className="text-red-400">*</span>
              </label>
              <input
                id="listName"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Birthday wishlist, Gaming gear…"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
              />
            </div>
            <div>
              <label htmlFor="listDesc" className="block text-sm font-medium text-ink mb-1.5">
                Description <span className="text-ghost font-normal">(optional)</span>
              </label>
              <input
                id="listDesc"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this list for?"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                className="px-4 py-2 text-sm font-medium text-dim hover:text-ink rounded-lg hover:bg-raised transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
                style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
              >
                {loading ? 'Creating…' : 'Create list'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {wishlists.length === 0 && !showForm && (
        <div className="text-center py-24 px-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{ background: 'var(--a50)' }}
          >
            🛍️
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">No wishlists yet</h3>
          <p className="text-dim text-sm mb-6">Create your first list to start tracking what you want.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
          >
            Create your first list
          </button>
        </div>
      )}

      {/* Wishlist grid */}
      {wishlists.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map(list => (
            <div
              key={list.id}
              className="group relative bg-card border border-line rounded-2xl p-5 hover:border-[var(--a200)] transition-colors"
            >
              <button
                onClick={() => deleteWishlist(list.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-ghost hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete list"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <Link href={`/wishlists/${list.id}`} className="block">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-xl text-2xl shrink-0"
                    style={{ background: 'var(--a50)' }}
                  >
                    {list.emoji ?? '🛍️'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink truncate group-hover:text-[var(--a500)] transition-colors">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="text-dim text-xs truncate mt-0.5">{list.description}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-ghost">
                  Created {new Date(list.created_at).toLocaleDateString()}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
