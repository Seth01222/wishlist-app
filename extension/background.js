// Toolbar-button handler. On click it injects the extractor into the current
// page, reads back the product data, and opens the app's quick-add flow with
// everything pre-filled. The app must be open/logged-in in the same browser
// (the new tab uses your existing session cookie).
//
// On a recognized Amazon cart/wishlist page, it injects extract-batch.js
// instead, which pulls every line item at once, and opens the app's batch
// review screen rather than the single-item quick-add.

async function getAppOrigin() {
  const { appOrigin } = await chrome.storage.sync.get('appOrigin')
  return (appOrigin || '').replace(/\/+$/, '')
}

// Pages that hold many items instead of one product. Keep in sync with the
// row selectors in extract-batch.js.
const BATCH_PAGE_PATTERNS = [
  /amazon\.[a-z.]+\/gp\/cart\/view\.html/i,
  /amazon\.[a-z.]+\/cart(\/|$|\?)/i,
  /amazon\.[a-z.]+\/hz\/wishlist\/ls\//i,
]
const isBatchPage = (url) => BATCH_PAGE_PATTERNS.some((re) => re.test(url || ''))

chrome.action.onClicked.addListener(async (tab) => {
  const origin = await getAppOrigin()
  if (!origin) {
    // No app URL configured yet — send the user to the options page.
    chrome.runtime.openOptionsPage()
    return
  }
  if (!tab.id || !/^https?:/.test(tab.url || '')) return

  if (isBatchPage(tab.url)) {
    let items = []
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['extract-batch.js'],
      })
      items = Array.isArray(res?.result) ? res.result : []
    } catch (e) {
      console.error('Wishlist batch extract failed', e)
    }
    if (items.length === 0) {
      chrome.tabs.create({ url: `${origin}/wishlists` })
      return
    }
    // Items travel in the URL fragment, not a query param — it never leaves
    // the browser (no server round-trip), so there's no practical length
    // limit for a cart's worth of items the way there would be with `share=`.
    chrome.tabs.create({ url: `${origin}/wishlists#batch=${encodeURIComponent(JSON.stringify(items))}` })
    return
  }

  let data
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['extract.js'],
    })
    data = res?.result
  } catch (e) {
    console.error('Wishlist extract failed', e)
  }
  if (!data) data = { url: tab.url, title: tab.title || '', price: null, currency: 'USD', image: null }

  const params = new URLSearchParams({
    share: data.url || tab.url || '',
    shareTitle: data.title || tab.title || '',
  })
  if (data.price) params.set('sharePrice', data.price)
  if (data.currency) params.set('shareCurrency', data.currency)
  if (data.image) params.set('shareImage', data.image)

  chrome.tabs.create({ url: `${origin}/wishlists?${params.toString()}` })
})
