'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

/* ─── Types ────────────────────────────────────────────────── */
type ExistingList = { id: string; name: string; emoji: string | null }

type ImportItem = {
  list: string
  name: string
  url?: string
  image_url?: string
  price?: number
  notes?: string
  tags?: string[]
  star_rating?: number
  quantity?: number
}

type ParseResult =
  | { ok: true; items: ImportItem[] }
  | { ok: false; error: string }

/* ─── The format Claude must return ─────────────────────────── */
const JSON_SCHEMA = `[
  {
    "list": "List name (group similar items together)",
    "name": "Exact product name",
    "url": "Best purchase URL — prefer Amazon or official site",
    "image_url": "Direct product image URL ending in .jpg/.png/.webp",
    "price": 49.99,
    "notes": "One sentence on why it's worth it or a key spec",
    "tags": ["category", "subcategory"],
    "star_rating": 4,
    "quantity": 1
  }
]`

/* ─── Prompt builder ─────────────────────────────────────────── */
function buildPrompt(rawList: string) {
  return `I have a personal wishlist app. I'm going to give you a list of items I want. Work in two phases:

━━━ PHASE 1 — CLARIFICATION ━━━
Before you research anything, scan my list for items that are too vague to find a specific product (e.g. "headphones", "shoes", "knife" with no brand, size, style, or budget).

For each vague item, ask me a short question with 3–4 lettered options to pick from, like this:

  Q1. "headphones" — Which type?
    A) Wireless earbuds (~$30–200, e.g. AirPods, Galaxy Buds)
    B) Over-ear noise-cancelling (~$150–400, e.g. Sony XM5, Bose QC45)
    C) Gaming headset (~$50–200, e.g. HyperX Cloud, SteelSeries Arctis)
    D) Skip this item

  Q2. "shoes" — What style?
    A) Running / athletic
    B) Casual sneakers
    C) Work or dress shoes
    D) Skip this item

Rules for Phase 1:
- Only ask about items that genuinely need it. If a brand, model, or enough detail is already there, research it directly — don't ask.
- Keep each question to one clear decision. Don't ask multiple questions per item.
- If EVERY item is specific enough, skip Phase 1 entirely and go straight to Phase 2.
- After listing your questions, stop and wait for my answers before continuing.

━━━ PHASE 2 — RESEARCH & FORMAT ━━━
Once I've answered (or immediately if no clarification was needed), research each item and return ONLY a raw JSON array — no explanation, no markdown fences, just the JSON:

${JSON_SCHEMA}

Research rules:
- Find the best current price (prefer Amazon, official brand site, or a major retailer)
- Write a one-sentence note on why it's worth buying or a key spec
- Group items into logical list names (e.g. "Gaming Gear", "Kitchen", "Tech", "Clothing")
- Set star_rating 1–5 based on general popularity and reviews
- Set quantity to 1 unless I specified more

━━━ IMAGE URL RULE — READ THIS CAREFULLY ━━━
Brand websites (birkenstock.com, nike.com, abercrombie.com, etc.) block image hotlinking — the app cannot display those images.

Instead, for EVERY item:
1. Find the product listing on Amazon.com (search if needed — almost everything is on Amazon)
2. Copy the image URL from that Amazon listing. Amazon image URLs look like:
   https://m.media-amazon.com/images/I/XXXXXXXXXX._AC_SL1500_.jpg
3. These load everywhere without hotlink protection — use them even if you recommend buying from a different store

Only fall back to a non-Amazon image if the product is genuinely not on Amazon at all (rare). In that case, try to find a press/media kit image or a Wikimedia Commons image. Never use a brand website image URL.

━━━ MY ITEMS ━━━
${rawList.trim()}`
}

