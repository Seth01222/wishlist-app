'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TiltCard from '@/components/TiltCard'
import TaxPrice from '@/components/TaxPrice'
import { useTheme } from '@/components/ThemeProvider'
import ImportModal from '@/components/ImportModal'
import EmojiPicker from '@/components/EmojiPicker'

type Wishlist = { id: string; name: string; description: string | null; created_at: string; emoji: string | null; archived: boolean | null }
type ItemSummaryRow = { wishlist_id: string; purchased: boolean | null; auto_price: number | null; target_price: number | null; quantity: number | null }

const INPUT = "w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
const RING = { '--tw-ring-color': 'var(--a500)' } as React.CSSProperties
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

function itemPrice(r: ItemSummaryRow) { return Number(r.auto_price ?? r.target_price ?? 0) * (r.quantity ?? 1) }

export default function WishlistsClient({ initialWishlists, itemSummary, shareUrl, shareTitle }: { initialWishlists: Wishlist[]; itemSummary: ItemSummaryRow[]; shareUrl?: string; shareTitle?: string }) {
  const router = useRouter()
  const [wishlists, setWishlists] = useState(initialWishlists)
  const [showForm, setShowForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingList, setEditingList] = useState<Wishlist | null>(null)
  const [shareModal, setShareModal] = useState<{ url: string; title: string } | null>(
    shareUrl ? { url: shareUrl, title: shareTitle ?? '' } : null
  )

  // Clear the ?share= query params from the URL once modal is shown
  useEffect(() => {
    if (shareUrl) router.replace('/wishlists')
  }, [shareUrl, router])
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🛍️')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ── Per-list stats ── */
  const statsByList = useMemo(() => {
    const m = new Map<string, { count: number; total: number; savings: number }>()
    for (const r of itemSummary) {
      const s = m.get(r.wishlist_id) ?? { count: 0, total: 0, savings: 0 }
      s.count++
      if (r.purchased) s.savings += itemPrice(r)
      else s.total += itemPrice(r)
      m.set(r.wishlist_id, s)
    }
    return m
  }, [itemSummary])

  const { taxEnabled, taxRate } = useTheme()

  /* ── Global totals (raw, pre-tax) ── */
  const totalValue   = useMemo(() => [...statsByList.values()].reduce((s, v) => s + v.total, 0), [statsByList])
  const totalSavings = useMemo(() => [...statsByList.values()].reduce((s, v) => s + v.savings, 0), [statsByList])

  const active   = wishlists.filter(w => !w.archived)
  const archived = wishlists.filter(w => w.archived)

  const displayActive = active.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.description?.toLowerCase().includes(search.toLowerCase())
  )
  const displayArchived = archived.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase())
  )

  /* ── Mutations ── */
  async function createWishlist(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in.'); setLoading(false); return }
    const { data, error } = await supabase.from('wishlists')
      .insert({ name: name.trim(), description: description.trim() || null, user_id: user.id, emoji })
      .select().single()
    if (error) { setError(error.message); setLoading(false) }
    else { setWishlists([data as Wishlist, ...wishlists]); setName(''); setDescription(''); setEmoji('🛍️'); setShowForm(false); setLoading(false) }
  }

  async function updateWishlist(id: string, patch: Partial<Wishlist>) {
    const supabase = createClient()
    await supabase.from('wishlists').update(patch).eq('id', id)
    setWishlists(wishlists.map(w => w.id === id ? { ...w, ...patch } : w))
  }

  async function deleteWishlist(id: string) {
    const supabase = createClient()
    await supabase.from('wishlists').delete().eq('id', id)
    setWishlists(wishlists.filter(w => w.id !== id))
  }

  async function toggleArchive(id: string, current: boolean | null) {
    const archived = !current
    const supabase = createClient()
    await supabase.from('wishlists').update({ archived }).eq('id', id)
    setWishlists(wishlists.map(w => w.id === id ? { ...w, archived } : w))
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Wishlists</h1>
          <p className="text-dim text-sm mt-1">
            {active.length === 0 ? 'Start by creating a list' : `${active.length} list${active.length !== 1 ? 's' : ''}`}
            {archived.length > 0 && ` · ${archived.length} archived`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-sm bg-raised border border-line text-dim hover:text-ink spring">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>
            <span className="hidden sm:block">Import</span>
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm spring" style={{ background:'var(--a600)', color:'var(--a-on)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            New list
          </button>
        </div>
      </div>

      {/* ── Stats banner ── */}
      {(totalValue > 0 || totalSavings > 0) && (
        <div className="flex gap-3 mb-6">
          {totalValue > 0 && (
            <div className="flex-1 bg-card border border-line rounded-2xl px-4 py-3">
              <p className="text-xs text-ghost uppercase tracking-wide mb-0.5">Wish total</p>
              <p className="text-lg font-bold text-ink"><TaxPrice price={totalValue} variant="total" /></p>
            </div>
          )}
          {totalSavings > 0 && (
            <div className="flex-1 rounded-2xl px-4 py-3" style={{ background:'var(--a50)', border:'1px solid var(--a200)' }}>
              <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color:'var(--a500)' }}>You've saved</p>
              <p className="text-lg font-bold" style={{ color:'var(--a600)' }}><TaxPrice price={totalSavings} variant="total" /></p>
            </div>
          )}
        </div>
      )}

      {/* ── Search ── */}
      {wishlists.length > 1 && (
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your lists…" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-card text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors text-sm" style={RING} />
        </div>
      )}

      {/* ── Create form ── */}
      {showForm && (
        <div className="mb-6 bg-card border border-line rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-ink mb-4">Create a new list</h2>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          <form onSubmit={createWishlist} className="space-y-4">
            {/* Emoji picker */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Pick an icon</label>
              <EmojiPicker value={emoji} onChange={setEmoji} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">List name <span className="text-red-400">*</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Birthday wishlist, Gaming gear…" className={INPUT} style={RING} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Description <span className="text-ghost font-normal">(optional)</span></label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this list for?" className={INPUT} style={RING} />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setError(null) }} className="px-4 py-2 text-sm text-dim hover:text-ink rounded-lg hover:bg-raised spring">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg spring disabled:opacity-40" style={{ background:'var(--a600)', color:'var(--a-on)' }}>{loading ? 'Creating…' : 'Create list'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Empty state ── */}
      {wishlists.length === 0 && !showForm && (
        <div className="text-center py-24 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl" style={{ background:'var(--a50)' }}>🛍️</div>
          <h3 className="text-lg font-semibold text-ink mb-2">No wishlists yet</h3>
          <p className="text-dim text-sm mb-6">Create your first list to start tracking what you want.</p>
          <button onClick={() => setShowForm(true)} className="px-5 py-2.5 rounded-xl font-medium text-sm spring" style={{ background:'var(--a600)', color:'var(--a-on)' }}>Create your first list</button>
        </div>
      )}

      {/* ── Active lists ── */}
      {displayActive.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayActive.map(list => <ListCard key={list.id} list={list} stats={statsByList.get(list.id)} onEdit={setEditingList} onDelete={deleteWishlist} onArchive={toggleArchive} />)}
        </div>
      )}

      {/* ── Search empty ── */}
      {search && displayActive.length === 0 && displayArchived.length === 0 && (
        <div className="text-center py-16 text-dim text-sm">No lists match "{search}"</div>
      )}

      {/* ── Archived section ── */}
      {archived.length > 0 && (
        <div className="mt-10">
          <button onClick={() => setShowArchived(p => !p)} className="flex items-center gap-2 text-sm font-medium text-dim hover:text-ink spring mb-4">
            <span className={`transition-transform ${showArchived ? 'rotate-90' : ''}`}>▶</span>
            Archived lists ({archived.length})
          </button>
          {showArchived && displayArchived.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
              {displayArchived.map(list => <ListCard key={list.id} list={list} stats={statsByList.get(list.id)} onEdit={setEditingList} onDelete={deleteWishlist} onArchive={toggleArchive} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Edit list modal ── */}
      {editingList && (
        <EditListModal
          list={editingList}
          onSave={async patch => { await updateWishlist(editingList.id, patch); setEditingList(null) }}
          onClose={() => setEditingList(null)}
        />
      )}

      {/* ── Share target modal ── */}
      {shareModal && (
        <ShareModal
          sharedUrl={shareModal.url}
          sharedTitle={shareModal.title}
          lists={wishlists.filter(w => !w.archived)}
          onClose={() => setShareModal(null)}
        />
      )}

      {/* ── Import modal ── */}
      {showImport && (
        <ImportModal
          existingLists={wishlists.map(w => ({ id: w.id, name: w.name, emoji: w.emoji }))}
          onClose={() => setShowImport(false)}
          onImported={(newLists, added, updated) => {
            setShowImport(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

/* ─── List card ────────────────────────────────────────────── */
function ListCard({ list, stats, onEdit, onDelete, onArchive }: {
  list: Wishlist
  stats?: { count: number; total: number; savings: number }
  onEdit: (list: Wishlist) => void
  onDelete: (id: string) => void
  onArchive: (id: string, current: boolean | null) => void
}) {

  return (
    <TiltCard className="group relative bg-card border border-line rounded-2xl p-5 hover:border-[var(--a200)] transition-colors">
      {/* Actions (on hover) */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(list)} title="Edit list"
          className="p-1.5 rounded-lg text-ghost hover:text-ink hover:bg-raised spring">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
        <button onClick={() => onArchive(list.id, list.archived)} title={list.archived ? 'Unarchive' : 'Archive'}
          className="p-1.5 rounded-lg text-ghost hover:text-ink hover:bg-raised spring">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {list.archived
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"/>}
          </svg>
        </button>
        <button onClick={() => onDelete(list.id)} title="Delete" className="p-1.5 rounded-lg text-ghost hover:text-red-400 hover:bg-red-500/10 spring">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <Link href={`/wishlists/${list.id}`} className="block">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl text-2xl shrink-0" style={{ background:'var(--a50)' }}>
            {list.emoji ?? '🛍️'}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-ink truncate group-hover:text-[var(--a500)] transition-colors">{list.name}</h3>
            {list.description && <p className="text-dim text-xs truncate mt-0.5">{list.description}</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-ghost">
          <span>{stats?.count ?? 0} item{(stats?.count ?? 0) !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            {(stats?.savings ?? 0) > 0 && <span className="font-medium" style={{ color:'var(--a500)' }}>✓ <TaxPrice price={stats!.savings} variant="row" /></span>}
            {(stats?.total ?? 0) > 0 && <TaxPrice price={stats!.total} variant="row" className="font-semibold text-ink" />}
          </div>
        </div>
      </Link>
    </TiltCard>
  )
}

/* ─── Share target modal ────────────────────────────────────── */
function ShareModal({ sharedUrl, sharedTitle, lists, onClose }: {
  sharedUrl: string; sharedTitle: string; lists: Wishlist[]; onClose: () => void
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(lists[0]?.id ?? null)
  const [loading, setLoading] = useState(false)

  async function addToList() {
    if (!selected) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('wishlist_items').insert({
      wishlist_id: selected,
      name: sharedTitle || sharedUrl,
      url: sharedUrl || null,
    })
    onClose()
    router.push(`/wishlists/${selected}`)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <h2 className="font-semibold text-ink mb-1">Add to Wishlist</h2>
        <p className="text-dim text-xs mb-3 truncate">{sharedTitle || sharedUrl}</p>
        <p className="text-sm font-medium text-ink mb-2">Choose a list:</p>
        {lists.length === 0
          ? <p className="text-ghost text-sm mb-4">Create a list first.</p>
          : <div className="space-y-1.5 mb-4 max-h-52 overflow-y-auto">
              {lists.map(l => (
                <button key={l.id} onClick={() => setSelected(l.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium spring text-left ${selected===l.id ? 'text-[var(--a-on)]' : 'bg-raised text-ink hover:bg-line'}`}
                  style={selected===l.id ? { background:'var(--a600)' } : {}}>
                  <span>{l.emoji ?? '🛍️'}</span>{l.name}
                </button>
              ))}
            </div>
        }
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-dim hover:text-ink rounded-xl hover:bg-raised spring">Cancel</button>
          <button onClick={addToList} disabled={!selected || loading} className="flex-1 py-2.5 text-sm rounded-xl spring disabled:opacity-40" style={{ background:'var(--a600)', color:'var(--a-on)' }}>
            {loading ? 'Adding…' : 'Add item'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Edit list modal ───────────────────────────────────────── */
function EditListModal({ list, onSave, onClose }: {
  list: Wishlist
  onSave: (patch: Partial<Wishlist>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description ?? '')
  const [emoji, setEmoji] = useState(list.emoji ?? '🛍️')
  const [loading, setLoading] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSave({ name: name.trim(), description: description.trim() || null, emoji })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-ink">Edit list</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ghost hover:text-ink hover:bg-raised spring">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          {/* Emoji picker */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Icon</label>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">List name <span className="text-red-400">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus
              className={INPUT} style={RING} />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Description <span className="text-ghost font-normal">(optional)</span></label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this list for?" className={INPUT} style={RING} />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-dim hover:text-ink rounded-lg hover:bg-raised spring">Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} className="px-4 py-2 text-sm rounded-lg spring disabled:opacity-40" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
