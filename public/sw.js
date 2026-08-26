// ==============================================================================
// SERVICE WORKER - ORACULUM SAAS (PWA & OFFLINE TELEPROMPTER)
// ==============================================================================

const CACHE_NAME = 'oraculum-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Não intercepta scripts e html para evitar travar versão
  if (e.request.url.includes('.js') || e.request.url.includes('.html')) {
    e.respondWith(fetch(e.request));
  }
});
