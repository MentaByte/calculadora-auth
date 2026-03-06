/* ================================================
   SERVICE WORKER - Calculadora PWA (iOS)
   Versión iOS: optimizado para Safari/WebKit
   =============================================== */

const CACHE_NAME = 'calculadora-ios-v1.0';

const BASE = self.location.pathname.replace(/sw\.js$/, '');

const PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'core/index.html',
  BASE + '../ios-icon-180.png',
  BASE + '../ios-icon-192.png',
  BASE + '../fenix.html',
];

/* ------------------------------------------------
   INSTALL
------------------------------------------------ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[iOS SW] Precacheando archivos...');
      return Promise.allSettled(
        PRECACHE.map(url =>
          cache.add(url).catch(err =>
            console.warn('[iOS SW] No se pudo cachear:', url, err)
          )
        )
      );
    }).then(() => {
      console.log('[iOS SW] Instalación completa');
      return self.skipWaiting();
    })
  );
});

/* ------------------------------------------------
   ACTIVATE
------------------------------------------------ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[iOS SW] Eliminando caché vieja:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[iOS SW] Activado y en control');
      return self.clients.claim();
    })
  );
});

/* ------------------------------------------------
   FETCH
   Estrategia para iOS:
   - Supabase: siempre a la red
   - core/index.html: network-first (para validación fresca)
   - Resto: cache-first con fallback a red
------------------------------------------------ */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Supabase: nunca cachear
  if (url.hostname.includes('supabase')) return;

  const isLocal = url.origin === self.location.origin;
  if (!isLocal) return;

  // core/index.html: network-first para validación fresca de sesión
  if (url.pathname.includes('core/index.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Resto: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));

        return response;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return new Response(
            `<!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
              <meta name="apple-mobile-web-app-capable" content="yes">
              <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
              <title>Sin conexión</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  background: #000;
                  color: #fff;
                  text-align: center;
                  padding: 20px;
                  padding-top: env(safe-area-inset-top);
                  padding-bottom: env(safe-area-inset-bottom);
                }
                .logo { font-size: 56px; margin-bottom: 20px; }
                h1 { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
                p { font-size: 15px; color: #8e8e93; max-width: 280px; line-height: 1.5; }
                button {
                  margin-top: 28px;
                  padding: 14px 32px;
                  background: #ff9500;
                  color: #000;
                  border: none;
                  border-radius: 12px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  font-family: -apple-system, sans-serif;
                }
              </style>
            </head>
            <body>
              <div class="logo">📱</div>
              <h1>Sin conexión</h1>
              <p>Abre la app una vez con internet para que funcione sin conexión.</p>
              <button onclick="location.reload()">Reintentar</button>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }

        return new Response('', { status: 503 });
      });
    })
  );
});

/* ------------------------------------------------
   MESSAGE
------------------------------------------------ */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
