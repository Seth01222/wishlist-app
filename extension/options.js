const input = document.getElementById('origin')
const status = document.getElementById('status')

chrome.storage.sync.get('appOrigin').then(({ appOrigin }) => {
  if (appOrigin) input.value = appOrigin
})

document.getElementById('save').addEventListener('click', async () => {
  const appOrigin = input.value.trim().replace(/\/+$/, '')
  await chrome.storage.sync.set({ appOrigin })
  status.hidden = false
  setTimeout(() => { status.hidden = true }, 2000)
})
