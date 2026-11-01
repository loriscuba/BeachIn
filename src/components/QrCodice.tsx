import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { logoLido } from '@/assets/sito'

/**
 * Colore del QR per uso: tavoli in blu, inviti eventi in rosso, gli altri (menu, link app) nel navy del lido.
 * Tutti hanno il logo del lido al centro (quello di `@/assets/sito`, cambia col cliente) e correzione errori alta (H, 30%).
 */
export type TipoQr = 'tavolo' | 'evento' | 'neutro'
export const COLORE_QR: Record<TipoQr, string> = { tavolo: '#1D4E89', evento: '#B3261E', neutro: '#0F3B4C' }

/** Logo come data URL (serve anche nella finestra di stampa); una sola lettura, condivisa. */
let logoDataUrl: Promise<string | null> | null = null
function caricaLogo(): Promise<string | null> {
  logoDataUrl ??= fetch(logoLido)
    .then((r) => r.blob())
    .then((b) => new Promise<string>((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result as string); fr.onerror = ko; fr.readAsDataURL(b) }))
    .catch(() => null)
  return logoDataUrl
}

/** SVG del QR: moduli nel colore scelto, riquadro bianco al centro col logo tinto dello stesso colore. */
export async function svgQr(url: string, tipo: TipoQr = 'neutro'): Promise<string> {
  const colore = COLORE_QR[tipo]
  const logo = await caricaLogo()
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const n = modules.size
  const m = 1 // margine bianco in moduli
  // riquadro centrale ~22% del lato, dispari come n così resta centrato sui moduli
  let s = Math.round(n * 0.22); if (s % 2 !== n % 2) s += 1
  const a = (n - s) / 2
  const sotto = (r: number, c: number) => logo && r >= a && r < a + s && c >= a && c < a + s
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (modules.get(r, c) && !sotto(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`
  const t = n + 2 * m
  const id = `qrl${colore.slice(1)}`
  const centro = logo
    ? `<defs><filter id="${id}" color-interpolation-filters="sRGB"><feFlood flood-color="${colore}"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs>` +
      `<rect x="${a + m}" y="${a + m}" width="${s}" height="${s}" rx="${s * 0.18}" fill="#fff"/>` +
      `<image href="${logo}" x="${a + m + 0.5}" y="${a + m + 0.5}" width="${s - 1}" height="${s - 1}" preserveAspectRatio="xMidYMid meet" filter="url(#${id})"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="#fff"/><path fill="${colore}" d="${d}"/>${centro}</svg>`
}

/** QR code in SVG (nessuna rete: generato nel browser), col logo del lido al centro. */
export function QrCodice({ url, className, tipo = 'neutro' }: { url: string; className?: string; tipo?: TipoQr }) {
  const [svg, setSvg] = useState('')
  useEffect(() => { let vivo = true; svgQr(url, tipo).then((x) => { if (vivo) setSvg(x) }); return () => { vivo = false } }, [url, tipo])
  return <div className={`bi-qr ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: svg }} />
}

/** Apre una pagina stampabile con un cartoncino per ogni QR (es. uno per tavolo). */
export async function stampaQr(voci: { titolo: string; sottotitolo?: string; url: string }[], intestazione: string, tipo: TipoQr = 'neutro') {
  // la finestra si apre subito (i browser bloccano i popup aperti dopo un'attesa), il contenuto arriva dopo
  const w = window.open('', '_blank')
  if (!w) return
  const svgs = await Promise.all(voci.map((v) => svgQr(v.url, tipo)))
  const colore = COLORE_QR[tipo]
  const card = (v: (typeof voci)[number], i: number) =>
    `<div class="c"><p class="h">${intestazione}</p>${svgs[i]}<p class="t">${v.titolo}</p>${v.sottotitolo ? `<p class="s">${v.sottotitolo}</p>` : ''}</div>`
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR menu</title><style>
    body{font-family:Georgia,serif;margin:0;padding:12mm;color:${colore}}
    .g{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}
    .c{border:1px dashed #9aa;border-radius:4mm;padding:6mm;text-align:center;break-inside:avoid}
    .c svg{width:100%;height:auto} .h{margin:0 0 3mm;font-size:11pt;letter-spacing:.1em;text-transform:uppercase}
    .t{margin:3mm 0 0;font-size:16pt;font-weight:bold} .s{margin:1mm 0 0;font-size:9pt;color:#567}
  </style></head><body><div class="g">${voci.map(card).join('')}</div><script>setTimeout(()=>print(),300)</script></body></html>`)
  w.document.close()
}
