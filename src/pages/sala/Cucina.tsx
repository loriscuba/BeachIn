/**
 * Cucina: le comande del ristorante (dal cameriere o dal tablet al tavolo) in tre colonne
 * Da fare → In preparazione → Pronte. Campanello a ogni comanda nuova, minuti di attesa sulla scheda.
 */
import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, ChefHat, Clock, Tablet, Users, X } from 'lucide-react'
import type { ComandaSala, StatoComandaSala } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabaseAttivo } from '@/lib/supabase'
import { campanello, sbloccaAudio } from '@/lib/suoni'
import { cn } from '@/lib/cn'
import { azioneStatoSala, minutiDa } from '@/lib/sala'

const COLONNE: { stato: StatoComandaSala; titolo: string; colore: string }[] = [
  { stato: 'inviata', titolo: 'Da fare', colore: 'bg-boa' },
  { stato: 'in_preparazione', titolo: 'In preparazione', colore: 'bg-tenda' },
  { stato: 'pronta', titolo: 'Pronte da servire', colore: 'bg-acqua' },
]

export default function Cucina() {
  const { comandeSala, avanzaComandaSala, annullaComandaSala } = useDemoData()
  const [suoni, setSuoni] = useState(false)
  const [ora, setOra] = useState(Date.now())
  useEffect(() => { const t = window.setInterval(() => setOra(Date.now()), 30000); return () => window.clearInterval(t) }, [])

  // campanello quando arriva una comanda nuova (anche da un altro dispositivo)
  const visti = useRef(new Set(comandeSala.map((c) => c.id)))
  useEffect(() => {
    const nuove = comandeSala.filter((c) => !visti.current.has(c.id))
    nuove.forEach((c) => visti.current.add(c.id))
    if (suoni && nuove.some((c) => c.stato === 'inviata')) campanello()
  }, [comandeSala, suoni])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className={cn('text-xs font-medium', supabaseAttivo ? 'text-acqua' : 'text-tenda')}>
          {supabaseAttivo ? '● Comande condivise tra tutti i dispositivi (sala, tablet, cucina)' : '● Modalità demo: comande condivise solo tra schede di questo browser'}
        </p>
        <Button dimensione="sm" className="ml-auto" variante={suoni ? 'primario' : 'secondario'} onClick={() => { if (!suoni) { sbloccaAudio(); campanello() } setSuoni(!suoni) }}>
          {suoni ? <><Bell className="h-4 w-4" /> Campanello attivo</> : <><BellOff className="h-4 w-4" /> Attiva campanello</>}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLONNE.map((col) => {
          // in cucina si lavora dalla più vecchia
          const lista = comandeSala.filter((c) => c.stato === col.stato).sort((a, b) => a.ts - b.ts)
          return (
            <section key={col.stato} className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-profondo">
                <span className={cn('h-2.5 w-2.5 rounded-full', col.colore)} /> {col.titolo}
                <span className="num text-profondo/45">{lista.length}</span>
              </h3>
              {!lista.length && <p className="rounded-2xl border border-dashed border-calce-300 p-6 text-center text-sm text-profondo/45">Niente qui</p>}
              {lista.map((c) => <SchedaComanda key={c.id} c={c} ora={ora} onAvanza={() => avanzaComandaSala(c.id)} onAnnulla={() => { if (confirm(`Annullare la comanda del tavolo ${c.tavolo}?`)) annullaComandaSala(c.id) }} />)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function SchedaComanda({ c, ora, onAvanza, onAnnulla }: { c: ComandaSala; ora: number; onAvanza: () => void; onAnnulla: () => void }) {
  const min = minutiDa(c.ts, ora)
  // righe raggruppate per sezione (uscite: antipasti, primi…)
  const gruppi = c.righe.reduce<Record<string, typeof c.righe>>((g, r) => { (g[r.sezione] ??= []).push(r); return g }, {})
  return (
    <Card className={cn('overflow-hidden', c.stato === 'inviata' && min >= 10 && 'ring-2 ring-boa/60')}>
      <div className="flex items-center gap-2 border-b border-calce-200 px-4 py-2.5">
        <span className="font-display text-2xl font-semibold text-profondo">Tavolo {c.tavolo}</span>
        {c.coperti && <span className="inline-flex items-center gap-1 text-xs text-profondo/55"><Users className="h-3.5 w-3.5" />{c.coperti}</span>}
        <span className={cn('num ml-auto inline-flex items-center gap-1 text-xs font-semibold', min >= 15 ? 'text-boa' : 'text-profondo/55')}><Clock className="h-3.5 w-3.5" />{c.ora} · {min}′</span>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm">
        {Object.entries(gruppi).map(([sez, righe]) => (
          <div key={sez}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{sez}</p>
            {righe.map((r) => (
              <p key={r.piattoId} className="text-profondo"><span className="num mr-1.5 font-bold text-cabina">{r.quantita}×</span>{r.nome}</p>
            ))}
          </div>
        ))}
        {c.note && <p className="rounded-lg bg-tenda/20 px-2.5 py-1.5 text-profondo">📝 {c.note}</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-calce-200 px-4 py-2.5">
        {c.origine === 'self' ? <Badge tono="mare"><Tablet className="h-3 w-3" /> Tablet al tavolo</Badge> : <Badge tono="neutro"><ChefHat className="h-3 w-3" /> {c.cameriere ?? 'Sala'}</Badge>}
        <button type="button" onClick={onAnnulla} className="ml-auto grid h-8 w-8 place-content-center rounded-lg text-profondo/35 hover:bg-boa/10 hover:text-boa" aria-label="Annulla comanda" title="Annulla comanda"><X className="h-4 w-4" /></button>
        {azioneStatoSala[c.stato] && <Button dimensione="sm" variante="primario" onClick={onAvanza}>{azioneStatoSala[c.stato]}</Button>}
      </div>
    </Card>
  )
}
