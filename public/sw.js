const CACHE_NAME = 'riff-static-v1'
const SHELL_FILES = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/riff-192.png',
  '/icons/riff-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('riff-static-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Do not cache pages, RSC responses, profiles, Supabase data, or attachments.
  // They are private/live and must always be fetched from the network.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html')) || Response.error()))
    return
  }

  const isImmutableAsset = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest' || url.pathname === '/favicon.ico'
  if (!isImmutableAsset) return

  const refresh = fetch(request).then((response) => {
    if (!response.ok) return response
    const copy = response.clone()
    return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).then(() => response)
  })
  event.waitUntil(refresh.then(() => undefined).catch(() => undefined))
  event.respondWith(caches.match(request).then((cached) => cached || refresh))
})
