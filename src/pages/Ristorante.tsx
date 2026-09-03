import { useEffect, useMemo, useState } from 'react'
import { Loader2, UtensilsCrossed, Users, Receipt, TrendingDown, Star, ThumbsDown } from 'lucide-react'
import type {
  CategoriaPiatto, Piatto, PrenotazioneRistorante, ServizioRistoranteGiorno, StatoPrenotazione, Tavolo, Turno,
} from '@/data/types'
import { getMenu, getPrenotazioniRistorante, getServiziRistorante, getTavoli } from '@/data/api'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Tabella, type Colonna } from '@/components/ui/Tabella'
import { euro, euroCent, numero, percento } from '@/lib/formatters'
import { etichetteAllergene, etichetteCategoriaPiatto } from '@/lib/etichette'
import { cn } from '@/lib/cn'

const tonoStato: Record<StatoPrenotazione, 'acqua' | 'tenda' | 'neutro'> = {
  confermata: 'acqua', in_attesa: 'tenda', annullata: 'neutro',
}
const etichettaStato: Record<StatoPrenotazione, string> = {
  confermata: 'Confermata', in_attesa: 'In attesa', annullata: 'Annullata',
}
const zone = [
  { chiave: 'veranda', label: 'Veranda' }, { chiave: 'sala', label: 'Sala' }, { chiave: 'terrazza', label: 'Terrazza' },
] as const

const margine = (p: Piatto) => (p.prezzo - p.foodCost) / p.prezzo

