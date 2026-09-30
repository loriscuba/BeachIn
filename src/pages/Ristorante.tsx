import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Star, ThumbsDown, X, Phone, Check, Smartphone, CalendarX2, Undo2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import type {
  CategoriaPiatto, Piatto, PrenotazioneRistorante, StatoPrenotazione, Tavolo, Turno,
} from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Tabella, type Colonna } from '@/components/ui/Tabella'
import { Tabs } from '@/components/ui/Tabs'
import { PannelloMenu } from '@/pages/ristorante/PannelloMenu'
import { Planimetria } from '@/pages/ristorante/Planimetria'
import { CalendarioPrenotazioni } from '@/pages/ristorante/CalendarioPrenotazioni'
import { addDays, format, parseISO } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'
import { nomeZona } from '@/lib/zoneTavoli'
import { Magazzino } from '@/pages/ristorante/Magazzino'
import { euroCent, numero, percento } from '@/lib/formatters'
import { etichetteAllergene, etichetteCategoriaPiatto } from '@/lib/etichette'
import { cn } from '@/lib/cn'
import { urlAdminApp } from '@/lib/adminapp'
import { GiorniChiusi } from '@/components/GiorniChiusi'
import { BadgeConta } from '@/components/layout/Sidebar'
import { disponibilitaTurno } from '@/lib/disponibilita'

const tonoStato: Record<StatoPrenotazione, 'acqua' | 'tenda' | 'neutro' | 'stagionale'> = {
  confermata: 'acqua', in_attesa: 'tenda', annullata: 'neutro', arrivata: 'stagionale',
}
const etichettaStato: Record<StatoPrenotazione, string> = {
  confermata: 'Confermata', in_attesa: 'In attesa', annullata: 'Annullata', arrivata: 'Arrivati',
}
const etichettaZona = nomeZona

type Sezione = 'prenotazioni' | 'tavoli' | 'menu' | 'magazzino' | 'giorni'
const sezioni: { valore: Sezione; etichetta: string }[] = [
  { valore: 'prenotazioni', etichetta: 'Prenotazioni' }, { valore: 'tavoli', etichetta: 'Tavoli' }, { valore: 'menu', etichetta: 'Menu' },
  { valore: 'magazzino', etichetta: 'Magazzino' }, { valore: 'giorni', etichetta: 'Gestione giorni' },
]

const margine = (p: Piatto) => (p.prezzo - p.foodCost) / p.prezzo

