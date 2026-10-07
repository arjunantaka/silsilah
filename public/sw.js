// Cache-first runtime: aset yang pernah dilihat tersimpan untuk offline.
// Tanpa daftar precache — aman untuk nama file ber-hash dari Vite.
const CACHE = 'silsilah-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return // data cloud selalu segar, jangan di-cache
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const salinan = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, salinan))
        }
        return res
      })
    })
  )
})
