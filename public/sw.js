// PROTOCOLO DE AUTODESTRUIÇÃO DO CACHE ANTIGO
self.addEventListener('install', (e) => {
  // Força o novo Service Worker a se instalar imediatamente
  self.skipWaiting(); 
});

self.addEventListener('activate', (e) => {
  // Varre e deleta TODOS os caches antigos gravados no computador do usuário
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => caches.delete(key)));
    })
  );
  // Toma o controle da página imediatamente
  self.clients.claim();
});

// A ausência proposital do 'fetch' garante que o navegador sempre busque da internet, e não do cache.
