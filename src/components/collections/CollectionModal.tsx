'use client'

import { useState } from 'react'
import EmojiPicker from '@/components/EmojiPicker'
import { ACCENTS } from '@/lib/theme'
import { INPUT_CLASS as INPUT, RING_STYLE as RING } from '@/lib/ui'

type Collection = { id: string; name: string; emoji: string | null; description: string | null; color: string | null; sort_order: number }

// Create / edit a master list. More customizable than a category: emoji, name,
// description, AND a theme color.
export default function CollectionModal({
  collection, onSave, onDelete, onClose,
}: {
  collection?: Collection | null
  onSave: (patch: { name: string; emoji: string; description: string | null; color: string }) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(collection?.name ?? '')
  const [emoji, setEmoji] = useState(collection?.emoji ?? '📂')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [color, setColor] = useState(collection?.color ?? 'indigo')
  const [loading, setLoading] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    onSave({ name: name.trim(), emoji, description: description.trim() || null, color })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-ink">{collection ? 'Edit master list' : 'New master list'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ghost hover:text-ink hover:bg-raised spring">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Icon</label>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="e.g. Personal, Home, Gifts…" className={INPUT} style={RING} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Description <span className="text-ghost font-normal">(optional)</span></label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this master list for?" className={INPUT} style={RING} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map(a => (
                <button key={a.id} type="button" onClick={() => setColor(a.id)} title={a.label}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{ background: a.hex, outline: color === a.id ? `2px solid ${a.hex}` : 'none', outlineOffset: '2px', boxShadow: color === a.id ? '0 0 0 1px var(--line)' : 'none' }} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {collection && onDelete
              ? <button type="button" onClick={() => onDelete(collection.id)} className="text-sm text-rose-500 hover:text-rose-600 spring">Delete</button>
              : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-dim hover:text-ink rounded-lg hover:bg-raised spring">Cancel</button>
              <button type="submit" disabled={loading || !name.trim()} className="px-4 py-2 text-sm rounded-lg spring disabled:opacity-40" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
                {collection ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
