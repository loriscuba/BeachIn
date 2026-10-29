// iPhone/iPad: chiusa la tastiera o la rotella di una tendina (select), Safari lascia le barre "fixed" (menu in basso
// dell'app clienti, barra del carrello…) spostate in alto finché non si scorre la pagina. Qui, a campo chiuso, faccio
// io un micro-scorrimento avanti e indietro: Safari ricalcola la posizione e la barra torna in fondo allo schermo.
if (typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
  const campo = (el: EventTarget | null) => el instanceof HTMLElement && el.matches('input, select, textarea, [contenteditable="true"]')
  const sistema = () => {
    if (campo(document.activeElement)) return
    const y = window.scrollY
    window.scrollTo(window.scrollX, y > 0 ? y - 1 : y + 1)
    window.scrollTo(window.scrollX, y)
  }
  document.addEventListener('focusout', (e) => {
    if (!campo(e.target)) return
    // la tastiera si chiude in ~300 ms: ripasso anche a fine animazione
    for (const ms of [50, 350, 700]) setTimeout(sistema, ms)
  })
  window.visualViewport?.addEventListener('resize', () => setTimeout(sistema, 50))
}
export {}
