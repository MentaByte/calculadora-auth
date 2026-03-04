/* ================================================
   SERVICE WORKER - Calculadora PWA
   Estrategia: Cache First con fallback a red
   =============================================== */

const CACHE_NAME = 'calculadora-v1.3';

const BASE = self.location.pathname.replace(/sw\.js$/, '');

const PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'auth.js',
  BASE + 'core/index.html',
  BASE + 'fenix.html',
  BASE + 'manifest.json',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
];

/* ------------------------------------------------
   INSTALL
------------------------------------------------ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Precacheando archivos...');
      return Promise.allSettled(
        PRECACHE.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] No se pudo cachear:', url, err)
          )
        )
      );
    }).then(() => {
      console.log('[SW] Instalación completa');
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
            console.log('[SW] Eliminando caché vieja:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] Activado y en control');
      return self.clients.claim();
    })
  );
});

/* ------------------------------------------------
   FETCH
------------------------------------------------ */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;

  // Supabase siempre a la red — nunca cachear
  if (url.hostname.includes('supabase')) return;

  // core/index.html y auth.js — network first para validación fresca
  if (url.pathname.includes('core/index.html') || url.pathname.includes('auth.js')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // No intercepta otros dominios
  if (!isLocal) return;

  // El resto — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });

        return response;
      }).catch(() => {
        // Fallback para páginas HTML
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return new Response(
            `<!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Sin conexión</title>
              <style>
                body { font-family: Arial, sans-serif; display: flex; flex-direction: column;
                       align-items: center; justify-content: center; min-height: 100vh;
                       margin: 0; background: #fff8f7; color: #333; text-align: center; padding: 20px; }
                .logo { font-size: 48px; margin-bottom: 16px; }
                h1 { font-size: 20px; margin-bottom: 8px; }
                p { font-size: 14px; color: #666; max-width: 280px; }
                button { margin-top: 24px; padding: 12px 28px; background: #6b5f00;
                         color: #fff; border: none; border-radius: 8px; font-size: 15px;
                         font-weight: 700; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="logo">📱</div>
              <h1>Sin conexión</h1>
              <p>No hay internet. Abre la app una vez con conexión para que funcione offline.</p>
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
