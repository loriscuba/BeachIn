/**
 * Domini propri del lido (Cloudflare Pages → Custom domains). Una sola build serve tutti gli indirizzi:
 * cosa si apre sulla radice dipende dal dominio da cui arriva il visitatore.
 * - sito: sito pubblico per i clienti sulla radice ("/" mostra la vetrina, "/sito/anteprima" diventa "/")
 * - app: app clienti (ComandApp) sulla radice, più le pagine dei QR (menu, tavolo, invito, prenotazione)
 * - gestione: app staff, come oggi su beachin.pages.dev
 * Ogni altro indirizzo (beachin.pages.dev, Vercel, GitHub Pages, localhost) resta com'è: tutto disponibile.
 */
export const DOMINI = {
  sito: ['lidodeipini.it', 'www.lidodeipini.it'],
  app: 'app.lidodeipini.it',
  gestione: 'gestione.lidodeipini.it',
}
