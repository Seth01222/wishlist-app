'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { INPUT_CLASS as INPUT_FIELD, RING_STYLE as RING } from '@/lib/ui'

type SearchResult = { title: string | null; price: string | null; currency: string; image: string | null; link: string | null; source: string | null }

// The bookmarklet is a compact, self-contained version of extension/extract.js.
// It runs on whatever product page you're viewing, then opens this app's
// quick-add flow with the title/price/image pre-filled. APP_ORIGIN is injected
// at render time so the bookmarklet points back at wherever this app is hosted.
function buildBookmarklet(origin: string): string {
  const code = `
    var APP=${JSON.stringify(origin)};
    function t(s){var e=document.querySelector(s);return e?(e.textContent||'').trim():null}
    function a(s,n){var e=document.querySelector(s);return e?e.getAttribute(n):null}
    function cp(r){if(r==null)return null;var m=String(r).replace(/[ ,]/g,'').match(/(\\d+(?:\\.\\d{1,2})?)/);return m?m[1]:null}
    var title=null,price=null,cur=null,img=null;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{var d=JSON.parse(s.textContent);var ns=Array.isArray(d)?d:(d['@graph']||[d]);ns.forEach(function(n){if(!n)return;var of=n.offers?(Array.isArray(n.offers)?n.offers[0]:n.offers):null;if(n.name&&!title)title=n.name;if(!img&&n.image)img=Array.isArray(n.image)?(n.image[0].url||n.image[0]):(n.image.url||n.image);if(of){var p=of.price||of.lowPrice;if(p){price=cp(p);cur=of.priceCurrency||cur}}})}catch(e){}});
    title=title||a('meta[property="og:title"]','content')||document.title;
    img=img||a('meta[property="og:image"]','content')||a('meta[name="twitter:image"]','content');
    if(!price)price=cp(a('meta[property="product:price:amount"]','content')||a('meta[property="og:price:amount"]','content')||a('[itemprop=price]','content'));
    if(!price)price=cp(t('.a-price .a-offscreen')||t('#priceblock_ourprice')||t('#corePrice_feature_div .a-offscreen'));
    if(!img)img=a('#landingImage','data-old-hires')||a('#landingImage','src');
    if(!title)title=t('#productTitle');
    if(img&&img.indexOf('//')===0)img=location.protocol+img;
    var u=new URLSearchParams({share:location.href,shareTitle:title||''});
    if(price)u.set('sharePrice',price);if(cur)u.set('shareCurrency',cur);if(img)u.set('shareImage',img);
    window.open(APP+'/wishlists?'+u.toString(),'_blank');
  `.replace(/\s*\n\s*/g, '')
  return 'javascript:(function(){' + code + '})();'
}

const CARD = 'bg-card border border-line rounded-2xl p-6'
const STEP = 'flex gap-3'

