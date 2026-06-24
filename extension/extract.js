/*
 * Product extractor — runs in the context of the page the user is looking at.
 *
 * This is the heart of the "automatic capture" feature. Because it runs in the
 * user's own logged-in browser (via the extension or the bookmarklet), it sees
 * the fully-rendered DOM on a residential IP — which is why it works on sites
 * (Amazon especially) that block server-side scraping.
 *
 * The file is written as a single expression so that, when injected with
 * chrome.scripting.executeScript({ files: ['extract.js'] }), its completion
 * value is returned to the extension. The same logic is mirrored, minified, in
 * the bookmarklet generated on the app's /tools page — keep them in sync.
 *
 * Returns: { title, price, currency, image, url }  (any field may be null)
 */
(() => {
  const text = (sel) => {
    const el = document.querySelector(sel)
    return el ? (el.textContent || '').trim() : null
  }
  const attr = (sel, name) => {
    const el = document.querySelector(sel)
    return el ? el.getAttribute(name) : null
  }

  // Pull a numeric price out of a messy string like "$1,299.00" → "1299.00".
  const cleanPrice = (raw) => {
    if (raw == null) return null
    const m = String(raw).replace(/[ ,]/g, '').match(/(\d+(?:\.\d{1,2})?)/)
    return m ? m[1] : null
  }

  let title = null, price = null, currency = null, image = null

  // 1) JSON-LD structured data (most reliable when present).
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.textContent)
      const nodes = Array.isArray(data) ? data : (Array.isArray(data['@graph']) ? data['@graph'] : [data])
      for (const node of nodes) {
        const type = node && node['@type']
        const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'))
        if (!isProduct && !node?.offers) continue
        if (!title && node.name) title = String(node.name)
        if (!image) {
          const img = node.image
          image = Array.isArray(img) ? (img[0]?.url || img[0]) : (img?.url || img)
          if (image) image = String(image)
        }
        const offers = node.offers ? (Array.isArray(node.offers) ? node.offers[0] : node.offers) : null
        if (offers) {
          const p = offers.price ?? offers.lowPrice ?? offers.highPrice
          if (p != null && p !== '') { price = cleanPrice(p); currency = offers.priceCurrency || currency }
        }
      }
    } catch { /* malformed JSON-LD — ignore */ }
  }

  // 2) Open Graph / Twitter / microdata meta tags.
  title = title || attr('meta[property="og:title"]', 'content') || attr('meta[name="twitter:title"]', 'content') || document.title || null
  image = image || attr('meta[property="og:image"]', 'content') || attr('meta[name="twitter:image"]', 'content') || attr('meta[itemprop="image"]', 'content')
  if (!price) {
    const metaPrice =
      attr('meta[property="product:price:amount"]', 'content') ||
      attr('meta[property="og:price:amount"]', 'content') ||
      attr('meta[itemprop="price"]', 'content') ||
      attr('[itemprop="price"]', 'content')
    if (metaPrice) price = cleanPrice(metaPrice)
    currency = currency ||
      attr('meta[property="product:price:currency"]', 'content') ||
      attr('meta[property="og:price:currency"]', 'content') ||
      attr('meta[itemprop="priceCurrency"]', 'content')
  }

  // 3) Amazon-specific selectors (Amazon rarely exposes clean structured data).
  if (!price) {
    const amazonPrice =
      text('#corePriceDisplay_desktop_feature_div .a-offscreen') ||
      text('#corePrice_feature_div .a-offscreen') ||
      text('#priceblock_ourprice') ||
      text('#priceblock_dealprice') ||
      text('.a-price .a-offscreen')
    if (amazonPrice) price = cleanPrice(amazonPrice)
  }
  if (!image) {
    image = attr('#landingImage', 'data-old-hires') || attr('#landingImage', 'src') || attr('#imgBlkFront', 'src')
  }
  if (!title) title = text('#productTitle')

  // 4) Last-resort generic price scan (first visible $-amount in a price-ish node).
  if (!price) {
    const el = document.querySelector('[class*="price" i], [id*="price" i]')
    if (el) price = cleanPrice(el.textContent)
  }

  // Normalise a protocol-relative or relative image URL to absolute.
  if (image && image.startsWith('//')) image = location.protocol + image
  else if (image && image.startsWith('/')) image = location.origin + image

  return {
    title: title ? title.trim().slice(0, 300) : null,
    price: price || null,
    currency: currency || 'USD',
    image: image && /^https?:\/\//.test(image) ? image : null,
    url: location.href.split('#')[0],
  }
})()
