// sw.js — Service Worker para Web Push Notifications
// Ubicar en: /public/sw.js

const CACHE_NAME = 'taller-motos-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

// ── Recibir notificación push ────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return

  let payload
  try { payload = e.data.json() }
  catch { payload = { titulo: 'Taller Motos', cuerpo: e.data.text(), card_id: null } }

  const options = {
    body: payload.cuerpo,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: `card-${payload.card_id || 'general'}`,   // agrupa notif de la misma card
    renotify: true,
    data: { card_id: payload.card_id, url: payload.card_id ? `/cards/${payload.card_id}` : '/tablero' },
    actions: payload.card_id
      ? [{ action: 'ver', title: 'Ver orden' }, { action: 'cerrar', title: 'Cerrar' }]
      : [{ action: 'cerrar', title: 'Cerrar' }],
    vibrate: [200, 100, 200],
  }

  e.waitUntil(
    self.registration.showNotification(payload.titulo, options)
  )
})

// ── Click en la notificación ─────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close()

  if (e.action === 'cerrar') return

  const url = e.notification.data?.url || '/tablero'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si ya hay una ventana abierta, navegar ahí
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.postMessage({ type: 'NAVIGATE', url })
        return
      }
      // Si no hay ventana, abrir una nueva
      return self.clients.openWindow(url)
    })
  )
})
