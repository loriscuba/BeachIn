/* Service worker delle app BeachIn (admin e clienti): riceve le notifiche push anche a schermo bloccato.
   Admin: nuove prenotazioni. Clienti: nuove news e lavagna aggiornata. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { corpo: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.titolo || 'BeachIn', {
    body: d.corpo || 'Nuova prenotazione da confermare',
    icon: d.app === 'clienti' ? 'comandapp-icon-192.png' : 'admin-icon-192.png',
    badge: d.app === 'clienti' ? 'comandapp-icon-192.png' : 'admin-icon-192.png',
    tag: d.tag,
    renotify: true,
    requireInteraction: d.app !== 'clienti',
    vibrate: [200, 100, 200],
    data: { url: d.url, app: d.app },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const dati = e.notification.data || {}
  const url = dati.url || self.registration.scope
  const pagina = dati.app === 'clienti' ? 'comandapp' : 'adminapp'
  e.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const f of finestre) {
      // app già aperta (magari sospesa): la porto in primo piano e le chiedo di aggiornarsi
      if (f.url.includes(pagina)) { await f.focus(); f.postMessage({ tipo: 'aggiorna' }); return }
    }
    await self.clients.openWindow(url)
  })())
})
