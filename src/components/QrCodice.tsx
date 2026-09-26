import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

const opz = { type: 'svg' as const, margin: 1, color: { dark: '#0F3B4C', light: '#FFFFFF' } }

/** QR code in SVG (nessuna rete: generato nel browser). */
export function QrCodice({ url, className }: { url: string; className?: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => { QRCode.toString(url, opz).then(setSvg) }, [url])
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}

/** Apre una pagina stampabile con un cartoncino per ogni QR (es. uno per tavolo). */
export async function stampaQr(voci: { titolo: string; sottotitolo?: string; url: string }[], intestazione: string) {
  const svgs = await Promise.all(voci.map((v) => QRCode.toString(v.url, opz)))
  const w = window.open('', '_blank')
  if (!w) return
  const card = (v: (typeof voci)[number], i: number) =>
    `<div class="c"><p class="h">${intestazione}</p>${svgs[i]}<p class="t">${v.titolo}</p>${v.sottotitolo ? `<p class="s">${v.sottotitolo}</p>` : ''}</div>`
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR menu</title><style>
    body{font-family:Georgia,serif;margin:0;padding:12mm;color:#0F3B4C}
    .g{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}
    .c{border:1px dashed #9aa;border-radius:4mm;padding:6mm;text-align:center;break-inside:avoid}
    .c svg{width:100%;height:auto} .h{margin:0 0 3mm;font-size:11pt;letter-spacing:.1em;text-transform:uppercase}
    .t{margin:3mm 0 0;font-size:16pt;font-weight:bold} .s{margin:1mm 0 0;font-size:9pt;color:#567}
  </style></head><body><div class="g">${voci.map(card).join('')}</div><script>setTimeout(()=>print(),300)</script></body></html>`)
  w.document.close()
}
