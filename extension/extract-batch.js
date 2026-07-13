/*
 * Batch product extractor — runs on Amazon cart / wishlist pages, where a
 * single page holds many line items instead of one product.
 *
 * Shares the same philosophy as extract.js (runs in the user's own logged-in
 * browser, so it sees the real DOM Amazon serves to a signed-in shopper — no
 * server-side scraping, no bot detection to beat) but walks a list of
 * repeated item rows instead of extracting one product from `document`.
 *
 * Unlike extract.js, there is no universal structured-data standard for
 * "everything in this cart" — JSON-LD/Open Graph only describe a single
 * product. So this file is inherently page-specific: it knows the shape of
 * Amazon's cart and Amazon's wishlist pages. Amazon changes this markup
 * periodically; when a page stops producing results, the selectors below are
 * the first place to look.
 *
 * Returns: Array<{ title, price, currency, image, url, quantity }>
 * (any field except quantity may be null; rows with no title AND no url are
 * dropped since there's nothing usable to add)
 */
(() => {
  const cleanPrice = (raw) => {
    if (raw == null) return null
    const m = String(raw).replace(/[ ,]/g, '').match(/(\d+(?:\.\d{1,2})?)/)
    return m ? m[1] : null
  }
  const abs = (url) => {
    if (!url) return null
    if (url.startsWith('//')) return location.protocol + url
    if (url.startsWith('/')) return location.origin + url
    return url
  }
  // Amazon serves list/cart thumbnails at a small size baked into the filename
  // (e.g. ...41xSi8afbhL._SS135_.jpg / ..._AC_AA180_.jpg). Stripping that size
  // token yields the full-resolution base image, which displays far better in
  // the app. Verified: the stripped URL returns a 500px image vs the 135px thumb.
  const upsize = (u) => u ? u.replace(/\._[A-Z0-9,_]+_\.(jpg|png|webp)$/i, '.$1') : u
  const text = (root, sel) => {
    const el = root.querySelector(sel)
    return el ? (el.textContent || '').trim() : null
  }
  const attr = (root, sel, name) => {
    const el = root.querySelector(sel)
    return el ? el.getAttribute(name) : null
  }

  const results = []

  // ── Amazon cart (/gp/cart/view.html and friends) ──
  // Amazon exposes clean machine-readable values as data-* attributes on each
  // row (data-price, data-quantity, data-asin) — prefer those over scraping
  // visible text, which is both messier and more prone to breaking. Note the
  // visible title lives inside an .a-truncate widget that holds BOTH the full
  // and the truncated copy, so reading .sc-product-title directly doubles the
  // text — target .a-truncate-full instead. (Verified against the live logged-in
  // cart DOM: 40/40 rows yielded title + price + image with these selectors.)
  const cartRows = document.querySelectorAll(
    '#sc-active-cart .sc-list-item, #activeCartViewForm .sc-list-item, [data-name="Active Items"] .sc-list-item'
  )
  cartRows.forEach((row) => {
    const title =
      text(row, '.sc-product-title .a-truncate-full') ||
      text(row, '.sc-product-title') ||
      attr(row, 'img.sc-product-image', 'alt') ||
      attr(row, 'a.sc-product-link', 'title')
    const asin = row.getAttribute('data-asin')
    const url =
      abs(attr(row, 'a.sc-product-link', 'href')) ||
      (asin ? location.origin + '/dp/' + asin : null)
    if (!title && !url) return

    const image = upsize(abs(attr(row, 'img.sc-product-image', 'src')))
    const priceRaw =
      row.getAttribute('data-price') ||
      text(row, '.a-price .a-offscreen') ||
      text(row, '.sc-product-price')
    const qtyRaw = row.getAttribute('data-quantity') || attr(row, '.sc-quantity-textfield', 'value')
    let quantity = 1
    const n = parseInt(qtyRaw, 10)
    if (!isNaN(n) && n > 0) quantity = n

    results.push({
      title: title ? title.trim().slice(0, 300) : null,
      price: cleanPrice(priceRaw),
      currency: 'USD',
      image: image && /^https?:\/\//.test(image) ? image : null,
      url: url || location.href,
      quantity,
    })
  })

  // ── Amazon wishlist / registry pages (/hz/wishlist/ls/…) ──
  // Verified against a live logged-in list: the name/price nodes still carry
  // their id prefixes (itemName_/itemPrice_), but the image no longer does —
  // the product photo is simply the row's first /images/I/ img (the other imgs
  // are Prime-badge SVGs under /images/S/sash/). Selecting by id here silently
  // dropped every image, which is why we match on the src path instead.
  if (results.length === 0) {
    const listRows = document.querySelectorAll('#g-items li[data-itemid], li[data-id][data-itemid]')
    listRows.forEach((row) => {
      const nameLink = row.querySelector('a[id^="itemName_"]')
      const title = nameLink ? (nameLink.textContent || '').trim() : null
      const url = abs(nameLink ? nameLink.getAttribute('href') : null)
      if (!title && !url) return

      const img = row.querySelector('img[id^="itemImage_"]') || row.querySelector('img[src*="/images/I/"]')
      const image = upsize(abs(img ? (img.getAttribute('data-old-hires') || img.getAttribute('src')) : null))
      const priceEl = row.querySelector('[id^="itemPrice_"] .a-offscreen, span[id^="itemPrice_"]')
      const priceRaw = priceEl ? (priceEl.textContent || '').trim() : null

      const qtyEl = row.querySelector('[id^="itemQuantityDesired_"], [id^="itemRequestedQuantity_"]')
      let quantity = 1
      if (qtyEl) {
        const n = parseInt((qtyEl.textContent || qtyEl.value || '').replace(/\D/g, ''), 10)
        if (!isNaN(n) && n > 0) quantity = n
      }

      results.push({
        title: title ? title.trim().slice(0, 300) : null,
        price: cleanPrice(priceRaw),
        currency: 'USD',
        image: image && /^https?:\/\//.test(image) ? image : null,
        url: url || location.href,
        quantity,
      })
    })
  }

  return results
})()
