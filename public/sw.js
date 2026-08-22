// ==============================================================================
// SERVICE WORKER - ORACULUM SAAS (PWA & OFFLINE TELEPROMPTER)
// ==============================================================================

const CACHE_NAME = 'oraculum-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// Instalação do Service Worker & Cache de Ativos Estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-cache de ativos da interface concluído.');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de Requisições de Rede (Network First para garantir atualização)
self.addEventListener('fetch', (event) => {
  // Ignora requisições de API e extensões do Chrome
  if (event.request.url.includes('/api/') || event.request.url.startsWith('chrome-extension')) {
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      // Atualiza o cache dinamicamente com a versão mais recente
      const resClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, resClone);
      });
      return response;
    }).catch(() => {
      // Se falhar (offline), busca no cache
      return caches.match(event.request).then((response) => {
        return response || caches.match('/index.html');
      });
    })
  );
});
