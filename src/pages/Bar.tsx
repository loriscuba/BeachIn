import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { ArticoloBar } from '@/data/types'
import { getArticoliBar } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Tabella, type Colonna } from '@/components/ui/Tabella'
import { euroCent, numero, percento } from '@/lib/formatters'
import { etichetteCategoriaBar } from '@/lib/etichette'
import { cn } from '@/lib/cn'

export default function Bar() {
  const { conti, incassaConto } = useDemoData()
  const [articoli, setArticoli] = useState<ArticoloBar[]>([])
  const [caricato, setCaricato] = useState(false)
  const [q, setQ] = useSearchParams()
  // Sottosezioni dal menu laterale: Listino (giacenze) e Conti (per ombrellone).
  const tab = q.get('tab') === 'conti' ? 'conti' : 'listino'

  useEffect(() => {
    getArticoliBar().then((a) => { setArticoli(a); setCaricato(true) })
  }, [])

  const contiAperti = conti.filter((c) => c.aperto)

  if (!caricato) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <Tabs valore={tab} onChange={(v) => setQ({ tab: v }, { replace: true })} opzioni={[{ valore: 'listino', etichetta: 'Listino' }, { valore: 'conti', etichetta: 'Conti' }]} />

      {tab === 'conti' && (<>
      {/* Conti aperti */}
      <Card>
        <CardHeader titolo="Conti aperti per ombrellone" sottotitolo={`${contiAperti.length} conti da chiudere`} />
        <CardBody className="pt-1">
          {contiAperti.length === 0 ? (
            <p className="py-6 text-center text-sm text-profondo/50">Nessun conto aperto: tutto incassato.</p>
          ) : (
            <ul className="divide-y divide-calce-200">
              {contiAperti.map((c) => {
                const tot = c.righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-profondo">Postazione {c.postazioneId}</p>
                      <p className="truncate text-xs text-profondo/55">
                        {c.righe.length} articoli · {c.righe.slice(0, 2).map((r) => r.nome).join(', ')}
                        {c.righe.length > 2 ? '…' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="num text-sm font-bold text-profondo">{euroCent(tot)}</span>
                      <Button variante="primario" dimensione="sm" onClick={() => incassaConto(c.id)}>
                        <CheckCircle2 className="h-4 w-4" /> Incassa
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>
      </Card>
      </>)}

      {tab === 'listino' && (<>
      {/* Listino */}
      <Card>
        <CardHeader titolo="Listino e giacenze" sottotitolo={`${articoli.length} articoli`} />
        <CardBody className="px-1 py-1 sm:px-2">
          <ListinoBar articoli={articoli} />
        </CardBody>
      </Card>
      </>)}
    </div>
  )
}

function ListinoBar({ articoli }: { articoli: ArticoloBar[] }) {
  const colonne: Colonna<ArticoloBar>[] = [
    { chiave: 'nome', intestazione: 'Articolo', cella: (a) => <span className="font-medium text-profondo">{a.nome}</span> },
    { chiave: 'cat', intestazione: 'Categoria', nascondiMobile: true, cella: (a) => <span className="text-profondo/60">{etichetteCategoriaBar[a.categoria]}</span> },
    { chiave: 'prezzo', intestazione: 'Prezzo', allineaDx: true, cella: (a) => <span className="num">{euroCent(a.prezzoVendita)}</span> },
    { chiave: 'costo', intestazione: 'Costo', allineaDx: true, nascondiMobile: true, cella: (a) => <span className="num text-profondo/60">{euroCent(a.costoAcquisto)}</span> },
    {
      chiave: 'margine', intestazione: 'Margine', allineaDx: true,
      cella: (a) => <span className="num font-medium text-profondo">{percento((a.prezzoVendita - a.costoAcquisto) / a.prezzoVendita)}</span>,
    },
    {
      chiave: 'giacenza', intestazione: 'Giacenza', allineaDx: true,
      cella: (a) => (
        <span className={cn('num font-medium', a.giacenza < a.sogliaRiordino ? 'text-boa' : 'text-profondo')}>
          {numero(a.giacenza)}
          {a.giacenza < a.sogliaRiordino && <span className="ml-1 text-xs">↓</span>}
        </span>
      ),
    },
    { chiave: 'soglia', intestazione: 'Soglia', allineaDx: true, nascondiMobile: true, cella: (a) => <span className="num text-profondo/40">{a.sogliaRiordino}</span> },
  ]
  return <Tabella colonne={colonne} righe={articoli} chiaveRiga={(a) => a.id} denso />
}
