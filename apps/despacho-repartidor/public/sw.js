/*
 * Service worker de la app del repartidor. Solo guarda la interfaz para abrirla sin señal.
 * Nunca intercepta /api/ ni otros orígenes (Seguridad, bucket de evidencias): datos personales, fotos
 * y estados de despacho siempre se piden a la red. Cambiar VERSION invalida la interfaz guardada.
 */
const VERSION = 'despacho-repartidor-v1';
const NUCLEO = ['/', '/manifest.webmanifest', '/iconos/icono-192.png', '/iconos/icono-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(NUCLEO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((clave) => clave !== VERSION).map((clave) => caches.delete(clave))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (evento) => {
  const solicitud = evento.request;
  const url = new URL(solicitud.url);
  if (solicitud.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Navegación: red primero; sin señal, la última interfaz guardada (la app muestra el aviso «Sin conexión»).
  if (solicitud.mode === 'navigate') {
    evento.respondWith(fetch(solicitud).then((respuesta) => {
      const copia = respuesta.clone();
      if (respuesta.ok) caches.open(VERSION).then((cache) => cache.put('/', copia));
      return respuesta;
    }).catch(() => caches.match('/')));
    return;
  }

  // Recursos con hash de Vite e íconos: inmutables, se sirven desde caché.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/iconos/')) {
    evento.respondWith(caches.match(solicitud).then((guardada) => guardada || fetch(solicitud).then((respuesta) => {
      if (respuesta.ok) { const copia = respuesta.clone(); caches.open(VERSION).then((cache) => cache.put(solicitud, copia)); }
      return respuesta;
    })));
  }
});
