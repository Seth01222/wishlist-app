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
import { INPUT_CLASS as INPUT, RING_STYLE as RING } from '@/lib/ui'
import { ACCENTS } from '@/lib/theme'
import CollectionModal from '@/components/collections/CollectionModal'
import CollectionSwitcher from '@/components/collections/CollectionSwitcher'

type Wishlist = { id: string; name: string; description: string | null; created_at: string; emoji: string | null; archived: boolean | null; collection_id?: string | null; sort_order?: number }
type Collection = { id: string; name: string; emoji: string | null; description: string | null; color: string | null; sort_order: number }
type ItemSummaryRow = { wishlist_id: string; purchased: boolean | null; auto_price: number | null; target_price: number | null; quantity: number | null }
// Raw shape produced by the extension's extract-batch.js (one row per cart/wishlist line item).
type BatchSourceItem = { title: string | null; price: string | null; currency: string; image: string | null; url: string; quantity?: number }

const accentHex = (id: string | null | undefined) => ACCENTS.find(a => a.id === id)?.hex ?? 'var(--a600)'
const SELECTED_KEY = 'wl-collection'

const fmt     = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtFull = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

function itemPrice(r: ItemSummaryRow) { return Number(r.auto_price ?? r.target_price ?? 0) * (r.quantity ?? 1) }

