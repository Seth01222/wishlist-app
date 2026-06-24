// Bumped to v2: v1 precached authenticated pages ('/', '/wishlists'). Storing
// signed-in HTML in the cache could surface one user's data offline on a shared
// device, so we no longer cache page responses at all — only static assets.
const CACHE = 'wishlist-v2'

// Only non-sensitive, static files are precached.
const PRECACHE = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// Minimal offline page shown when a navigation fails with no network.
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline</title><style>
body{font-family:system-ui,sans-serif;background:#0d0d11;color:#e5e7eb;
display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}
.box{padding:2rem}h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#9ca3af;font-size:.9rem}
</style></head><body><div class="box"><h1>You're offline</h1>
<p>Reconnect to the internet to view your wishlists.</p></div></body></html>`

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // API + Next.js data: always go to the network (never cache dynamic data).
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) {
    e.respondWith(fetch(request))
    return
  }

  // Static, non-sensitive assets: cache-first for speed/offline.
  const isStatic = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/.test(url.pathname) ||
    url.pathname.startsWith('/_next/static/')
  if (isStatic) {
    e.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
        }
        return res
      }))
    )
    return
  }

  // Page navigations: network-only (so we never store authenticated HTML),
  // with a generic offline page as the only fallback.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html' } })
      )
    )
  }
})
