/**
 * PWA instalable en Android. El service worker solo guarda la interfaz (HTML, JS, CSS e íconos) para abrir la app
 * sin señal; nunca guarda respuestas de la API ni fotos, porque contienen datos personales y estados vivos.
 */
export function registrarServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* Sin SW la app funciona igual, solo no es instalable. */ });
  });
}
