import { useEffect, useMemo, useState } from 'react'
import { Loader2, UtensilsCrossed, Users, Receipt, TrendingDown, Star, ThumbsDown, Plus, X, Phone, Check } from 'lucide-react'
import type {
  CategoriaPiatto, Piatto, PrenotazioneRistorante, ServizioRistoranteGiorno, StatoPrenotazione, Tavolo, Turno,
} from '@/data/types'
import { getServiziRistorante } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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
const etichettaZona: Record<Tavolo['zona'], string> = { veranda: 'Veranda', sala: 'Sala', terrazza: 'Terrazza' }

const margine = (p: Piatto) => (p.prezzo - p.foodCost) / p.prezzo

export default function Ristorante() {
  // Il menu è il modulo mutabile del context (modificabile anche dall'Assistente
  // vocale): questa pagina lo mostra dal vivo, così le modifiche si riflettono qui.
  // Tavoli e prenotazioni sono anch'essi mutabili: si prenota a telefono e si
  // assegna il tavolo dal vivo.
  const {
    menu, tavoli, prenotazioniRistorante,
    aggiungiTavolo, rimuoviTavolo,
    creaPrenotazioneRistorante, assegnaTavolo, impostaStatoPrenotazione, rimuoviPrenotazioneRistorante,
  } = useDemoData()
  const [servizi, setServizi] = useState<ServizioRistoranteGiorno[]>([])
  const [caricato, setCaricato] = useState(false)
  const [filtroCat, setFiltroCat] = useState<CategoriaPiatto | 'tutte'>('tutte')

  useEffect(() => {
    getServiziRistorante().then((s) => { setServizi(s); setCaricato(true) })
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

  const prenOggi = useMemo(() => prenotazioniRistorante.filter((p) => p.data === oggi), [prenotazioniRistorante, oggi])
  const tavoliPerId = useMemo(() => new Map(tavoli.map((t) => [t.id, t])), [tavoli])

  // Tavoli occupati per turno (da prenotazioni attive di oggi) → per non assegnare due volte.
  const occupatiPerTurno = useMemo(() => {
    const m: Record<Turno, Set<string>> = { pranzo: new Set(), cena: new Set() }
    for (const p of prenOggi) {
      if (p.tavoloId && p.stato !== 'annullata') m[p.turno].add(p.tavoloId)
    }
    return m
  }, [prenOggi])
  const occupatiOggi = useMemo(() => {
    const s = new Set<string>()
    prenOggi.forEach((p) => { if (p.tavoloId && p.stato !== 'annullata') s.add(p.tavoloId) })
    return s
  }, [prenOggi])

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
          <CardBody className="space-y-4 pt-2">
            <NuovaPrenotazione
              tavoli={tavoli}
              occupatiPerTurno={occupatiPerTurno}
              onCrea={creaPrenotazioneRistorante}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {(['pranzo', 'cena'] as Turno[]).map((turno) => {
                const list = prenOggi.filter((p) => p.turno === turno)
                const coperti = list.filter((p) => p.stato !== 'annullata').reduce((s, p) => s + p.coperti, 0)
                return (
                  <div key={turno}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize text-profondo">{turno}</span>
                      <span className="num text-xs text-profondo/55">{list.length} tavoli · {coperti} coperti</span>
                    </div>
                    <ul className="space-y-1.5">
                      {list.length === 0 && <li className="text-sm text-profondo/45">Nessuna prenotazione.</li>}
                      {list.map((p) => (
                        <RigaPrenotazione
                          key={p.id}
                          pren={p}
                          tavoli={tavoli}
                          tavoloAssegnato={p.tavoloId ? tavoliPerId.get(p.tavoloId) : undefined}
                          occupati={occupatiPerTurno[turno]}
                          onAssegna={(tavoloId) => assegnaTavolo(p.id, tavoloId)}
                          onStato={(stato) => impostaStatoPrenotazione(p.id, stato)}
                          onRimuovi={() => rimuoviPrenotazioneRistorante(p.id)}
                        />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titolo="Mappa tavoli" sottotitolo={`${tavoli.length} tavoli · ${occupatiOggi.size} occupati oggi`} />
          <CardBody className="space-y-3 pt-2">
            {zone.map((z) => {
              const tz = tavoli.filter((t) => t.zona === z.chiave)
              return (
                <div key={z.chiave}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{z.label}</p>
                  {tz.length === 0 && <p className="text-xs text-profondo/40">Nessun tavolo.</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {tz.map((t) => {
                      const occ = occupatiOggi.has(t.id)
                      return (
                        <span
                          key={t.id}
                          className={cn(
                            'group relative grid h-11 w-11 place-content-center rounded-lg border text-center',
                            occ ? 'border-cabina bg-cabina/10' : 'border-calce-200 bg-white'
                          )}
                          title={`Tavolo ${t.numero} · ${t.posti} posti${occ ? ' · occupato oggi' : ''}`}
                        >
                          <span className="num text-sm font-bold leading-none text-profondo">{t.numero}</span>
                          <span className="num text-[10px] text-profondo/50">{t.posti}p</span>
                          <button
                            type="button"
                            onClick={() => rimuoviTavolo(t.id)}
                            className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 place-content-center rounded-full bg-boa text-white group-hover:grid"
                            aria-label={`Elimina tavolo ${t.numero}`}
                            title="Elimina tavolo"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <NuovoTavolo tavoli={tavoli} onCrea={aggiungiTavolo} />
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

/** Opzioni tavolo per un turno: i liberi + quello già assegnato (se c'è). */
function opzioniTavoli(tavoli: Tavolo[], occupati: Set<string>, correnteId?: string) {
  return tavoli
    .filter((t) => !occupati.has(t.id) || t.id === correnteId)
    .map((t) => ({ valore: t.id, etichetta: `Tav ${t.numero} · ${t.posti}p · ${etichettaZona[t.zona]}` }))
}

/** Riga di una prenotazione: nome, coperti, stato, assegnazione tavolo. */
function RigaPrenotazione({
  pren: p, tavoli, tavoloAssegnato, occupati, onAssegna, onStato, onRimuovi,
}: {
  pren: PrenotazioneRistorante
  tavoli: Tavolo[]
  tavoloAssegnato?: Tavolo
  occupati: Set<string>
  onAssegna: (tavoloId?: string) => void
  onStato: (stato: StatoPrenotazione) => void
  onRimuovi: () => void
}) {
  const annullata = p.stato === 'annullata'
  return (
    <li className={cn('rounded-lg border border-calce-200 bg-white px-3 py-2', annullata && 'opacity-60')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-profondo">
            {p.nome}
            {p.origine === 'sito' && <Badge tono="stagionale">Sito</Badge>}
            {p.origine === 'manuale' && <Badge tono="neutro"><Phone className="h-3 w-3" /> Tel.</Badge>}
          </p>
          {p.telefono && <p className="num truncate text-xs text-profondo/50">{p.telefono}</p>}
          {p.note && <p className="truncate text-xs text-profondo/50">{p.note}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="num text-sm text-profondo/70">{p.coperti} cop.</span>
          <Badge tono={tonoStato[p.stato]}>{etichettaStato[p.stato]}</Badge>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <Select
            aria-label={`Tavolo per ${p.nome}`}
            value={p.tavoloId ?? ''}
            onChange={(e) => onAssegna(e.target.value || undefined)}
            opzioni={[{ valore: '', etichetta: '— Da assegnare —' }, ...opzioniTavoli(tavoli, occupati, p.tavoloId)]}
            className="h-8 text-[13px]"
          />
        </div>
        {tavoloAssegnato
          ? null
          : <span className="text-[11px] text-tenda">senza tavolo</span>}
        {annullata ? (
          <button type="button" onClick={onRimuovi} className="grid h-8 w-8 place-content-center rounded-lg text-profondo/45 hover:bg-boa/10 hover:text-boa" title="Elimina prenotazione" aria-label="Elimina prenotazione"><X className="h-4 w-4" /></button>
        ) : (
          <button type="button" onClick={() => onStato('annullata')} className="grid h-8 w-8 place-content-center rounded-lg text-profondo/45 hover:bg-boa/10 hover:text-boa" title="Annulla prenotazione" aria-label="Annulla prenotazione"><X className="h-4 w-4" /></button>
        )}
      </div>
    </li>
  )
}

/** Form per una prenotazione presa a telefono / in loco. */
function NuovaPrenotazione({
  tavoli, occupatiPerTurno, onCrea,
}: {
  tavoli: Tavolo[]
  occupatiPerTurno: Record<Turno, Set<string>>
  onCrea: (dati: { nome: string; coperti: number; turno: Turno; telefono?: string; note?: string; tavoloId?: string }) => void
}) {
  const [aperto, setAperto] = useState(false)
  const [nome, setNome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [coperti, setCoperti] = useState(2)
  const [turno, setTurno] = useState<Turno>('cena')
  const [tavoloId, setTavoloId] = useState('')
  const [note, setNote] = useState('')

  const reset = () => { setNome(''); setTelefono(''); setCoperti(2); setTurno('cena'); setTavoloId(''); setNote('') }
  const salva = () => {
    if (nome.trim() === '') return
    onCrea({ nome: nome.trim(), coperti, turno, telefono: telefono.trim() || undefined, note: note.trim() || undefined, tavoloId: tavoloId || undefined })
    reset(); setAperto(false)
  }

  if (!aperto) {
    return (
      <div className="flex justify-end">
        <Button variante="primario" dimensione="sm" onClick={() => setAperto(true)}>
          <Phone className="h-4 w-4" /> Nuova prenotazione (telefono)
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-calce-200 bg-calce/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-profondo"><Phone className="h-4 w-4 text-cabina" /> Prenotazione a telefono</span>
        <button type="button" onClick={() => { reset(); setAperto(false) }} className="grid h-7 w-7 place-content-center rounded-md text-profondo/45 hover:bg-white" aria-label="Chiudi"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Fam. Rossi" className="h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Telefono</span>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="es. 340 1234567" className="h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Coperti</span>
          <input type="number" min={1} value={coperti} onChange={(e) => setCoperti(Math.max(1, Number(e.target.value) || 1))} className="num h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Turno</span>
          <Select value={turno} onChange={(e) => setTurno(e.target.value as Turno)} opzioni={[{ valore: 'pranzo', etichetta: 'Pranzo' }, { valore: 'cena', etichetta: 'Cena' }]} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Tavolo (facoltativo)</span>
          <Select value={tavoloId} onChange={(e) => setTavoloId(e.target.value)} opzioni={[{ valore: '', etichetta: '— Da assegnare —' }, ...opzioniTavoli(tavoli, occupatiPerTurno[turno])]} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Note (facoltative)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="es. tavolo vista mare, seggiolone…" className="h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring" />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variante="primario" dimensione="sm" onClick={salva} disabled={nome.trim() === ''}>
          <Check className="h-4 w-4" /> Salva prenotazione
        </Button>
      </div>
    </div>
  )
}

/** Form per creare un tavolo (nome = numero). */
function NuovoTavolo({ tavoli, onCrea }: { tavoli: Tavolo[]; onCrea: (numero: number, posti: number, zona: Tavolo['zona']) => void }) {
  const prossimo = (tavoli.reduce((max, t) => Math.max(max, t.numero), 0) || 0) + 1
  const [aperto, setAperto] = useState(false)
  const [numero, setNumero] = useState(prossimo)
  const [posti, setPosti] = useState(4)
  const [zona, setZona] = useState<Tavolo['zona']>('veranda')

  const salva = () => {
    if (!Number.isFinite(numero) || numero <= 0) return
    onCrea(Math.round(numero), Math.max(1, Math.round(posti)), zona)
    setAperto(false); setNumero(numero + 1); setPosti(4); setZona('veranda')
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => { setNumero((tavoli.reduce((m, t) => Math.max(m, t.numero), 0) || 0) + 1); setAperto(true) }}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-calce-300 py-2 text-sm text-profondo/60 hover:border-cabina hover:text-cabina"
      >
        <Plus className="h-4 w-4" /> Aggiungi tavolo
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-calce-200 bg-calce/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-profondo">Nuovo tavolo</span>
        <button type="button" onClick={() => setAperto(false)} className="grid h-7 w-7 place-content-center rounded-md text-profondo/45 hover:bg-white" aria-label="Chiudi"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Numero</span>
          <input type="number" min={1} value={numero} onChange={(e) => setNumero(Number(e.target.value))} className="num h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Posti</span>
          <input type="number" min={1} value={posti} onChange={(e) => setPosti(Number(e.target.value))} className="num h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Zona</span>
          <Select value={zona} onChange={(e) => setZona(e.target.value as Tavolo['zona'])} opzioni={zone.map((z) => ({ valore: z.chiave, etichetta: z.label }))} />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variante="primario" dimensione="sm" onClick={salva}><Check className="h-4 w-4" /> Aggiungi</Button>
      </div>
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
