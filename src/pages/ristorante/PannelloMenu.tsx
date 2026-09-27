import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Languages, Printer, ExternalLink } from 'lucide-react'
import type { LinguaMenu, Piatto } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { QrCodice, stampaQr } from '@/components/QrCodice'
import { LINGUE, LINGUE_ESTERE, urlMenu } from '@/lib/menuLingue'
import AssistenteVocale from '@/pages/AssistenteVocale'
import { EditorMenu } from './EditorMenu'
import { config } from '@/data/config'

const inTraduzione = (p: Piatto) => !!p.traduzioni && LINGUE_ESTERE.some((l) => !p.traduzioni?.[l])

/** Sottosezione Menu: assistente vocale, menu pubblico in 5 lingue e QR da tavolo. */
export function PannelloMenu() {
  const { menu } = useDemoData()
  const vocale = useModuli().moduloAttivo('assistente-vocale')
  const [lingua, setLingua] = useState<Exclude<LinguaMenu, 'it'>>('en')
  const pendenti = menu.filter(inTraduzione).length
  const url = urlMenu()

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            titolo={<span className="inline-flex items-center gap-2"><Languages className="h-4 w-4 text-cabina" /> Menu</span>}
            sottotitolo={`${menu.length} piatti · ${pendenti ? `traduzione in corso di ${pendenti}…` : 'tradotto in 5 lingue'} · clicca su nomi, prezzi e traduzioni per modificarli`}
            azione={
              <div className="flex gap-1">
                {LINGUE.filter((l) => l.id !== 'it').map((l) => (
                  <button key={l.id} onClick={() => setLingua(l.id as Exclude<LinguaMenu, 'it'>)} title={l.nome}
                    className={`rounded-md px-2 py-1 text-lg ${lingua === l.id ? 'bg-profondo/10 ring-1 ring-profondo/30' : 'opacity-60 hover:opacity-100'}`}>{l.bandiera}</button>
                ))}
              </div>
            }
          />
          <CardBody className="max-h-[40rem] overflow-y-auto pt-1">
            <EditorMenu lingua={lingua} />
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