export default function Ristorante() {
  // Pensata per il servizio: si apre su oggi e sul turno in corso, con gli arrivi in lista.
  // Calendario settimanale e pianta tavoli restano, ma si aprono solo quando servono.
  const {
    menu, sezioniMenu, tavoliDelGiorno, prenotazioniRistorante, richiesteRistorante, confermaRistorante, rifiutaRistorante,
    creaPrenotazioneRistorante, assegnaTavolo, impostaStatoPrenotazione, rimuoviPrenotazioneRistorante,
    giorniChiusi, riapriGiorno,
  } = useDemoData()
  const [vediSettimana, setVediSettimana] = useState(false)
  const [filtroCat, setFiltroCat] = useState<CategoriaPiatto | 'tutte'>('tutte')
  const [q, setQ] = useSearchParams()
  // I tavoli ora si gestiscono per giorno dentro Prenotazioni: il vecchio ?tab=tavoli porta lì.
  const tab = (sezioni.find((x) => x.valore === q.get('tab'))?.valore ?? 'prenotazioni') as Sezione

  const oggi = config.stagione.oggi
  // Giorno scelto (di default oggi; ?giorno= arriva dalla campanella delle notifiche).
  const [giorno, setGiornoStato] = useState(q.get('giorno') ?? oggi)
  const [turno, setTurno] = useState<Turno>(new Date().getHours() < 16 ? 'pranzo' : 'cena')
  useEffect(() => {
    const g = q.get('giorno')
    if (g) { setGiornoStato(g); setQ({ tab: 'prenotazioni' }, { replace: true }) }
  }, [q, setQ])
  const setGiorno = (g: string) => { setGiornoStato(g); setVediSettimana(false) }
  const spostaGiorno = (n: number) => setGiornoStato(format(addDays(parseISO(giorno), n), 'yyyy-MM-dd'))

  // ogni giorno ha la sua disposizione (o quella standard)
  const tavoli = tavoliDelGiorno(giorno)
  const tavoliPerId = useMemo(() => new Map(tavoli.map((t) => [t.id, t])), [tavoli])
  const prenGiorno = useMemo(() => prenotazioniRistorante.filter((p) => p.data === giorno), [prenotazioniRistorante, giorno])
  const richiesteGiorno = richiesteRistorante.filter((r) => r.stato === 'da_confermare' && r.data === giorno)
  const chiusoGiorno = giorniChiusi.find((g) => g.data === giorno)
  const occupatiPerTurno = useMemo(() => {
    const m: Record<Turno, Set<string>> = { pranzo: new Set(), cena: new Set() }
    for (const p of prenGiorno) {
      if (p.tavoloId && p.stato !== 'annullata') m[p.turno].add(p.tavoloId)
    }
    return m
  }, [prenGiorno])

  // Lista del turno: prima chi deve ancora arrivare, poi gli arrivati, in fondo gli annullati.
  const ordine: Record<StatoPrenotazione, number> = { in_attesa: 0, confermata: 0, arrivata: 1, annullata: 2 }
  const listaTurno = prenGiorno.filter((p) => p.turno === turno)
    .sort((a, b) => ordine[a.stato] - ordine[b.stato] || a.nome.localeCompare(b.nome))
  const disp = disponibilitaTurno(tavoli, prenGiorno, giorno, turno)
  const arrivati = listaTurno.filter((p) => p.stato === 'arrivata').length
  const attesi = listaTurno.filter((p) => p.stato === 'confermata' || p.stato === 'in_attesa').length
  const richiesteTurno = richiesteGiorno.filter((r) => r.turno === turno)
  // Richieste dal sito da confermare, di qualunque giorno: le più recenti in cima.
  const daConfermare = richiesteRistorante.filter((r) => r.stato === 'da_confermare')
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0) || b.ricevutaIl.localeCompare(a.ricevutaIl))

  const menuFiltrato = filtroCat === 'tutte' ? menu : menu.filter((p) => p.categoria === filtroCat)
  const piuVenduti = [...menu].sort((a, b) => b.vendutiStagione - a.vendutiStagione).slice(0, 4)
  const menoRedditizi = [...menu].filter((p) => p.categoria !== 'bevande').sort((a, b) => margine(a) - margine(b)).slice(0, 4)

  return (
    <div className="space-y-4">
      <Tabs opzioni={sezioni.map((x) => (x.valore === 'prenotazioni' ? { ...x, badge: daConfermare.length } : x))} valore={tab} onChange={(v) => setQ({ tab: v }, { replace: true })} />

      {tab === 'menu' && (
        <>
          <PannelloMenu />
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
                  opzioni={[{ valore: 'tutte', etichetta: 'Tutte le categorie' }, ...sezioniMenu.map((s) => ({ valore: s.id, etichetta: s.nome }))]}
                />
              </div>
            }
          />
          <CardBody className="px-1 py-1 sm:px-2">
            <MenuTabella piatti={menuFiltrato} nomeSez={(id) => sezioniMenu.find((s) => s.id === id)?.nome ?? etichetteCategoriaPiatto[id] ?? id} />
          </CardBody>
        </Card>
        </>
      )}

      {tab === 'magazzino' && <Magazzino />}

      {(tab === 'prenotazioni' || tab === 'tavoli') && (
        <div className="space-y-3">
          {/* Barra del giorno, condivisa tra Prenotazioni e Tavoli: stesso giorno scelto */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-calce-200 bg-white">
              <button type="button" onClick={() => spostaGiorno(-1)} className="grid h-11 w-11 place-content-center text-profondo hover:bg-calce/60" aria-label="Giorno prima"><ChevronLeft className="h-5 w-5" /></button>
              <span className="min-w-[9.5rem] text-center font-display text-lg font-semibold capitalize text-profondo">
                {giorno === oggi ? 'Oggi' : format(parseISO(giorno), 'EEE d MMM', { locale: itLocale })}
              </span>
              <button type="button" onClick={() => spostaGiorno(1)} className="grid h-11 w-11 place-content-center text-profondo hover:bg-calce/60" aria-label="Giorno dopo"><ChevronRight className="h-5 w-5" /></button>
            </div>
            {giorno !== oggi && <Button dimensione="sm" onClick={() => setGiornoStato(oggi)}>Torna a oggi</Button>}
            <Button dimensione="sm" onClick={() => setVediSettimana(!vediSettimana)}><CalendarDays className="h-4 w-4" /> Settimana</Button>
            {tab === 'prenotazioni' && (
              <div className="ml-auto">
                <NuovaPrenotazione tavoli={tavoli} occupatiPerTurno={occupatiPerTurno} onCrea={(d) => creaPrenotazioneRistorante({ ...d, data: giorno })} />
              </div>
            )}
          </div>

          {vediSettimana && (
            <Card>
              <CardBody className="pt-3">
                <CalendarioPrenotazioni
                  giorno={giorno}
                  oggi={oggi}
                  onGiorno={setGiorno}
                  prenotazioni={prenotazioniRistorante}
                  richieste={daConfermare}
                  chiusi={giorniChiusi}
                />
              </CardBody>
            </Card>
          )}

          {chiusoGiorno && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-boa px-4 py-3 text-white">
              <span className="inline-flex items-center gap-2 font-semibold"><CalendarX2 className="h-5 w-5" /> Ristorante chiuso{chiusoGiorno.nota && <span className="font-normal text-white/85">· {chiusoGiorno.nota}</span>}</span>
              <button type="button" onClick={() => riapriGiorno(giorno)} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25"><Undo2 className="h-4 w-4" /> Riapri</button>
            </div>
          )}

          {tab === 'tavoli' && <Planimetria key={giorno} prenGiorno={prenGiorno} giorno={giorno} oggi={oggi} />}
        </div>
      )}

      {tab === 'prenotazioni' && (
        <div className="space-y-3">
          {/* Tutte le richieste nuove dal sito, qualunque sia la data: sempre in cima */}
          {daConfermare.length > 0 && (
            <div className="rounded-xl border-2 border-boa/60 bg-boa/5 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-boa">
                <BadgeConta n={daConfermare.length} /> Nuove dal sito · da confermare
              </p>
              <ul className="space-y-1.5">
                {daConfermare.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                    <button type="button" onClick={() => { setGiornoStato(r.data); setTurno(r.turno) }} className="min-w-0 text-left" title="Vai al giorno">
                      <span className="mr-2 inline-block rounded-md bg-profondo px-2 py-0.5 text-xs font-semibold capitalize text-white">{format(parseISO(r.data), 'EEE d MMM', { locale: itLocale })} · {r.turno}</span>
                      <span className="text-profondo"><b>{r.nome}</b> · {r.coperti} pers.{r.telefono && <> · {r.telefono}</>}{r.note && <span className="text-profondo/55"> · {r.note}</span>}</span>
                    </button>
                    <span className="flex gap-1.5">
                      <Button onClick={() => rifiutaRistorante(r.id)}><X className="h-4 w-4 text-boa" /> Rifiuta</Button>
                      <Button variante="primario" onClick={() => confermaRistorante(r.id)}><Check className="h-4 w-4" /> Conferma</Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Turno + riepilogo in grande */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1 sm:w-72">
            {(['pranzo', 'cena'] as Turno[]).map((t) => (
              <button key={t} type="button" onClick={() => setTurno(t)} className={cn('h-11 rounded-lg text-sm font-semibold capitalize', turno === t ? 'bg-profondo text-white' : 'text-profondo hover:bg-calce/60')}>{t}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Numero etichetta="Coperti" valore={disp.copertiPrenotati} sotto={`${arrivati}/${arrivati + attesi} arrivati`} />
            <Numero etichetta="Tavoli liberi" valore={disp.tavoliLiberi} sotto={disp.pieno ? 'pieno' : `${disp.postiLiberi} posti`} rosso={disp.pieno} />
            <Numero etichetta="Da confermare" valore={richiesteTurno.length} sotto="in questo turno" rosso={richiesteTurno.length > 0} />
          </div>

          {/* Arrivi del turno */}
          <ul className="space-y-1.5">
            {listaTurno.length === 0 && <li className="rounded-xl bg-white px-4 py-6 text-center text-sm text-profondo/45">Nessuna prenotazione per {turno}.</li>}
            {listaTurno.map((p) => (
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

          <a href={urlAdminApp()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-profondo/55 hover:text-profondo"><Smartphone className="h-3.5 w-3.5" /> App admin per il telefono</a>
        </div>
      )}

      {tab === 'giorni' && (
        <Card>
          <CardHeader titolo="Giorni di chiusura" sottotitolo="Sul sito compaiono in rosso e non si prenota" />
          <CardBody className="pt-1 sm:max-w-md">
            <GiorniChiusi />
          </CardBody>
        </Card>
      )}
    </div>
  )
}

/** Numero grande del riepilogo di turno. */
function Numero({ etichetta, valore, sotto, rosso }: { etichetta: string; valore: number; sotto: string; rosso?: boolean }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-profondo/55">{etichetta}</p>
      <p className={cn('num text-3xl font-bold leading-tight', rosso ? 'text-boa' : 'text-profondo')}>{valore}</p>
      <p className="truncate text-xs text-profondo/55">{sotto}</p>
    </div>
  )
}

/** Opzioni tavolo per un turno: i liberi + quello già assegnato (se c'è). */
function opzioniTavoli(tavoli: Tavolo[], occupati: Set<string>, correnteId?: string) {
  return tavoli
    .filter((t) => !occupati.has(t.id) || t.id === correnteId)
    .map((t) => ({ valore: t.id, etichetta: `Tav ${t.numero} · ${t.posti}p · ${etichettaZona(t.zona)}` }))
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
  const arrivata = p.stato === 'arrivata'
  return (
    <li className={cn('rounded-xl border border-calce-200 bg-white px-3 py-2.5', (annullata || arrivata) && 'opacity-60')}>
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
          <span className="num text-lg font-bold text-profondo">{p.coperti}<span className="text-xs font-normal text-profondo/55"> pers.</span></span>
          {!annullata && (
            <button
              type="button"
              onClick={() => onStato(arrivata ? 'confermata' : 'arrivata')}
              className={cn('inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold', arrivata ? 'bg-calce-200 text-profondo' : 'bg-profondo text-white hover:bg-profondo/90')}
              title={arrivata ? 'Annulla arrivo' : 'Segna come arrivati'}
            >
              {arrivata ? <><Undo2 className="h-4 w-4" /> Arrivati</> : <><Check className="h-4 w-4" /> Arrivati</>}
            </button>
          )}
          {(annullata || p.stato === 'in_attesa') && <Badge tono={tonoStato[p.stato]}>{etichettaStato[p.stato]}</Badge>}
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

function MenuTabella({ piatti, nomeSez }: { piatti: Piatto[]; nomeSez: (id: string) => string }) {
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
    { chiave: 'cat', intestazione: 'Categoria', nascondiMobile: true, cella: (p) => <span className="text-profondo/60">{nomeSez(p.categoria)}</span> },
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
