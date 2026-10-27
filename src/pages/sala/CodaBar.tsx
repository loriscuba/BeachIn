/**
 * Coda unica del bar (modulo Bar al tavolo): comande dagli ombrelloni e bevande dei tavoli del ristorante.
 * Schermata intera = la stessa della Cucina a tre colonne (`<Cucina reparto="bar" />`); `compatta` = un solo elenco,
 * dentro la pagina Comande. Il campanello delle voci nuove è nel centro notifiche (in alto a destra).
 */
import { useEffect, useMemo, useState } from 'react'
import { useDemoData } from '@/context/DemoDataContext'
import { codaBar, perReparto, type VoceBar } from '@/lib/sala'
import Cucina, { SchedaComanda, azioniTavolo } from './Cucina'
import { ComandaCard } from './ComandaOmbrellone'

export default function CodaBar({ compatta = false }: { compatta?: boolean }) {
  if (!compatta) return <Cucina reparto="bar" />
  return <Elenco />
}

function Elenco() {
  const { comande, comandeSala } = useDemoData()
  const { daFare, pronte } = useMemo(() => codaBar(comande, comandeSala), [comande, comandeSala])
  const [ora, setOra] = useState(Date.now())
  useEffect(() => { const t = window.setInterval(() => setOra(Date.now()), 30000); return () => window.clearInterval(t) }, [])
  const chiave = (v: VoceBar) => `${v.tipo}-${v.c.id}`

  return (
    <div className="space-y-2">
      {!daFare.length && <p className="rounded-2xl border border-dashed border-calce-300 p-6 text-center text-sm text-profondo/45">Niente da preparare.</p>}
      {daFare.map((v) => <Voce key={chiave(v)} v={v} ora={ora} />)}
      {pronte.length > 0 && <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">Pronte</p>}
      {pronte.map((v) => <Voce key={chiave(v)} v={v} ora={ora} />)}
    </div>
  )
}

function Voce({ v, ora }: { v: VoceBar; ora: number }) {
  const { avanzaComanda, annullaComanda, segnaRigheSala, chiamaUscitaSala } = useDemoData()
  if (v.tipo === 'ombrellone') return <ComandaCard comanda={v.c} onAvanza={() => avanzaComanda(v.c.id)} onAnnulla={() => annullaComanda(v.c.id)} />
  const vista = perReparto(v.c, 'bar')
  if (!vista) return null
  return <SchedaComanda c={vista.c} ora={ora} {...azioniTavolo(vista.c, vista.indici, segnaRigheSala)} onVia={(n) => chiamaUscitaSala(v.c.id, n)} />
}