export default function ToolsPage() {
  const router = useRouter()
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)

  // SerpApi key + search state
  const [keyInput, setKeyInput] = useState('')
  const [keySaved, setKeySaved] = useState(false)
  const [keyStatus, setKeyStatus] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    const o = window.location.origin
    setOrigin(o)
    // Set the javascript: href directly on the DOM node — React strips
    // javascript: URLs from the href attribute, which would break dragging.
    if (linkRef.current) linkRef.current.href = buildBookmarklet(o)

    // Reflect whether a SerpApi key is already saved.
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('serpapi_key').eq('id', user.id).maybeSingle()
      if (data?.serpapi_key) setKeySaved(true)
    })()
  }, [])

  async function copyBookmarklet() {
    await navigator.clipboard.writeText(buildBookmarklet(origin))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveKey() {
    setKeyStatus(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setKeyStatus('Sign in first.'); return }
    const { error } = await supabase.from('profiles').upsert({ id: user.id, serpapi_key: keyInput.trim() || null })
    if (error) { setKeyStatus(error.message); return }
    setKeySaved(!!keyInput.trim())
    setKeyInput('')
    setKeyStatus('Saved ✓')
    setTimeout(() => setKeyStatus(null), 2500)
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true); setSearchError(null); setResults([])
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
      const json = await res.json()
      if (!res.ok) { setSearchError(json.error || 'Search failed'); return }
      setResults(json.results || [])
      if ((json.results || []).length === 0) setSearchError('No results found.')
    } catch {
      setSearchError('Search failed. Check your connection.')
    } finally {
      setSearching(false)
    }
  }

  // Selecting a result hands off to the existing add-to-list flow.
  function pickResult(r: SearchResult) {
    const params = new URLSearchParams({ share: r.link || '', shareTitle: r.title || '' })
    if (r.price) params.set('sharePrice', r.price)
    if (r.currency) params.set('shareCurrency', r.currency)
    if (r.image) params.set('shareImage', r.image)
    router.push(`/wishlists?${params.toString()}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink mb-1">Quick Add</h1>
      <p className="text-dim text-sm mb-6">
        Add products to your wishlist in one click — with the price and image
        pulled in automatically. This works on sites that block the paste-a-URL
        method (like Amazon), because it reads the page right in your browser.
      </p>

      {/* Search by name (SerpApi) */}
      <div className={`${CARD} mb-5`}>
        <h2 className="font-semibold text-ink mb-1">🔎 Search by name (any device, incl. iPhone)</h2>
        <p className="text-dim text-sm mb-4">
          Type a product name and pick from live shopping results — no URL
          needed. Uses your own free <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--a500)' }}>SerpApi</a> key
          (100 searches/month free).
        </p>

        {!keySaved && (
          <div className="mb-4 p-3 rounded-xl bg-raised border border-line">
            <label className="block text-sm font-medium text-ink mb-1.5">Your SerpApi key</label>
            <div className="flex gap-2">
              <input
                type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
                placeholder="Paste your SerpApi key" className={`${INPUT_FIELD} flex-1`} style={RING}
              />
              <button onClick={saveKey} className="px-4 rounded-lg text-sm font-medium spring" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>Save</button>
            </div>
            {keyStatus && <p className="text-xs mt-1.5" style={{ color: 'var(--a500)' }}>{keyStatus}</p>}
          </div>
        )}

        {keySaved && (
          <p className="text-xs text-dim mb-3">
            ✓ SerpApi connected.{' '}
            <button onClick={() => setKeySaved(false)} className="underline hover:text-ink">Change key</button>
          </p>
        )}

        <form onSubmit={runSearch} className="flex gap-2 mb-4">
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Sony WH-1000XM5 headphones" className={`${INPUT_FIELD} flex-1`} style={RING}
          />
          <button type="submit" disabled={searching} className="px-4 rounded-lg text-sm font-medium spring disabled:opacity-40" style={{ background: 'var(--a600)', color: 'var(--a-on)' }}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchError && <p className="text-sm text-dim mb-3">{searchError}</p>}

        {results.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {results.map((r, i) => (
              <button key={i} onClick={() => pickResult(r)} className="flex items-center gap-3 p-2 rounded-xl bg-raised hover:bg-line spring text-left">
                {r.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-card" />
                  : <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-lg bg-card">🛍️</div>}
                <div className="min-w-0">
                  <p className="text-sm text-ink line-clamp-2">{r.title}</p>
                  <p className="text-xs mt-0.5">
                    {r.price && <span className="font-semibold" style={{ color: 'var(--a500)' }}>${r.price}</span>}
                    {r.source && <span className="text-ghost"> · {r.source}</span>}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bookmarklet */}
      <div className={`${CARD} mb-5`}>
        <h2 className="font-semibold text-ink mb-1">📌 Bookmarklet (works everywhere, no install)</h2>
        <p className="text-dim text-sm mb-4">
          Drag this button to your bookmarks bar. Then, on any product page,
          click it to add the item here.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-invalid-href -- href set via ref */}
          <a
            ref={linkRef}
            href="#"
            onClick={e => e.preventDefault()}
            draggable
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm cursor-grab select-none"
            style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
          >
            ♥ Add to Wishlist
          </a>
          <button
            onClick={copyBookmarklet}
            className="px-3.5 py-2.5 rounded-xl text-sm font-medium bg-raised border border-line text-dim hover:text-ink spring"
          >
            {copied ? 'Copied ✓' : 'Copy code'}
          </button>
        </div>

        <details className="text-sm text-dim">
          <summary className="cursor-pointer font-medium text-ink">Can&apos;t drag it? Add it manually</summary>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>Create a new bookmark (any page).</li>
            <li>Edit it, and paste the copied code as the URL/address.</li>
            <li>Name it &ldquo;Add to Wishlist&rdquo; and save.</li>
          </ol>
        </details>
      </div>

      {/* Extension */}
      <div className={`${CARD} mb-5`}>
        <h2 className="font-semibold text-ink mb-1">🧩 Browser extension (toolbar button)</h2>
        <p className="text-dim text-sm mb-3">
          A proper toolbar button for Chrome, Edge, or Brave. Same idea as the
          bookmarklet, with a nicer click target — plus it can add a whole
          Amazon cart at once (see below).
        </p>
        <ol className="text-sm text-dim space-y-2">
          <li className={STEP}><span className="font-semibold text-ink">1.</span> Download the <code className="text-ink">extension/</code> folder from the project repo.</li>
          <li className={STEP}><span className="font-semibold text-ink">2.</span> Go to <code className="text-ink">chrome://extensions</code>, enable <span className="text-ink">Developer mode</span>, click <span className="text-ink">Load unpacked</span>, and pick that folder.</li>
          <li className={STEP}><span className="font-semibold text-ink">3.</span> Open the extension&apos;s options and set the App URL to <code className="text-ink break-all">{origin || 'this site'}</code>.</li>
          <li className={STEP}><span className="font-semibold text-ink">4.</span> Click the button on any product page.</li>
        </ol>

        {/* Batch mode — extension only */}
        <div className="mt-4 rounded-xl border p-4" style={{ background: 'var(--a50)', borderColor: 'var(--a200)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">🛒</span>
            <h3 className="font-semibold" style={{ color: 'var(--a700)' }}>Batch add a whole cart at once</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-[var(--a-on)]" style={{ background: 'var(--a600)' }}>extension only</span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--a700)' }}>
            Click the toolbar button while you&apos;re on your <span className="font-medium">Amazon cart</span> or
            an <span className="font-medium">Amazon wish list</span> and it grabs <span className="font-medium">every item on the page</span> — name,
            price, image, and quantity — instead of just one. A review screen opens where you can edit each item,
            bulk-assign a whole selection to one list (or make a new list on the spot), and import them together.
          </p>
          <ul className="text-sm space-y-1" style={{ color: 'var(--a700)' }}>
            <li className={STEP}><span className="font-semibold">•</span> Works on <code className="text-ink">amazon.com/gp/cart/view.html</code> and <code className="text-ink">amazon.com/hz/wishlist/ls/…</code></li>
            <li className={STEP}><span className="font-semibold">•</span> Make sure you&apos;re signed into Amazon <span className="font-medium">and</span> this app in the same browser.</li>
            <li className={STEP}><span className="font-semibold">•</span> On a normal product page the button still adds just that one item — batch mode kicks in automatically on cart/list pages.</li>
          </ul>
          <p className="text-xs mt-3" style={{ color: 'var(--a600)' }}>
            The bookmarklet can&apos;t do this — a full cart doesn&apos;t fit in a bookmark. Batch mode needs the extension.
          </p>
        </div>
      </div>

      {/* iOS */}
      <div className={CARD}>
        <h2 className="font-semibold text-ink mb-1">📱 On iPhone / iPad</h2>
        <p className="text-dim text-sm">
          Install this app to your Home Screen, then use the <span className="text-ink">Share</span> button in
          Safari and choose <span className="text-ink">My Wishlist</span>. (Note: the Share Sheet only passes the
          link, so the price/image come from the site&apos;s preview data and may
          not always fill in — use the bookmarklet on a Mac for the most reliable
          capture.)
        </p>
      </div>
    </div>
  )
}
