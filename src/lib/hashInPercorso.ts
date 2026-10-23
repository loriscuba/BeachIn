// Con BrowserRouter (Cloudflare, Vercel, produzione) un link in stile hash va convertito in percorso:
// i manifest delle app installate partono da "./#/comandapp" e "./#/adminapp" (validi anche su GitHub Pages, HashRouter).
// Modulo a parte, importato per primo in main.tsx: deve girare PRIMA che `router.tsx` crei il router,
// che legge l'indirizzo una volta sola (altrimenti l'app installata aprirebbe il gestionale su "/").
if (import.meta.env.VITE_ROUTER !== 'hash' && window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', `${import.meta.env.BASE_URL}${window.location.hash.slice(2)}`)
}
// Al contrario, con HashRouter (GitHub Pages) un percorso aperto da un'app installata ("/BeachIn/salaapp", servito da 404.html)
// diventa "#/salaapp": i manifest di admin e sala usano un percorso, così ognuna ha il suo scope e Chrome non le confonde.
if (import.meta.env.VITE_ROUTER === 'hash' && !window.location.hash) {
  const base = import.meta.env.BASE_URL
  const resto = window.location.pathname.startsWith(base) ? window.location.pathname.slice(base.length) : ''
  if (resto && resto !== 'index.html') window.history.replaceState(null, '', `${base}#/${resto}${window.location.search}`)
}
export {}
