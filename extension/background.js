// Toolbar-button handler. On click it injects the extractor into the current
// page, reads back the product data, and opens the app's quick-add flow with
// everything pre-filled. The app must be open/logged-in in the same browser
// (the new tab uses your existing session cookie).

async function getAppOrigin() {
  const { appOrigin } = await chrome.storage.sync.get('appOrigin')
  return (appOrigin || '').replace(/\/+$/, '')
}

chrome.action.onClicked.addListener(async (tab) => {
  const origin = await getAppOrigin()
  if (!origin) {
    // No app URL configured yet — send the user to the options page.
    chrome.runtime.openOptionsPage()
    return
  }
  if (!tab.id || !/^https?:/.test(tab.url || '')) return

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
