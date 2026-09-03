import { useEffect, useMemo, useState } from 'react'
import { Loader2, Coffee, TrendingDown, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ArticoloBar, CategoriaBar, Fascia, VenditaBarGiorno } from '@/data/types'
import { getArticoliBar, getVenditeBar } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Tabella, type Colonna } from '@/components/ui/Tabella'
import { euro, euroCent, numero, percento } from '@/lib/formatters'
import { etichetteCategoriaBar } from '@/lib/etichette'
import { cn } from '@/lib/cn'

const categorie: CategoriaBar[] = ['caffetteria', 'bibite', 'birre', 'cocktail', 'gelati', 'snack', 'gastronomia']
const fasce: { chiave: Fascia; label: string }[] = [
  { chiave: 'mattina', label: 'Mattina' }, { chiave: 'pranzo', label: 'Pranzo' },
  { chiave: 'pomeriggio', label: 'Pomeriggio' }, { chiave: 'sera', label: 'Sera' },
]

export default function Bar() {
  const { conti, incassaConto } = useDemoData()
  const [articoli, setArticoli] = useState<ArticoloBar[]>([])
  const [vendite, setVendite] = useState<VenditaBarGiorno[]>([])
  const [caricato, setCaricato] = useState(false)
  const [vista, setVista] = useState<'oggi' | 'stagione'>('oggi')

  useEffect(() => {
    Promise.all([getArticoliBar(), getVenditeBar()]).then(([a, v]) => {
      setArticoli(a); setVendite(v); setCaricato(true)
    })
  }, [])

  const agg = useMemo(() => {
    const oggi = config.stagione.oggi
    const set = vista === 'oggi' ? vendite.filter((v) => v.data === oggi) : vendite.filter((v) => v.data <= oggi)
    const incasso = set.reduce((s, v) => s + v.incasso, 0)
    const costoMerce = set.reduce((s, v) => s + v.costoMerce, 0)
    const scontrini = set.reduce((s, v) => s + v.numScontrini, 0)
    const perCategoria = categorie.map((c) => ({ categoria: c, valore: set.reduce((s, v) => s + v.perCategoria[c], 0) }))
    const perFascia = fasce.map((f) => ({ ...f, valore: set.reduce((s, v) => s + v.perFascia[f.chiave], 0) }))
    return {
      incasso, costoMerce, scontrini,
      scontrinoMedio: scontrini ? incasso / scontrini : 0,
      incidenza: incasso ? costoMerce / incasso : 0,
      perCategoria, perFascia,
      maxCat: Math.max(1, ...perCategoria.map((c) => c.valore)),
      maxFascia: Math.max(1, ...perFascia.map((f) => f.valore)),
    }
  }, [vendite, vista])

  const contiAperti = conti.filter((c) => c.aperto)
  const scorteBasse = articoli.filter((a) => a.giacenza < a.sogliaRiordino).length

  if (!caricato) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs valore={vista} onChange={setVista} opzioni={[{ valore: 'oggi', etichetta: 'Oggi' }, { valore: 'stagione', etichetta: 'Stagione a oggi' }]} />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icona={Coffee} etichetta={`Incasso ${vista === 'oggi' ? 'oggi' : 'stagione'}`} valore={euro(agg.incasso)} />
        <Kpi icona={Receipt} etichetta="Scontrino medio" valore={euroCent(agg.scontrinoMedio)} />
        <Kpi icona={TrendingDown} etichetta="Incidenza costo merce" valore={percento(agg.incidenza)} sotto={euro(agg.costoMerce)} />
        <Kpi icona={AlertTriangle} etichetta="Scorte sotto soglia" valore={String(scorteBasse)} accento={scorteBasse > 0} />
      </div>

      {/* Vendite per categoria e fascia */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader titolo="Vendite per categoria" sottotitolo={vista === 'oggi' ? 'Oggi' : 'Stagione a oggi'} />
          <CardBody className="space-y-2 pt-2">
            {agg.perCategoria.sort((a, b) => b.valore - a.valore).map((c) => (
              <BarraOrizz key={c.categoria} label={etichetteCategoriaBar[c.categoria]} valore={c.valore} max={agg.maxCat} />
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader titolo="Vendite per fascia oraria" sottotitolo={vista === 'oggi' ? 'Oggi' : 'Stagione a oggi'} />
          <CardBody className="space-y-2 pt-2">
            {agg.perFascia.map((f) => (
              <BarraOrizz key={f.chiave} label={f.label} valore={f.valore} max={agg.maxFascia} colore="#2E7D9A" />
            ))}
          </CardBody>
        </Card>
      </div>

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

      {/* Listino */}
      <Card>
        <CardHeader titolo="Listino e giacenze" sottotitolo={`${articoli.length} articoli`} />
        <CardBody className="px-1 py-1 sm:px-2">
          <ListinoBar articoli={articoli} />
        </CardBody>
      </Card>
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

function Kpi({ icona: Icona, etichetta, valore, sotto, accento }: { icona: typeof Coffee; etichetta: string; valore: string; sotto?: string; accento?: boolean }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
          <Icona className="h-3.5 w-3.5 text-cabina" /> {etichetta}
        </p>
        <p className={cn('num mt-0.5 text-2xl font-bold', accento ? 'text-boa' : 'text-profondo')}>{valore}</p>
        {sotto && <p className="num text-xs text-profondo/50">{sotto}</p>}
      </CardBody>
    </Card>
  )
}

function BarraOrizz({ label, valore, max, colore = '#D9A21A' }: { label: string; valore: number; max: number; colore?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-profondo">{label}</span>
        <span className="num text-profondo/70">{euro(valore)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-calce-200">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, (valore / max) * 100)}%`, background: colore }} />
      </div>
    </div>
  )
}
