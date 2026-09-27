/* Service worker dell'app admin BeachIn: riceve le notifiche push (nuove prenotazioni) anche a schermo bloccato. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { corpo: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.titolo || 'BeachIn', {
    body: d.corpo || 'Nuova prenotazione da confermare',
    icon: 'admin-icon-192.png',
    badge: 'admin-icon-192.png',
    tag: d.tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: d.url },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope
  e.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const f of finestre) {
      // app già aperta (magari sospesa): la porto in primo piano e le chiedo di aggiornarsi
      if (f.url.includes('adminapp')) { await f.focus(); f.postMessage({ tipo: 'aggiorna' }); return }
    }
    await self.clients.openWindow(url)
  })())
})
