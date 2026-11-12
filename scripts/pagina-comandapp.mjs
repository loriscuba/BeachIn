// Dopo la build: crea dist/comandapp.html, copia di index.html con titolo, icone e anteprima link (WhatsApp, Telegram…)
// dell'app clienti "Lido dei Pini App". Le anteprime leggono solo l'HTML statico, non il titolo messo da React.
// Cloudflare Pages serve /comandapp da comandapp.html; su Vercel c'è il rewrite in vercel.json.
import { readFileSync, writeFileSync } from 'node:fs'

const base = process.env.VITE_BASE || '/'
const sito = (process.env.SITO_URL || 'https://beachin.pages.dev').replace(/\/$/, '')
const titolo = 'Lido dei Pini App'
const descrizione = "L'app del Lido dei Pini: ordini dall'ombrellone, prenotazioni, news, eventi e lavagnetta"
const immagine = `${sito}${base}comandapp-og.png`

let html = readFileSync('dist/index.html', 'utf8')
html = html.replace(/\s*<link rel="icon"[^>]*>/g, '')
html = html.replace(/<title>.*?<\/title>/, `<title>${titolo}</title>
    <link rel="icon" href="${base}lido-favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="${base}lido-favicon-32.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="${base}comandapp-icon-192.png" />
    <link rel="apple-touch-icon" href="${base}comandapp-icon-192.png" />
    <link rel="manifest" href="${base}comandapp.webmanifest" />
    <meta name="apple-mobile-web-app-title" content="${titolo}" />
    <meta name="application-name" content="${titolo}" />
    <meta name="description" content="${descrizione}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${titolo}" />
    <meta property="og:title" content="${titolo}" />
    <meta property="og:description" content="${descrizione}" />
    <meta property="og:url" content="${sito}${base}comandapp" />
    <meta property="og:image" content="${immagine}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${titolo}" />
    <meta name="twitter:description" content="${descrizione}" />
    <meta name="twitter:image" content="${immagine}" />`)
writeFileSync('dist/comandapp.html', html)
console.log('dist/comandapp.html creato')