export default function WishlistsClient({ initialWishlists, itemSummary, initialCollections = [], shareUrl, shareTitle, sharePrice, shareImage, shareCurrency }: { initialWishlists: Wishlist[]; itemSummary: ItemSummaryRow[]; initialCollections?: Collection[]; shareUrl?: string; shareTitle?: string; sharePrice?: string; shareImage?: string; shareCurrency?: string }) {
  const [wishlists, setWishlists] = useState(initialWishlists)
  const [collections, setCollections] = useState(initialCollections)
  const [selectedCol, setSelectedCol] = useState<string | 'all'>('all')
  const [showCollectionForm, setShowCollectionForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingList, setEditingList] = useState<Wishlist | null>(null)
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null)

  // Remember the last selected master list across visits.
  useEffect(() => {
    const saved = localStorage.getItem(SELECTED_KEY)
    if (saved && (saved === 'all' || initialCollections.some(c => c.id === saved))) setSelectedCol(saved)
  }, [initialCollections])
  function selectCollection(id: string | 'all') {
    setSelectedCol(id)
    try { localStorage.setItem(SELECTED_KEY, id) } catch { /* ignore */ }
  }
  const [shareModal, setShareModal] = useState<{ url: string; title: string; price?: string; image?: string; currency?: string } | null>(
    shareUrl ? { url: shareUrl, title: shareTitle ?? '', price: sharePrice, image: shareImage, currency: shareCurrency } : null
  )
  const [batchItems, setBatchItems] = useState<BatchSourceItem[] | null>(null)

  // The extension's batch mode (Amazon cart/wishlist pages) lands here as
  // #batch=<json> — a URL fragment, so the payload never touches the server
  // and isn't limited by URL length the way ?share= would be. Because the
  // server never sees the fragment, it MUST be read after hydration (in an
  // effect) — reading it during render would make the client's first render
  // disagree with the server's null render and trip a hydration mismatch.
  // (Same client-only-state pattern as the localStorage read above.)
  useEffect(() => {
    if (!window.location.hash.startsWith('#batch=')) return
    try {
      const items = JSON.parse(decodeURIComponent(window.location.hash.slice('#batch='.length)))
      if (Array.isArray(items) && items.length > 0) setBatchItems(items)
    } catch { /* malformed payload — ignore */ }
    window.history.replaceState(null, '', '/wishlists')
  }, [])

  // Clean up the ?share= param from the address bar without triggering a Next.js
  // navigation (router.replace would re-render the server component and wipe
  // shareModal state). The #batch= fragment is cleaned up in the effect above.
  useEffect(() => {
    if (shareUrl) window.history.replaceState(null, '', '/wishlists')
  }, [shareUrl])
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

  const inCollection = (w: Wishlist) => selectedCol === 'all' || (w.collection_id ?? null) === selectedCol
  const scoped   = wishlists.filter(inCollection)
  const active   = scoped.filter(w => !w.archived)
  const archived = scoped.filter(w => w.archived)

  /* ── Scoped totals (filtered to the active collection) ── */
  const scopedIds = new Set(scoped.map(w => w.id))
  const scopedValue   = [...statsByList.entries()].reduce((s, [id, v]) => scopedIds.has(id) ? s + v.total   : s, 0)
  const scopedSavings = [...statsByList.entries()].reduce((s, [id, v]) => scopedIds.has(id) ? s + v.savings : s, 0)
  const taxMult = taxEnabled && taxRate > 0 ? 1 + taxRate / 100 : 1
  // Count lists per collection for the switcher badges.
  const countByCol = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of wishlists) if (!w.archived) m.set(w.collection_id ?? '', (m.get(w.collection_id ?? '') ?? 0) + 1)
    return m
  }, [wishlists])

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
      .insert({ name: name.trim(), description: description.trim() || null, user_id: user.id, emoji, collection_id: selectedCol === 'all' ? null : selectedCol })
      .select().single()
    if (error) { setError(error.message); setLoading(false) }
    else { setWishlists([data as Wishlist, ...wishlists]); setName(''); setDescription(''); setEmoji('🛍️'); setShowForm(false); setLoading(false) }
  }

  /* ── Collection (master list) mutations ── */
  async function createCollection(patch: { name: string; emoji: string; description: string | null; color: string }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('collections')
      .insert({ ...patch, user_id: user.id, sort_order: collections.length })
      .select().single()
    if (data) { setCollections([...collections, data as Collection]); selectCollection((data as Collection).id) }
    setShowCollectionForm(false)
  }
  async function updateCollection(id: string, patch: Partial<Collection>) {
    const supabase = createClient()
    await supabase.from('collections').update(patch).eq('id', id)
    setCollections(collections.map(c => c.id === id ? { ...c, ...patch } : c))
    setEditingCollection(null)
  }
  async function deleteCollection(id: string) {
    const supabase = createClient()
    await supabase.from('collections').delete().eq('id', id)
    setCollections(collections.filter(c => c.id !== id))
    setWishlists(wishlists.map(w => w.collection_id === id ? { ...w, collection_id: null } : w))
    if (selectedCol === id) selectCollection('all')
    setEditingCollection(null)
    setDeletingCollection(null)
  }

  // Create a category on the fly (used by the quick-add modal). Returns the new
  // list so the caller can immediately select it.
  async function createCategory(name: string, collectionId: string | null): Promise<Wishlist | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('wishlists')
      .insert({ name: name.trim(), user_id: user.id, emoji: '🛍️', collection_id: collectionId })
      .select().single()
    if (!data) return null
    setWishlists(prev => [data as Wishlist, ...prev])
    return data as Wishlist
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

  const activeCollection = collections.find(c => c.id === selectedCol) ?? null

  return (
    <div>
      {/* ── Master-list switcher ── */}
      <CollectionSwitcher
        collections={collections}
        selected={selectedCol}
        counts={countByCol}
        onSelect={selectCollection}
        onAdd={() => setShowCollectionForm(true)}
        onEdit={c => setEditingCollection(c)}
      />

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            {activeCollection ? <>{activeCollection.emoji} {activeCollection.name}</> : 'All wishlists'}
          </h1>
          <p className="text-dim text-sm mt-1">
            {activeCollection?.description ? `${activeCollection.description} · ` : ''}
            {active.length === 0 ? 'Start by creating a category' : `${active.length} categor${active.length !== 1 ? 'ies' : 'y'}`}
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
      {(scopedValue > 0 || scopedSavings > 0) && (
        <div className="flex gap-3 mb-6">
          {scopedValue > 0 && (
            <div className="flex-1 bg-card border border-line rounded-2xl px-4 py-3">
              <p className="text-xs text-ghost uppercase tracking-wide mb-0.5">
                {selectedCol === 'all' ? 'Wish total' : `${activeCollection?.name ?? 'List'} total`}
              </p>
              <p className="text-lg font-bold text-ink">
                {taxEnabled && taxRate > 0 ? fmtFull(scopedValue * taxMult) : fmt(scopedValue)}
              </p>
              {taxEnabled && taxRate > 0 && (
                <p className="text-xs text-ghost mt-0.5">{fmt(scopedValue)} before tax</p>
              )}
            </div>
          )}
          {scopedSavings > 0 && (
            <div className="flex-1 rounded-2xl px-4 py-3" style={{ background:'var(--a50)', border:'1px solid var(--a200)' }}>
              <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color:'var(--a500)' }}>You've saved</p>
              <p className="text-lg font-bold" style={{ color:'var(--a600)' }}>
                {taxEnabled && taxRate > 0 ? fmtFull(scopedSavings * taxMult) : fmt(scopedSavings)}
              </p>
              {taxEnabled && taxRate > 0 && (
                <p className="text-xs mt-0.5" style={{ color:'var(--a400)' }}>{fmt(scopedSavings)} before tax</p>
              )}
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
          collections={collections}
          onSave={async patch => { await updateWishlist(editingList.id, patch); setEditingList(null) }}
          onClose={() => setEditingList(null)}
        />
      )}

      {/* ── Master-list (collection) modal ── */}
      {(showCollectionForm || editingCollection) && (
        <CollectionModal
          collection={editingCollection}
          onSave={patch => editingCollection ? updateCollection(editingCollection.id, patch) : createCollection(patch)}
          onDelete={() => setDeletingCollection(editingCollection)}
          onClose={() => { setShowCollectionForm(false); setEditingCollection(null) }}
        />
      )}

      {/* ── Share target modal ── */}
      {shareModal && (
        <ShareModal
          sharedUrl={shareModal.url}
          sharedTitle={shareModal.title}
          sharedPrice={shareModal.price}
          sharedImage={shareModal.image}
          sharedCurrency={shareModal.currency}
          lists={wishlists.filter(w => !w.archived)}
          collections={collections}
          onCreateCategory={createCategory}
          onClose={() => setShareModal(null)}
        />
      )}

      {/* ── Batch review (extension cart/wishlist import) ── */}
      {batchItems && (
        <BatchReviewModal
          items={batchItems}
          lists={wishlists.filter(w => !w.archived)}
          onClose={() => setBatchItems(null)}
        />
      )}

      {/* ── Delete master list confirm ── */}
      {deletingCollection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-ink mb-2">Delete "{deletingCollection.name}"?</h2>
            <p className="text-dim text-sm mb-5">Its categories will move to Unsorted — nothing will be deleted from them.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeletingCollection(null)} className="px-4 py-2 text-sm text-dim hover:text-ink rounded-lg hover:bg-raised spring">Cancel</button>
              <button onClick={() => deleteCollection(deletingCollection.id)} className="px-4 py-2 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 spring">Delete</button>
            </div>
          </div>
        </div>
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
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 touch:opacity-100 transition-opacity">
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
function ShareModal({ sharedUrl, sharedTitle, sharedPrice, sharedImage, sharedCurrency, lists, collections, onCreateCategory, onClose }: {
  sharedUrl: string; sharedTitle: string; sharedPrice?: string; sharedImage?: string; sharedCurrency?: string
  lists: Wishlist[]; collections: Collection[]
  onCreateCategory: (name: string, collectionId: string | null) => Promise<Wishlist | null>
  onClose: () => void
}) {
  const router = useRouter()
  const defaultCol = collections.length > 0 ? collections[collections.length - 1].id : 'all'
  const [colFilter, setColFilter] = useState<string | 'all'>(defaultCol)
  const [selected, setSelected] = useState<string | null>(() => {
    const first = lists.find(l => defaultCol === 'all' || (l.collection_id ?? 'none') === defaultCol)
    return first?.id ?? lists[0]?.id ?? null
  })
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [creatingLoad, setCreatingLoad] = useState(false)

  // Which master list a newly-created category lands in (null = Unsorted).
  const targetCol = colFilter !== 'all' && colFilter !== 'none' ? colFilter : null

  async function createCategory() {
    if (!newName.trim()) return
    setCreatingLoad(true)
    const created = await onCreateCategory(newName.trim(), targetCol)
    setCreatingLoad(false)
    if (created) {
      setColFilter(created.collection_id ?? 'none')
      setSelected(created.id)
      setCreating(false)
      setNewName('')
    }
  }

  // Show all collections so the user can filter and create categories under any master list.
  const usedCollections = collections
  const hasUnsorted = lists.some(l => !l.collection_id)
  const shownLists = lists
    .filter(l => colFilter === 'all' || (l.collection_id ?? 'none') === colFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const colName = (id: string | null | undefined) => collections.find(c => c.id === id)?.name ?? null

  function pickCol(id: string | 'all') {
    setColFilter(id)
    if (id === 'all') { setCreating(false); setNewName('') }
    const first = lists.find(l => id === 'all' || (l.collection_id ?? 'none') === id)
    setSelected(first?.id ?? null)
  }

  const priceNum = sharedPrice ? parseFloat(sharedPrice) : null

  async function addToList() {
    if (!selected) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('wishlist_items').insert({
      wishlist_id: selected,
      name: sharedTitle || sharedUrl,
      url: sharedUrl || null,
      image_url: sharedImage || null,
      auto_price: priceNum != null && !isNaN(priceNum) ? priceNum : null,
      auto_currency: priceNum != null && !isNaN(priceNum) ? (sharedCurrency || 'USD') : null,
    })
    onClose()
    router.push(`/wishlists/${selected}`)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <h2 className="font-semibold text-ink mb-3">Add to Wishlist</h2>
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-raised">
          {sharedImage
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={sharedImage} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-card" />
            : <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-xl bg-card">🛍️</div>}
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink line-clamp-2">{sharedTitle || sharedUrl}</p>
            {priceNum != null && !isNaN(priceNum) && (
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--a500)' }}>
                {priceNum.toLocaleString('en-US', { style: 'currency', currency: sharedCurrency || 'USD' })}
              </p>
            )}
          </div>
        </div>
        {/* Master-list filter */}
        {usedCollections.length > 0 && (
          <>
            <p className="text-sm font-medium text-ink mb-1.5">Master list:</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button onClick={() => pickCol('all')} className={`px-2.5 py-1 text-xs rounded-full border spring ${colFilter==='all' ? 'text-[var(--a-on)] border-transparent' : 'border-line bg-raised text-dim hover:text-ink'}`} style={colFilter==='all' ? { background:'var(--a600)' } : {}}>✨ All</button>
              {usedCollections.map(c => (
                <button key={c.id} onClick={() => pickCol(c.id)} className={`px-2.5 py-1 text-xs rounded-full border spring ${colFilter===c.id ? 'text-white border-transparent' : 'border-line bg-raised text-dim hover:text-ink'}`} style={colFilter===c.id ? { background: accentHex(c.color) } : {}}>{c.emoji ?? '📂'} {c.name}</button>
              ))}
              {hasUnsorted && (
                <button onClick={() => pickCol('none')} className={`px-2.5 py-1 text-xs rounded-full border spring ${colFilter==='none' ? 'text-[var(--a-on)] border-transparent' : 'border-line bg-raised text-dim hover:text-ink'}`} style={colFilter==='none' ? { background:'var(--a600)' } : {}}>📥 Unsorted</button>
              )}
            </div>
          </>
        )}

        <p className="text-sm font-medium text-ink mb-2">Choose a category:</p>
        {shownLists.length === 0
          ? <p className="text-ghost text-sm mb-4">No categories here yet.</p>
          : <div className="space-y-1.5 mb-4 max-h-52 overflow-y-auto">
              {shownLists.map(l => (
                <button key={l.id} onClick={() => setSelected(l.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium spring text-left ${selected===l.id ? 'text-[var(--a-on)]' : 'bg-raised text-ink hover:bg-line'}`}
                  style={selected===l.id ? { background:'var(--a600)' } : {}}>
                  <span>{l.emoji ?? '🛍️'}</span>
                  <span className="flex-1 min-w-0 truncate">{l.name}</span>
                  {colFilter === 'all' && colName(l.collection_id) && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${selected===l.id ? 'bg-white/25' : 'bg-card text-ghost'}`}>{colName(l.collection_id)}</span>
                  )}
                </button>
              ))}
            </div>
        }
        {/* New category — hidden when "All" is selected since we don't know which master list to assign */}
        {colFilter !== 'all' && (creating ? (
          <div className="mb-4 p-3 rounded-xl border border-line bg-raised">
            <p className="text-xs text-dim mb-1.5">
              New category{targetCol ? <> in <span className="font-medium text-ink">{collections.find(c => c.id === targetCol)?.name}</span></> : ' (Unsorted)'}
            </p>
            <div className="flex gap-2">
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createCategory()}
                placeholder="Category name…" className={INPUT} style={RING} />
              <button onClick={createCategory} disabled={!newName.trim() || creatingLoad} className="px-3 rounded-lg text-sm font-medium spring disabled:opacity-40 shrink-0" style={{ background:'var(--a600)', color:'var(--a-on)' }}>
                {creatingLoad ? '…' : 'Create'}
              </button>
            </div>
            <button onClick={() => { setCreating(false); setNewName('') }} className="text-xs text-ghost hover:text-dim mt-1.5 spring">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="w-full mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-dashed border-line text-dim hover:text-ink spring">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            New category{targetCol ? ` in ${collections.find(c => c.id === targetCol)?.name}` : ''}
          </button>
        ))}

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

/* ─── Batch review modal (extension cart/wishlist import) ─────── */
type ListOption = { id: string; name: string; emoji: string | null }
type BatchRow = {
  title: string
  url: string
  image: string | null
  price: string
  currency: string
  quantity: number
  listId: string
}

function BatchReviewModal({ items, lists, onClose }: {
  items: BatchSourceItem[]
  lists: ListOption[]
  onClose: () => void
}) {
  const [availableLists, setAvailableLists] = useState<ListOption[]>(lists)
  const [rows, setRows] = useState<BatchRow[]>(() => items.map(it => ({
    title: it.title || it.url,
    url: it.url,
    image: it.image,
    price: it.price ?? '',
    currency: it.currency || 'USD',
    quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
    listId: lists[0]?.id ?? '',
  })))
  const [selected, setSelected] = useState<Set<number>>(new Set(items.map((_, i) => i)))
  // Rows the user has skipped: hidden from the review and excluded from import,
  // but kept in `rows` (by index) so "undo" can bring them back.
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const [bulkListId, setBulkListId] = useState<string>(lists[0]?.id ?? '')
  const [creatingList, setCreatingList] = useState(availableLists.length === 0)
  const [newListName, setNewListName] = useState('')
  const [creatingLoad, setCreatingLoad] = useState(false)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ added: number; updated: number } | null>(null)

  function updateRow(i: number, patch: Partial<BatchRow>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  function toggleAll(on: boolean) {
    // Only affects rows that are still visible (not skipped).
    setSelected(on ? new Set(rows.map((_, i) => i).filter(i => !skipped.has(i))) : new Set())
  }
  function toggleOne(i: number) {
    setSelected(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })
  }
  function skipOne(i: number) {
    setSkipped(prev => new Set(prev).add(i))
    setSelected(prev => { const next = new Set(prev); next.delete(i); return next })
  }
  function unskipAll() {
    setSelected(prev => { const next = new Set(prev); skipped.forEach(i => next.add(i)); return next })
    setSkipped(new Set())
  }
  function applyBulkList() {
    if (!bulkListId) return
    setRows(prev => prev.map((r, i) => selected.has(i) ? { ...r, listId: bulkListId } : r))
  }

  async function createListAndAssign() {
    if (!newListName.trim()) return
    setCreatingLoad(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreatingLoad(false); return }
    const { data } = await supabase.from('wishlists')
      .insert({ name: newListName.trim(), user_id: user.id, emoji: '🛍️' })
      .select('id, name, emoji').single()
    setCreatingLoad(false)
    if (!data) return
    const created = data as ListOption
    setAvailableLists(prev => [...prev, created])
    setBulkListId(created.id)
    setRows(prev => prev.map((r, i) => (selected.has(i) || !r.listId) ? { ...r, listId: created.id } : r))
    setNewListName('')
    setCreatingList(false)
  }

  async function doImport() {
    const toImport = rows.filter((r, i) => !skipped.has(i) && selected.has(i) && r.listId && r.title.trim())
    if (toImport.length === 0) return
    setImporting(true)
    const supabase = createClient()

    const targetListIds = [...new Set(toImport.map(r => r.listId))]
    const { data: existingItems } = await supabase
      .from('wishlist_items')
      .select('id, name, wishlist_id')
      .in('wishlist_id', targetListIds)
    const existingMap = new Map<string, string>()
    for (const row of existingItems ?? []) existingMap.set(`${row.wishlist_id}::${row.name.toLowerCase()}`, row.id)

    const prepared = toImport.map(r => {
      const priceNum = r.price ? parseFloat(r.price) : null
      const hasPrice = priceNum != null && !isNaN(priceNum)
      return {
        listId: r.listId,
        key: `${r.listId}::${r.title.trim().toLowerCase()}`,
        patch: {
          name: r.title.trim(),
          url: r.url || null,
          image_url: r.image || null,
          auto_price: hasPrice ? priceNum : null,
          auto_currency: hasPrice ? r.currency : null,
          quantity: r.quantity > 0 ? r.quantity : 1,
        },
      }
    })

    const toInsert = prepared.filter(p => !existingMap.has(p.key))
    const toUpdate = prepared.filter(p => existingMap.has(p.key)).map(p => ({ id: existingMap.get(p.key)!, patch: p.patch }))

    if (toInsert.length > 0) {
      await supabase.from('wishlist_items').insert(toInsert.map(p => ({ wishlist_id: p.listId, ...p.patch })))
    }
    await Promise.all(toUpdate.map(({ id, patch }) => supabase.from('wishlist_items').update(patch).eq('id', id)))

    setImporting(false)
    setDone({ added: toInsert.length, updated: toUpdate.length })
  }

  const selectedCount = selected.size

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">🛒</span>
            <div>
              <h2 className="font-semibold text-ink">Add {items.length} item{items.length !== 1 ? 's' : ''} from cart</h2>
              <p className="text-xs text-ghost mt-0.5">Pulled straight from the page — review, edit, and pick a list for each.</p>
            </div>
          </div>
          {!done && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-ghost hover:text-ink hover:bg-raised spring">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {done ? (
          <div className="p-6 text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl mb-4" style={{ background: 'var(--a50)' }}>✅</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Import complete!</h3>
            <div className="flex items-center justify-center gap-3 mt-2 mb-1">
              {done.added > 0 && <span className="text-sm px-3 py-1 rounded-full text-[var(--a-on)]" style={{ background: 'var(--a600)' }}>+{done.added} new</span>}
              {done.updated > 0 && <span className="text-sm px-3 py-1 rounded-full bg-raised text-ink border border-line">↻ {done.updated} updated</span>}
            </div>
            <button onClick={() => window.location.reload()} className="mt-6 w-full max-w-xs mx-auto block py-2.5 text-sm rounded-xl spring" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 border-b border-line shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-dim">
                  <span className="font-medium text-ink">{selectedCount}</span> of {rows.length - skipped.size} selected
                  {skipped.size > 0 && (
                    <span className="text-ghost"> · {skipped.size} skipped <button onClick={unskipAll} className="underline hover:text-ink spring" style={{ color: 'var(--a500)' }}>undo</button></span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(true)} className="text-xs text-dim hover:text-ink spring">Select all</button>
                  <span className="text-ghost">·</span>
                  <button onClick={() => toggleAll(false)} className="text-xs text-dim hover:text-ink spring">None</button>
                </div>
              </div>

              {/* Bulk list assignment — the efficient path instead of picking per item */}
              <div className="flex items-center gap-2 flex-wrap">
                {!creatingList ? (
                  <>
                    <select value={bulkListId} onChange={e => setBulkListId(e.target.value)} className={`${INPUT} !py-1.5 !w-auto flex-1 min-w-[9rem]`} style={RING}>
                      {availableLists.length === 0 && <option value="">No lists yet</option>}
                      {availableLists.map(l => <option key={l.id} value={l.id}>{l.emoji ?? '🛍️'} {l.name}</option>)}
                    </select>
                    <button onClick={applyBulkList} disabled={!bulkListId || selectedCount === 0} className="px-3 py-1.5 rounded-lg text-xs font-medium spring disabled:opacity-40 shrink-0" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
                      Apply to selected
                    </button>
                    <button onClick={() => setCreatingList(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-line text-dim hover:text-ink spring shrink-0">
                      + New list
                    </button>
                  </>
                ) : (
                  <>
                    <input autoFocus value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createListAndAssign()}
                      placeholder="New list name…" className={`${INPUT} !py-1.5 flex-1 min-w-[9rem]`} style={RING} />
                    <button onClick={createListAndAssign} disabled={!newListName.trim() || creatingLoad} className="px-3 py-1.5 rounded-lg text-xs font-medium spring disabled:opacity-40 shrink-0" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
                      {creatingLoad ? '…' : 'Create & assign'}
                    </button>
                    {availableLists.length > 0 && (
                      <button onClick={() => setCreatingList(false)} className="text-xs text-ghost hover:text-dim spring shrink-0">Cancel</button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {rows.map((r, i) => skipped.has(i) ? null : (
                <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${selected.has(i) ? '' : 'opacity-50'}`}
                  style={selected.has(i) ? { background: 'var(--a50)', borderColor: 'var(--a200)' } : { borderColor: 'var(--line)', background: 'var(--raised)' }}>
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggleOne(i)} className="mt-2.5 shrink-0 accent-[var(--a600)]" />

                  <div className="w-10 h-10 shrink-0 rounded-lg bg-card border border-line overflow-hidden flex items-center justify-center mt-0.5">
                    {r.image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={r.image} alt="" className="w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <span className="text-ghost text-lg">?</span>}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input value={r.title} onChange={e => updateRow(i, { title: e.target.value })} placeholder="Item name"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-card text-ink text-sm focus:outline-none focus:ring-2 focus:border-transparent" style={RING} />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-ghost">$</span>
                        <input value={r.price} onChange={e => updateRow(i, { price: e.target.value })} placeholder="0.00" inputMode="decimal"
                          className="w-16 px-1.5 py-1 rounded-lg border border-line bg-card text-ink text-xs focus:outline-none focus:ring-2 focus:border-transparent" style={RING} />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-ghost">×</span>
                        <input type="number" min={1} value={r.quantity} onChange={e => updateRow(i, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          className="w-12 px-1.5 py-1 rounded-lg border border-line bg-card text-ink text-xs focus:outline-none focus:ring-2 focus:border-transparent" style={RING} />
                      </div>
                      <select value={r.listId} onChange={e => updateRow(i, { listId: e.target.value })}
                        className="flex-1 min-w-[7rem] px-2 py-1 rounded-lg border border-line bg-card text-ink text-xs focus:outline-none focus:ring-2 focus:border-transparent" style={RING}>
                        {availableLists.length === 0 && <option value="">No lists yet</option>}
                        {availableLists.map(l => <option key={l.id} value={l.id}>{l.emoji ?? '🛍️'} {l.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Skip — drop this pulled item from the review entirely */}
                  <button onClick={() => skipOne(i)} title="Skip this item"
                    className="shrink-0 flex items-center gap-1 px-2 py-1 mt-0.5 rounded-lg text-xs text-ghost hover:text-red-400 hover:bg-red-500/10 spring">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    <span className="hidden sm:inline">Skip</span>
                  </button>
                </div>
              ))}

              {rows.length - skipped.size === 0 && (
                <div className="text-center py-10 text-sm text-dim">
                  All items skipped.{' '}
                  <button onClick={unskipAll} className="underline hover:text-ink spring" style={{ color: 'var(--a500)' }}>Undo</button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-line flex items-center justify-between shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm text-dim hover:text-ink rounded-lg hover:bg-raised spring">Cancel</button>
              <button onClick={doImport} disabled={selectedCount === 0 || importing || availableLists.length === 0} className="px-5 py-2 text-sm rounded-xl spring disabled:opacity-40" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
                {importing ? 'Importing…' : `Import ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Edit list modal ───────────────────────────────────────── */
function EditListModal({ list, collections, onSave, onClose }: {
  list: Wishlist
  collections: Collection[]
  onSave: (patch: Partial<Wishlist>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description ?? '')
  const [emoji, setEmoji] = useState(list.emoji ?? '🛍️')
  const [collectionId, setCollectionId] = useState<string>(list.collection_id ?? '')
  const [loading, setLoading] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSave({ name: name.trim(), description: description.trim() || null, emoji, collection_id: collectionId || null })
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

          {collections.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Master list</label>
              <select value={collectionId} onChange={e => setCollectionId(e.target.value)} className={INPUT} style={RING}>
                <option value="">Unsorted</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.emoji ?? '📂'} {c.name}</option>)}
              </select>
            </div>
          )}

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
