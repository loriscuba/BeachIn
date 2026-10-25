/**
 * QR fissi dei tavoli: un QR stampato per tavolo (link con codice non indovinabile, `urlTavoloQr`).
 * Dal telefono si ordina solo se il tavolo è aperto (lo apre il cameriere, o si apre da solo alla prima comanda).
 * Qui si sceglie il menu di ogni tavolo (Ristorante, Bar, Lavagnetta), si apre/chiude e si stampano i QR.
 */
import { useMemo, useState } from 'react'
import { Lock, Printer, QrCode } from 'lucide-react'
import type { TavoloQr } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { QrCodice, stampaQr } from '@/components/QrCodice'
import { config } from '@/data/config'
import { urlTavoloQr } from '@/lib/sala'
import { cn } from '@/lib/cn'
import { MENU_SELF } from './AvvioSelf'
import TavoliPerZona from './TavoliPerZona'

export default function QrTavoli() {
  const { tavoliDelGiorno, tavoliQr, assicuraTavoliQr, impostaTavoloQr } = useDemoData()
  const conBar = useModuli().moduloAttivo('bar-tavolo')
  const menu = MENU_SELF.filter((m) => m.id !== 'bar' || conBar)
  const tavoli = useMemo(() => tavoliDelGiorno(config.oggi), [tavoliDelGiorno])
  const [scelto, setScelto] = useState<number | null>(null)
  const qr = (n: number) => tavoliQr.find((q) => q.numero === n)
  const nomeMenu = (m: TavoloQr['menu']) => MENU_SELF.find((x) => x.id === m)?.nome ?? m
  const sel = scelto == null ? undefined : qr(scelto) ?? assicuraTavoliQr([scelto])[0]
  const aperti = tavoliQr.filter((q) => q.aperto)

  const stampa = (numeri: number[]) => {
    const righe = assicuraTavoliQr(numeri)
    void stampaQr(righe.map((q) => ({ titolo: `Tavolo ${q.numero}`, sottotitolo: 'Inquadra e ordina dal telefono', url: urlTavoloQr(q.codice) })), config.nome)
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader titolo="QR dei tavoli" sottotitolo="Un QR fisso per tavolo: dal telefono si ordina solo quando il tavolo è aperto"
          azione={<div className="flex flex-wrap gap-2">
            {aperti.length > 0 && <Button dimensione="sm" onClick={() => { if (confirm(`Chiudere tutti i ${aperti.length} tavoli aperti?`)) aperti.forEach((q) => impostaTavoloQr(q.numero, { aperto: false })) }}><Lock className="h-4 w-4" /> Chiudi tutti</Button>}
            <Button dimensione="sm" variante="primario" onClick={() => stampa([...tavoli].sort((a, b) => a.numero - b.numero).map((t) => t.numero))}><Printer className="h-4 w-4" /> Stampa tutti</Button>
          </div>} />
        <CardBody className="pt-2">
          <TavoliPerZona tavoli={tavoli} scelto={scelto} onScegli={setScelto}
            evidenzia={(t) => !!qr(t.numero)?.aperto}
            nota={(t) => { const q = qr(t.numero); return q?.aperto ? 'aperto' : nomeMenu(q?.menu ?? 'ristorante') }} />
          <p className="mt-3 text-xs text-profondo/55">In giallo i tavoli aperti. Il cameriere apre il tavolo dalla sua schermata ("Apri tavolo"), e si apre da solo quando manda la prima comanda.</p>
        </CardBody>
      </Card>

      <Card className="md:sticky md:top-4 md:self-start">
        <CardHeader titolo={sel ? `Tavolo ${sel.numero}` : 'Scegli un tavolo'} sottotitolo={sel ? (sel.aperto ? 'Aperto: si ordina dal telefono' : 'Chiuso: il QR mostra "chiedi al cameriere"') : 'Tocca un tavolo a sinistra'} />
        {sel && (
          <CardBody className="space-y-3 pt-2">
            <QrCodice url={urlTavoloQr(sel.codice)} className="mx-auto w-48" />
            <p className="break-all text-center text-[11px] text-profondo/50">{urlTavoloQr(sel.codice)}</p>
            <div>
              <p className="mb-1 text-xs font-medium text-profondo/60">Menu del tavolo</p>
              <div className="grid grid-cols-3 gap-1.5">
                {menu.map((m) => (
                  <button key={m.id} type="button" onClick={() => impostaTavoloQr(sel.numero, { menu: m.id })}
                    className={cn('rounded-lg border px-2 py-1.5 text-xs font-semibold', sel.menu === m.id ? 'border-cabina bg-cabina text-white' : 'border-calce-200 text-profondo/70')}>
                    {m.nome}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variante={sel.aperto ? 'secondario' : 'primario'} onClick={() => impostaTavoloQr(sel.numero, { aperto: !sel.aperto })}>
                {sel.aperto ? <><Lock className="h-4 w-4" /> Chiudi</> : <><QrCode className="h-4 w-4" /> Apri tavolo</>}
              </Button>
              <Button onClick={() => stampa([sel.numero])}><Printer className="h-4 w-4" /> Stampa</Button>
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  )
}
