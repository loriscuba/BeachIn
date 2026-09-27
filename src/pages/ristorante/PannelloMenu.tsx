import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Languages, Loader2, Printer, ExternalLink, Pencil, Check } from 'lucide-react'
import type { LinguaMenu, Piatto } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { QrCodice, stampaQr } from '@/components/QrCodice'
import { LINGUE, LINGUE_ESTERE, urlMenu } from '@/lib/menuLingue'
import AssistenteVocale from '@/pages/AssistenteVocale'
import { config } from '@/data/config'
import { euroCent } from '@/lib/formatters'

const inTraduzione = (p: Piatto) => !!p.traduzioni && LINGUE_ESTERE.some((l) => !p.traduzioni?.[l])

/** Sottosezione Menu: assistente vocale, menu pubblico in 5 lingue e QR da tavolo. */
export function PannelloMenu() {
  const { menu, impostaTraduzione, modificaPrezzoPiatto } = useDemoData()
  const vocale = useModuli().moduloAttivo('assistente-vocale')
  const [lingua, setLingua] = useState<Exclude<LinguaMenu, 'it'>>('en')
  const [modifica, setModifica] = useState<{ id: string; testo: string }>()
  const [prezzo, setPrezzo] = useState<{ id: string; testo: string }>()
  const pendenti = menu.filter(inTraduzione).length
  const url = urlMenu()

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            titolo={<span className="inline-flex items-center gap-2"><Languages className="h-4 w-4 text-cabina" /> Menu</span>}
            sottotitolo={`${menu.length} piatti · ${pendenti ? `traduzione in corso di ${pendenti}…` : 'tradotto in 5 lingue'} · clicca prezzo o traduzione per modificarli`}
            azione={
              <div className="flex gap-1">
                {LINGUE.filter((l) => l.id !== 'it').map((l) => (
                  <button key={l.id} onClick={() => setLingua(l.id as Exclude<LinguaMenu, 'it'>)} title={l.nome}
                    className={`rounded-md px-2 py-1 text-lg ${lingua === l.id ? 'bg-profondo/10 ring-1 ring-profondo/30' : 'opacity-60 hover:opacity-100'}`}>{l.bandiera}</button>
                ))}
              </div>
            }
          />
          <CardBody className="max-h-[32rem] overflow-y-auto pt-1">
            <ul className="divide-y divide-calce-200 text-sm">
              {menu.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-2/5 truncate font-medium text-profondo" title={p.nome}>{p.nome}</span>
                  {prezzo?.id === p.id ? (
                    <form className="flex w-24 gap-1" onSubmit={(e) => { e.preventDefault(); const v = Number(prezzo.testo.replace(',', '.')); if (v > 0) modificaPrezzoPiatto(p.id, Math.round(v * 100) / 100); setPrezzo(undefined) }}>
                      <input autoFocus inputMode="decimal" value={prezzo.testo} onChange={(e) => setPrezzo({ id: p.id, testo: e.target.value })} onBlur={() => setPrezzo(undefined)} className="num h-8 w-full rounded-md border border-calce-200 px-2 text-right" />
                    </form>
                  ) : (
                    <button onClick={() => setPrezzo({ id: p.id, testo: String(p.prezzo) })} className="num w-24 text-right font-semibold text-profondo hover:text-cabina" title="Modifica prezzo">{euroCent(p.prezzo)}</button>
                  )}
                  {modifica?.id === p.id ? (
                    <form className="flex flex-1 gap-1" onSubmit={(e) => { e.preventDefault(); impostaTraduzione(p.id, lingua, modifica.testo.trim()); setModifica(undefined) }}>
                      <input autoFocus value={modifica.testo} onChange={(e) => setModifica({ id: p.id, testo: e.target.value })} className="h-8 flex-1 rounded-md border border-calce-200 px-2" />
                      <button className="rounded-md bg-profondo px-2 text-white"><Check className="h-4 w-4" /></button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-profondo/70">
                        {p.traduzioni?.[lingua] ?? (p.traduzioni ? <span className="inline-flex items-center gap-1 text-tenda"><Loader2 className="h-3 w-3 animate-spin" /> in traduzione</span> : '—')}
                      </span>
                      <button onClick={() => setModifica({ id: p.id, testo: p.traduzioni?.[lingua] ?? '' })} className="text-profondo/40 hover:text-cabina" title="Correggi traduzione"><Pencil className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <div className="space-y-4">
        <Card>
          <CardHeader titolo="QR code del menu" sottotitolo="Da stampare e mettere sui tavoli" />
          <CardBody className="space-y-3 pt-1 text-center">
            <QrCodice url={url} className="mx-auto w-40" />
            <p className="break-all text-[11px] text-profondo/50">{url}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variante="secondario" onClick={() => stampaQr([{ titolo: 'Menu', sottotitolo: 'IT · EN · FR · DE · ES', url }], config.nome)}><Printer className="h-4 w-4" /> Stampa</Button>
              <Link to="/menu" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-calce-200 px-3 py-2 text-sm font-medium text-profondo hover:bg-calce/50"><ExternalLink className="h-4 w-4" /> Apri</Link>
            </div>
            <p className="text-xs text-profondo/50">QR per ogni tavolo: sottosezione <b>Tavoli</b>.</p>
          </CardBody>
        </Card>
          {vocale
            ? <AssistenteVocale compatto />
            : <p className="rounded-lg border border-dashed border-calce-300 p-4 text-sm text-profondo/60">Assistente vocale non attivo: attivalo da Impostazioni → Moduli per modificare il menu a voce.</p>}
        </div>
      </div>

    </div>
  )
}
