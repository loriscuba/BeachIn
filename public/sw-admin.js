/* Service worker delle app BeachIn (staff e clienti).
   1) Notifiche push anche a schermo bloccato. Staff: nuove prenotazioni. Clienti: nuove news e lavagna aggiornata.
   2) Cache per l'apertura istantanea: pagina dalla rete (dalla cache se la rete non risponde in 3 s o manca),
      file con hash di /assets/ dalla cache, icone e font dalla cache aggiornata in sottofondo.
      I dati (Supabase, altro dominio) non passano mai dalla cache. */
const CACHE = 'beachin-app-v1'
const MAX_FILE = 160

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('beachin-app-') && k !== CACHE) await caches.delete(k)
  await self.clients.claim()
})()))

// i file vecchi (deploy precedenti) escono per primi
async function sfoltisci(cache) {
  const chiavi = await cache.keys()
  for (let i = 0; i < chiavi.length - MAX_FILE; i++) await cache.delete(chiavi[i])
}

async function salva(req, res) {
  if (!res || !(res.ok || res.type === 'opaque')) return
  const cache = await caches.open(CACHE)
  await cache.put(req, res)
  await sfoltisci(cache)
}

// tutte le rotte sono la stessa pagina (app a pagina singola): una sola copia in cache
const CHIAVE_PAGINA = new URL('./', self.registration.scope).href

async function pagina(e) {
  const rete = fetch(e.request).then((res) => { if (res.ok) e.waitUntil(salva(CHIAVE_PAGINA, res.clone())); return res })
  const tardi = new Promise((ok) => setTimeout(ok, 3000))
  try {
    const res = await Promise.race([rete, tardi.then(() => null)])
    if (res) return res
  } catch { /* rete assente: si usa la copia */ }
  const copia = await caches.match(CHIAVE_PAGINA)
  return copia || rete
}

async function primaCache(e) {
  const copia = await caches.match(e.request)
  if (copia) return copia
  const res = await fetch(e.request)
  e.waitUntil(salva(e.request, res.clone()))
  return res
}

async function copiaPoiAggiorna(e) {
  const copia = await caches.match(e.request)
  const rete = fetch(e.request).then((res) => { e.waitUntil(salva(e.request, res.clone())); return res })
  if (copia) { e.waitUntil(rete.catch(() => undefined)); return copia }
  return rete
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  if (url.origin !== self.location.origin && !font) return
  if (url.pathname.endsWith('/sw-admin.js')) return
  if (req.mode === 'navigate') return e.respondWith(pagina(e))
  if (url.pathname.includes('/assets/')) return e.respondWith(primaCache(e))
  if (font || /\.(png|svg|jpe?g|webp|ico|webmanifest|woff2?)$/.test(url.pathname)) return e.respondWith(copiaPoiAggiorna(e))
})

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
  const clienti = dati.app === 'clienti'
  e.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const f of finestre) {
      // app già aperta (magari sospesa): la porto in primo piano e le chiedo di aggiornarsi (staff = tutto tranne ComandApp)
      if (f.url.includes('comandapp') === clienti) { await f.focus(); f.postMessage({ tipo: 'aggiorna' }); return }
    }
    await self.clients.openWindow(url)
  })())
})
