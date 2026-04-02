const CACHE_NAME = 'outland-shell-v1'
const TILE_CACHE = 'tile-cache-v1'
const SHELL_ASSETS = ['/', '/gear', '/trips', '/spots', '/vehicle', '/settings']

// Install: cache app shell pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== TILE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch: route requests by type
self.addEventListener('fetch', (event) => {
  const url = event.request.url

  // API calls: network-only with offline fallback
  if (url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    )
    return
  }

  // OSM tiles: network-first with cache fallback (passive caching)
  if (url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(TILE_CACHE).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Everything else: cache-first with network fallback
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request))
  )
})

// Message handler for future update prompts
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
