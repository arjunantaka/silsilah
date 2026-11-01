// Runtime caching untuk offline.
// - Dokumen (navigasi HTML): network-first, supaya versi baru langsung terpakai;
//   jatuh ke cache hanya saat offline.
// - Aset ber-hash dari Vite: cache-first (nama file berubah tiap build).
// - /api/ tidak pernah di-cache.
const CACHE = 'silsilah-v3'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((kunci) => Promise.all(kunci.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return // data cloud selalu segar, jangan di-cache

  const simpan = (res) => {
    if (res && res.ok) {
      const salinan = res.clone()
      caches.open(CACHE).then((cache) => cache.put(req, salinan))
    }
    return res
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(simpan)
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
    )
    return
  }

  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(simpan)))
})