export default function Ristorante() {
  const [menu, setMenu] = useState<Piatto[]>([])
  const [tavoli, setTavoli] = useState<Tavolo[]>([])
  const [servizi, setServizi] = useState<ServizioRistoranteGiorno[]>([])
  const [prenotazioni, setPrenotazioni] = useState<PrenotazioneRistorante[]>([])
  const [caricato, setCaricato] = useState(false)
  const [filtroCat, setFiltroCat] = useState<CategoriaPiatto | 'tutte'>('tutte')

  useEffect(() => {
    Promise.all([getMenu(), getTavoli(), getServiziRistorante(), getPrenotazioniRistorante()]).then(
      ([m, t, s, p]) => { setMenu(m); setTavoli(t); setServizi(s); setPrenotazioni(p); setCaricato(true) }
    )
  }, [])

  const oggi = config.stagione.oggi
  const kpi = useMemo(() => {
    const s = servizi.filter((x) => x.data === oggi)
    const coperti = s.reduce((a, x) => a + x.coperti, 0)
    const incasso = s.reduce((a, x) => a + x.incasso, 0)
    const fcNum = menu.reduce((a, p) => a + p.foodCost * p.vendutiStagione, 0)
    const ricNum = menu.reduce((a, p) => a + p.prezzo * p.vendutiStagione, 0)
    return { coperti, incasso, scontrino: coperti ? incasso / coperti : 0, incidenzaFc: ricNum ? fcNum / ricNum : 0 }
  }, [servizi, menu, oggi])

  const prenOggi = prenotazioni.filter((p) => p.data === oggi)
  const menuFiltrato = filtroCat === 'tutte' ? menu : menu.filter((p) => p.categoria === filtroCat)
  const piuVenduti = [...menu].sort((a, b) => b.vendutiStagione - a.vendutiStagione).slice(0, 4)
  const menoRedditizi = [...menu].filter((p) => p.categoria !== 'bevande').sort((a, b) => margine(a) - margine(b)).slice(0, 4)

  if (!caricato) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icona={Users} etichetta="Coperti oggi" valore={numero(kpi.coperti)} />
        <Kpi icona={UtensilsCrossed} etichetta="Incasso oggi" valore={euro(kpi.incasso)} />
        <Kpi icona={Receipt} etichetta="Scontrino medio" valore={euroCent(kpi.scontrino)} />
        <Kpi icona={TrendingDown} etichetta="Incidenza food cost" valore={percento(kpi.incidenzaFc)} />
      </div>

      {/* Prenotazioni + mappa tavoli */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader titolo="Prenotazioni di oggi" sottotitolo={`${prenOggi.length} prenotazioni`} />
          <CardBody className="grid gap-4 pt-2 sm:grid-cols-2">
            {(['pranzo', 'cena'] as Turno[]).map((turno) => {
              const list = prenOggi.filter((p) => p.turno === turno)
              const coperti = list.reduce((s, p) => s + p.coperti, 0)
              return (
                <div key={turno}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold capitalize text-profondo">{turno}</span>
                    <span className="num text-xs text-profondo/55">{list.length} tavoli · {coperti} coperti</span>
                  </div>
                  <ul className="space-y-1.5">
                    {list.length === 0 && <li className="text-sm text-profondo/45">Nessuna prenotazione.</li>}
                    {list.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-lg border border-calce-200 bg-white px-3 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-profondo">{p.nome}</p>
                          {p.note && <p className="truncate text-xs text-profondo/50">{p.note}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="num text-sm text-profondo/70">{p.coperti} cop.</span>
                          <Badge tono={tonoStato[p.stato]}>{etichettaStato[p.stato]}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader titolo="Mappa tavoli" sottotitolo={`${tavoli.length} tavoli`} />
          <CardBody className="space-y-3 pt-2">
            {zone.map((z) => (
              <div key={z.chiave}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{z.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tavoli.filter((t) => t.zona === z.chiave).map((t) => (
                    <span key={t.id} className="grid h-11 w-11 place-content-center rounded-lg border border-calce-200 bg-white text-center" title={`Tavolo ${t.numero} · ${t.posti} posti`}>
                      <span className="num text-sm font-bold leading-none text-profondo">{t.numero}</span>
                      <span className="num text-[10px] text-profondo/50">{t.posti}p</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Highlights */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader titolo={<span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-tenda" /> Piatti più venduti</span>} />
          <CardBody className="pt-1">
            <ul className="divide-y divide-calce-200">
              {piuVenduti.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-profondo">{p.nome}</span>
                  <span className="num text-profondo/70">{numero(p.vendutiStagione)} venduti</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader titolo={<span className="inline-flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-boa" /> Piatti meno redditizi</span>} sottotitolo="Margine più basso" />
          <CardBody className="pt-1">
            <ul className="divide-y divide-calce-200">
              {menoRedditizi.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-profondo">{p.nome}</span>
                  <span className="num text-boa">{percento(margine(p))} margine</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Menù */}
      <Card>
        <CardHeader
          titolo="Menù"
          sottotitolo={`${menu.length} piatti · food cost e margine`}
          azione={
            <div className="w-44">
              <Select
                value={filtroCat}
                onChange={(e) => setFiltroCat(e.target.value as CategoriaPiatto | 'tutte')}
                opzioni={[{ valore: 'tutte', etichetta: 'Tutte le categorie' }, ...Object.entries(etichetteCategoriaPiatto).map(([v, l]) => ({ valore: v, etichetta: l }))]}
              />
            </div>
          }
        />
        <CardBody className="px-1 py-1 sm:px-2">
          <MenuTabella piatti={menuFiltrato} />
        </CardBody>
      </Card>
    </div>
  )
}

function MenuTabella({ piatti }: { piatti: Piatto[] }) {
  const colonne: Colonna<Piatto>[] = [
    {
      chiave: 'nome', intestazione: 'Piatto',
      cella: (p) => (
        <div>
          <p className="font-medium text-profondo">{p.nome}</p>
          {p.allergeni.length > 0 && (
            <p className="text-[11px] text-profondo/45">{p.allergeni.map((a) => etichetteAllergene[a]).join(', ')}</p>
          )}
        </div>
      ),
    },
    { chiave: 'cat', intestazione: 'Categoria', nascondiMobile: true, cella: (p) => <span className="text-profondo/60">{etichetteCategoriaPiatto[p.categoria]}</span> },
    { chiave: 'prezzo', intestazione: 'Prezzo', allineaDx: true, cella: (p) => <span className="num">{euroCent(p.prezzo)}</span> },
    { chiave: 'fc', intestazione: 'Food cost', allineaDx: true, nascondiMobile: true, cella: (p) => <span className="num text-profondo/60">{euroCent(p.foodCost)}</span> },
    {
      chiave: 'margine', intestazione: 'Margine', allineaDx: true,
      cella: (p) => {
        const m = margine(p)
        return <span className={cn('num font-medium', m < 0.55 ? 'text-boa' : 'text-profondo')}>{percento(m)}</span>
      },
    },
    { chiave: 'venduti', intestazione: 'Venduti', allineaDx: true, nascondiMobile: true, cella: (p) => <span className="num text-profondo/70">{numero(p.vendutiStagione)}</span> },
  ]
  return <Tabella colonne={colonne} righe={piatti} chiaveRiga={(p) => p.id} denso />
}

function Kpi({ icona: Icona, etichetta, valore }: { icona: typeof Users; etichetta: string; valore: string }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
          <Icona className="h-3.5 w-3.5 text-cabina" /> {etichetta}
        </p>
        <p className="num mt-0.5 text-2xl font-bold text-profondo">{valore}</p>
      </CardBody>
    </Card>
  )
}
