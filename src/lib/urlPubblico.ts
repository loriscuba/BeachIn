/** Indirizzo pubblico dell'app (GitHub Pages): usato quando la pagina gira dove un telefono non può arrivare. */
const URL_PUBBLICO = 'https://loriscuba.github.io/BeachIn/#/'

/**
 * URL raggiungibile da fuori per una rotta pubblica (es. `menu?tavolo=3`), per QR e link da condividere.
 * Su GitHub Pages / Vercel usa l'indirizzo corrente; in anteprima (artifact, localhost, file) ripiega su GitHub Pages,
 * altrimenti il QR conterrebbe un indirizzo non apribile dal telefono.
 */
export function urlPubblico(rotta: string): string {
  const { protocol, hostname } = window.location
  const raggiungibile = protocol === 'https:' && /(\.github\.io|\.vercel\.app)$/.test(hostname)
  if (!raggiungibile) return URL_PUBBLICO + rotta
  if (import.meta.env.VITE_ROUTER === 'hash') return `${window.location.href.split('#')[0]}#/${rotta}`
  return `${window.location.origin}${import.meta.env.BASE_URL}${rotta}`
}