/* ─── JSON parser ──────────────────────────────────────────── */
function parseClaudeOutput(raw: string): ParseResult {
  let text = raw.trim()

  // Strip markdown code fences if Claude wrapped the JSON
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

  // Claude often writes narrative before the JSON array.
  // Find the first '[' and the last ']' and extract just that slice.
  const arrayStart = text.indexOf('[')
  const arrayEnd   = text.lastIndexOf(']')
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    text = text.slice(arrayStart, arrayEnd + 1)
  }

  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return { ok: false, error: 'Expected a JSON array at the top level.' }
    const items: ImportItem[] = []
    for (const item of parsed) {
      if (typeof item !== 'object' || !item.name) continue
      items.push({
        list: String(item.list ?? 'My Wishlist').trim(),
        name: String(item.name).trim(),
        url: item.url ? String(item.url) : undefined,
        image_url: item.image_url ? String(item.image_url) : undefined,
        price: item.price != null ? Number(item.price) : undefined,
        notes: item.notes ? String(item.notes) : undefined,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : undefined,
        star_rating: item.star_rating != null ? Math.min(5, Math.max(0, Number(item.star_rating))) : undefined,
        quantity: item.quantity != null ? Math.max(1, Number(item.quantity)) : 1,
      })
    }
    if (items.length === 0) return { ok: false, error: 'Parsed fine but found 0 valid items.' }
    return { ok: true, items }
  } catch (e) {
    return { ok: false, error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/* ─── Main modal ─────────────────────────────────────────────── */
export default function ImportModal({
  existingLists,
  onClose,
  onImported,
}: {
  existingLists: ExistingList[]
  onClose: () => void
  onImported: (newListCount: number, added: number, updated: number) => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [rawList, setRawList] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ImportItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [importResult, setImportResult] = useState<{ added: number; updated: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [fetchingImages, setFetchingImages] = useState(false)
  const [fetchProgress, setFetchProgress] = useState(0)

  const prompt = useMemo(() => buildPrompt(rawList || '(your items go here)'), [rawList])

  function copyPrompt() {
    navigator.clipboard.writeText(buildPrompt(rawList))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => alert('Could not copy — select all and copy manually.'))
  }

  async function handleParse() {
    setParseError(null)
    const result = parseClaudeOutput(jsonInput)
    if (!result.ok) { setParseError(result.error); return }

    // Start with Claude's data, then silently upgrade images in the background
    setParsed(result.items)
    setSelected(new Set(result.items.map((_, i) => i)))
    setStep(3)

    // Auto-fetch real images from each product URL in parallel (batches of 5)
    const itemsWithUrls = result.items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !!item.url)

    if (itemsWithUrls.length === 0) return

    setFetchingImages(true)
    setFetchProgress(0)

    const BATCH = 5
    let done = 0

    for (let b = 0; b < itemsWithUrls.length; b += BATCH) {
      const batch = itemsWithUrls.slice(b, b + BATCH)
      await Promise.all(batch.map(async ({ item, i }) => {
        try {
          const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(item.url!)}`)
          const meta = await res.json()
          // Only upgrade the image if we got something better than what Claude guessed
          if (meta?.image && meta.image.startsWith('http')) {
            setParsed(prev => prev.map((p, idx) =>
              idx === i ? { ...p, image_url: meta.image } : p
            ))
          }
          // Also upgrade price if Claude left it null and we found one
          if (meta?.price && item.price == null) {
            const n = parseFloat(meta.price)
            if (!isNaN(n) && n > 0) {
              setParsed(prev => prev.map((p, idx) =>
                idx === i ? { ...p, price: n } : p
              ))
            }
          }
        } catch { /* silently skip if a URL times out or blocks */ }
        done++
        setFetchProgress(Math.round((done / itemsWithUrls.length) * 100))
      }))
    }

    setFetchingImages(false)
  }

  // Group for preview
  const byList = useMemo(() => {
    const m = new Map<string, { index: number; item: ImportItem }[]>()
    parsed.forEach((item, index) => {
      const arr = m.get(item.list) ?? []
      arr.push({ index, item })
      m.set(item.list, arr)
    })
    return m
  }, [parsed])

  async function doImport() {
    const toImport = parsed.filter((_, i) => selected.has(i))
    if (toImport.length === 0) return
    setImporting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Not logged in.'); setImporting(false); return }

    // Build a name→id map from existing lists (case-insensitive)
    const listMap = new Map<string, string>()
    for (const l of existingLists) listMap.set(l.name.toLowerCase(), l.id)

    // Find lists we need to create
    const neededListNames = [...new Set(toImport.map(i => i.list))]
    let newListCount = 0

    for (const listName of neededListNames) {
      if (!listMap.has(listName.toLowerCase())) {
        const { data } = await supabase
          .from('wishlists')
          .insert({ name: listName, user_id: user.id, emoji: '🛍️' })
          .select('id, name')
          .single()
        if (data) {
          listMap.set(listName.toLowerCase(), data.id)
          newListCount++
        }
      }
    }

    // Fetch existing items for every target list so we can deduplicate by name
    const targetListIds = [...new Set(
      toImport.map(i => listMap.get(i.list.toLowerCase()) ?? existingLists[0]?.id).filter(Boolean)
    )] as string[]

    const { data: existingItems } = await supabase
      .from('wishlist_items')
      .select('id, name, wishlist_id')
      .in('wishlist_id', targetListIds)

    // name (lowercase) + list id → existing item id
    const existingMap = new Map<string, string>()
    for (const row of existingItems ?? []) {
      existingMap.set(`${row.wishlist_id}::${row.name.toLowerCase()}`, row.id)
    }

    const toInsert: typeof toImport = []
    const toUpdate: { id: string; patch: Record<string, unknown> }[] = []

    for (const item of toImport) {
      const listId = listMap.get(item.list.toLowerCase()) ?? existingLists[0]?.id
      const key = `${listId}::${item.name.toLowerCase()}`
      const existingId = existingMap.get(key)

      const row = {
        name: item.name,
        url: item.url ?? null,
        image_url: item.image_url ?? null,
        target_price: item.price ?? null,
        notes: item.notes ?? null,
        tags: item.tags ?? null,
        star_rating: item.star_rating ?? 0,
        quantity: item.quantity ?? 1,
      }

      if (existingId) {
        toUpdate.push({ id: existingId, patch: row })
      } else {
        toInsert.push({ ...item, list: item.list }) // keep for insert below
      }
    }

    // Batch insert new items
    if (toInsert.length > 0) {
      await supabase.from('wishlist_items').insert(
        toInsert.map(item => ({
          wishlist_id: listMap.get(item.list.toLowerCase()) ?? existingLists[0]?.id,
          name: item.name,
          url: item.url ?? null,
          image_url: item.image_url ?? null,
          target_price: item.price ?? null,
          notes: item.notes ?? null,
          tags: item.tags ?? null,
          star_rating: item.star_rating ?? 0,
          quantity: item.quantity ?? 1,
        }))
      )
    }

    // Update existing items one by one (no batch update in Supabase without RPC)
    await Promise.all(toUpdate.map(({ id, patch }) =>
      supabase.from('wishlist_items').update(patch).eq('id', id)
    ))

    setImporting(false)
    setImportDone(true)
    setImportResult({ added: toInsert.length, updated: toUpdate.length })
    onImported(newListCount, toInsert.length, toUpdate.length)
  }

  const selectedCount = selected.size

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-line rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <div>
              <h2 className="font-semibold text-ink">Import from Claude</h2>
              <p className="text-xs text-ghost mt-0.5">
                {step === 1 && 'Step 1 of 3 — Build your prompt'}
                {step === 2 && 'Step 2 of 3 — Paste Claude\'s response'}
                {step === 3 && `Step 3 of 3 — Review ${parsed.length} items`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ghost hover:text-ink hover:bg-raised spring">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex px-6 py-3 gap-2 border-b border-line shrink-0">
          {[1, 2, 3].map(s => (
            <button key={s} onClick={() => { if (s < step || (s === 2 && step === 3)) setStep(s as 1|2|3) }}
              className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s ? '' : 'bg-raised'}`}
              style={step >= s ? { background: 'var(--a500)' } : {}} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Prompt builder ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-ink block mb-1.5">
                  Your raw item list
                  <span className="text-ghost font-normal ml-2">— dump anything here, messy is fine</span>
                </label>
                <textarea
                  value={rawList}
                  onChange={e => setRawList(e.target.value)}
                  rows={6}
                  placeholder={"gaming mouse\nkitchen knife set\nnike air max 90 size 11\nairpods pro 2\nstand mixer\nwacom tablet\n..."}
                  className="w-full px-3.5 py-3 rounded-xl border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent text-sm font-mono resize-none transition-colors"
                  style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
                  autoFocus
                />
                <p className="text-xs text-ghost mt-1">Brand names, sizes, colors, model numbers — anything. Claude figures the rest out.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-ink">Prompt to send to Claude</label>
                  <button onClick={copyPrompt} disabled={!rawList.trim()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg spring disabled:opacity-40" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
                    {copied
                      ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Copied!</>
                      : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy prompt</>
                    }
                  </button>
                </div>
                <pre className="bg-raised border border-line rounded-xl px-4 py-3 text-xs text-dim font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {prompt}
                </pre>
              </div>

              <div className="rounded-xl border border-line overflow-hidden text-sm">
                <div className="px-4 py-2.5 border-b border-line bg-raised">
                  <p className="font-medium text-ink">How this works</p>
                </div>
                <div className="divide-y divide-line">
                  <div className="flex gap-3 px-4 py-3">
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-[var(--a-on)] mt-0.5" style={{ background:'var(--a600)' }}>1</span>
                    <p className="text-dim">Type your items above — brand, size, color, whatever you know. Vague is fine, Claude will ask.</p>
                  </div>
                  <div className="flex gap-3 px-4 py-3">
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-[var(--a-on)] mt-0.5" style={{ background:'var(--a600)' }}>2</span>
                    <p className="text-dim">Copy the prompt → open <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="underline" style={{ color:'var(--a500)' }}>claude.ai</a> → paste and send.</p>
                  </div>
                  <div className="flex gap-3 px-4 py-3 bg-[var(--a50)]">
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-[var(--a-on)] mt-0.5" style={{ background:'var(--a600)' }}>3</span>
                    <p style={{ color:'var(--a700)' }}>
                      <span className="font-semibold">If Claude asks you questions</span> — it will list options like A / B / C / D for anything unclear. Reply with your answers (e.g. "Q1: B, Q2: A, Q3: D"). Claude will then research everything and return the JSON.
                    </p>
                  </div>
                  <div className="flex gap-3 px-4 py-3">
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-[var(--a-on)] mt-0.5" style={{ background:'var(--a600)' }}>4</span>
                    <p className="text-dim">Once Claude outputs the JSON, come back here and click "I've got the JSON →".</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Paste JSON ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Still-in-questions callout */}
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border" style={{ background:'var(--a50)', borderColor:'var(--a200)' }}>
                <span className="text-lg shrink-0">💬</span>
                <div className="text-sm" style={{ color:'var(--a700)' }}>
                  <p className="font-semibold mb-0.5">Still answering questions?</p>
                  <p>If Claude asked you A/B/C/D questions, answer them in the chat first (e.g. <span className="font-mono bg-white/40 px-1 rounded">Q1: B, Q2: A</span>). Once Claude responds with the JSON list, come paste it here.</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-ink block mb-1.5">
                  Paste Claude's JSON response
                  <span className="text-ghost font-normal ml-2">— paste the whole thing once you have it</span>
                </label>
                <textarea
                  value={jsonInput}
                  onChange={e => { setJsonInput(e.target.value); setParseError(null) }}
                  rows={12}
                  placeholder={'[\n  {\n    "list": "Gaming Gear",\n    "name": "Razer DeathAdder V3",\n    ...\n  }\n]'}
                  className="w-full px-3.5 py-3 rounded-xl border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent text-xs font-mono resize-none transition-colors"
                  style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
                  autoFocus
                />
                {parseError && (
                  <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                    {parseError}
                  </div>
                )}
              </div>

              <p className="text-xs text-ghost">The app handles it whether Claude wrapped it in code fences or not.</p>
            </div>
          )}

          {/* ── Step 3: Preview ── */}
          {step === 3 && !importDone && (
            <div className="space-y-5">
              {/* Image fetch progress */}
              {fetchingImages && (
                <div className="rounded-xl border px-4 py-3" style={{ background:'var(--a50)', borderColor:'var(--a200)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium" style={{ color:'var(--a700)' }}>
                      🔍 Fetching real product images… {fetchProgress}%
                    </p>
                    <p className="text-xs text-ghost">Images update live as they load</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width:`${fetchProgress}%`, background:'var(--a500)' }} />
                  </div>
                </div>
              )}
              {!fetchingImages && fetchProgress === 100 && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  Images fetched from product pages — much better than Claude's guesses
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-dim">
                  <span className="font-medium text-ink">{selectedCount}</span> of {parsed.length} items selected
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(new Set(parsed.map((_, i) => i)))} className="text-xs text-dim hover:text-ink spring">Select all</button>
                  <span className="text-ghost">·</span>
                  <button onClick={() => setSelected(new Set())} className="text-xs text-dim hover:text-ink spring">None</button>
                </div>
              </div>

              {[...byList.entries()].map(([listName, items]) => {
                const existingId = existingLists.find(l => l.name.toLowerCase() === listName.toLowerCase())?.id
                return (
                  <div key={listName}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-ink">{listName}</span>
                      {existingId
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-raised text-ghost">existing list</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full text-[var(--a-on)]" style={{ background: 'var(--a600)' }}>new list</span>
                      }
                    </div>
                    <div className="space-y-1.5">
                      {items.map(({ index, item }) => (
                        <label key={index} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors group ${selected.has(index) ? '' : 'opacity-50'}`}
                          style={selected.has(index) ? { background: 'var(--a50)', borderColor: 'var(--a200)' } : { borderColor: 'var(--line)', background: 'var(--raised)' }}>
                          <input type="checkbox" checked={selected.has(index)} onChange={() => setSelected(prev => {
                            const next = new Set(prev)
                            next.has(index) ? next.delete(index) : next.add(index)
                            return next
                          })} className="mt-0.5 shrink-0 accent-[var(--a600)]" />

                          {/* Thumbnail */}
                          <div className="w-10 h-10 shrink-0 rounded-lg bg-card border border-line overflow-hidden flex items-center justify-center">
                            {item.image_url
                              ? <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                              : <span className="text-ghost text-lg">?</span>
                            }
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {item.price != null && (
                                <span className="text-xs font-semibold" style={{ color: 'var(--a500)' }}>${item.price.toFixed(2)}</span>
                              )}
                              {item.tags && item.tags.length > 0 && (
                                <span className="text-xs text-ghost">{item.tags.map(t => `#${t}`).join(' ')}</span>
                              )}
                              {item.star_rating ? <span className="text-xs text-ghost">{'★'.repeat(item.star_rating)}</span> : null}
                            </div>
                            {item.notes && <p className="text-xs text-dim mt-0.5 line-clamp-1">{item.notes}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Done state ── */}
          {importDone && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl mb-4" style={{ background: 'var(--a50)' }}>✅</div>
              <h3 className="text-lg font-semibold text-ink mb-2">Import complete!</h3>
              {importResult && (
                <div className="flex items-center justify-center gap-3 mt-2 mb-1">
                  {importResult.added > 0 && (
                    <span className="text-sm px-3 py-1 rounded-full text-[var(--a-on)]" style={{ background:'var(--a600)' }}>
                      +{importResult.added} new
                    </span>
                  )}
                  {importResult.updated > 0 && (
                    <span className="text-sm px-3 py-1 rounded-full bg-raised text-ink border border-line">
                      ↻ {importResult.updated} updated
                    </span>
                  )}
                </div>
              )}
              <p className="text-dim text-sm mt-2">Head to your lists to see them.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!importDone && (
          <div className="px-6 py-4 border-t border-line flex items-center justify-between shrink-0">
            <button onClick={() => step > 1 ? setStep(s => (s - 1) as 1|2|3) : onClose()} className="px-4 py-2 text-sm text-dim hover:text-ink rounded-lg hover:bg-raised spring">
              {step === 1 ? 'Cancel' : '← Back'}
            </button>

            {step === 1 && (
              <button onClick={() => setStep(2)} disabled={!rawList.trim()} className="px-5 py-2 text-sm rounded-xl spring disabled:opacity-40" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
                I've got the JSON →
              </button>
            )}
            {step === 2 && (
              <button onClick={handleParse} disabled={!jsonInput.trim()} className="px-5 py-2 text-sm rounded-xl spring disabled:opacity-40" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
                Preview items →
              </button>
            )}
            {step === 3 && !importDone && (
              <button onClick={doImport} disabled={selectedCount === 0 || importing} className="px-5 py-2 text-sm rounded-xl spring disabled:opacity-40" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
                {importing ? 'Importing…' : `Import ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        )}
        {importDone && (
          <div className="px-6 py-4 border-t border-line shrink-0">
            <button onClick={onClose} className="w-full py-2.5 text-sm rounded-xl spring" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
