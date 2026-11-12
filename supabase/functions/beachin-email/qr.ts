// QR dell'invito in PNG per la mail, uguale a quello della pagina invito (src/components/QrCodice.tsx):
// moduli nel colore scelto, correzione H, riquadro bianco al centro col logo del lido tinto dello stesso colore.
// PNG e non SVG/data URI perché Gmail, iPhone e Outlook mostrano solo immagini remote in formati raster.
import QRCode from 'npm:qrcode@1.5.4'
import { PNG } from 'npm:pngjs@7.0.0'

const PX = 10 // pixel per modulo: ~430 px di lato, nitido anche mostrato a 200 px su schermi retina

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/** Disegna il QR (con il logo PNG al centro, se c'è) e restituisce i byte del PNG. */
export function pngQr(url: string, colore: string, logo: Uint8Array | null): Uint8Array {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const n: number = modules.size
  const m = 1 // margine bianco in moduli
  let s = Math.round(n * 0.22); if (s % 2 !== n % 2) s += 1 // stesso riquadro centrale della pagina invito
  const a = (n - s) / 2
  const sotto = (r: number, c: number) => !!logo && r >= a && r < a + s && c >= a && c < a + s
  const lato = (n + 2 * m) * PX
  const img = new PNG({ width: lato, height: lato })
  const [cr, cg, cb] = rgb(colore)
  const metti = (x: number, y: number, r: number, g: number, b: number, alfa = 1) => {
    const i = (y * lato + x) * 4, d = img.data
    d[i] = Math.round(d[i] * (1 - alfa) + r * alfa); d[i + 1] = Math.round(d[i + 1] * (1 - alfa) + g * alfa)
    d[i + 2] = Math.round(d[i + 2] * (1 - alfa) + b * alfa); d[i + 3] = 255
  }
  img.data.fill(255)
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!modules.get(r, c) || sotto(r, c)) continue
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) metti((c + m) * PX + x, (r + m) * PX + y, cr, cg, cb)
  }
  if (!logo) return PNG.sync.write(img)

  // riquadro bianco arrotondato (già bianco: basta non disegnarci moduli) e logo dentro con mezzo modulo di bordo
  const sorgente = PNG.sync.read(logo)
  const box = (s - 1) * PX, x0 = (a + m + 0.5) * PX, y0 = (a + m + 0.5) * PX
  const k = Math.min(box / sorgente.width, box / sorgente.height) // "meet": logo intero, centrato
  const w = sorgente.width * k, h = sorgente.height * k
  const ox = x0 + (box - w) / 2, oy = y0 + (box - h) / 2
  const CAMP = 4 // campioni per lato: media dell'alfa per un rimpicciolimento pulito
  for (let y = Math.floor(oy); y < Math.ceil(oy + h); y++) for (let x = Math.floor(ox); x < Math.ceil(ox + w); x++) {
    let somma = 0
    for (let j = 0; j < CAMP; j++) for (let i = 0; i < CAMP; i++) {
      const sx = Math.floor((x + (i + 0.5) / CAMP - ox) / k), sy = Math.floor((y + (j + 0.5) / CAMP - oy) / k)
      if (sx >= 0 && sy >= 0 && sx < sorgente.width && sy < sorgente.height) somma += sorgente.data[(sy * sorgente.width + sx) * 4 + 3]
    }
    const alfa = somma / (CAMP * CAMP * 255)
    if (alfa > 0) metti(x, y, cr, cg, cb, alfa)
  }
  return PNG.sync.write(img)
}
