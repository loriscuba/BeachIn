import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Star, ThumbsDown, X, Phone, Check, Smartphone, CalendarX2, Undo2, ChevronLeft, ChevronRight, Plus, Lightbulb, LayoutGrid } from 'lucide-react'
import type {
  CategoriaPiatto, Piatto, PrenotazioneRistorante, StatoPrenotazione, Tavolo, Turno,
} from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Tabella, type Colonna } from '@/components/ui/Tabella'
import { Tabs } from '@/components/ui/Tabs'
import { PannelloMenu } from '@/pages/ristorante/PannelloMenu'
import { Planimetria } from '@/pages/ristorante/Planimetria'
import { ScegliTavolo } from '@/pages/ristorante/ScegliTavolo'
import { addDays, format, parseISO } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'
import { Magazzino } from '@/pages/ristorante/Magazzino'
import { euroCent, numero, percento } from '@/lib/formatters'
import { etichetteAllergene, etichetteCategoriaPiatto } from '@/lib/etichette'
import { cn } from '@/lib/cn'
import { urlAdminApp } from '@/lib/adminapp'
import { GiorniChiusi } from '@/components/GiorniChiusi'
import { BadgeConta } from '@/components/layout/Sidebar'
import { disponibilitaTurno, suggerisciTavoli } from '@/lib/disponibilita'
import { CalendarioMese } from '@/pages/ristorante/CalendarioMese'

const tonoStato: Record<StatoPrenotazione, 'acqua' | 'tenda' | 'neutro' | 'stagionale'> = {
  confermata: 'acqua', in_attesa: 'tenda', annullata: 'neutro', arrivata: 'stagionale',
}
const etichettaStato: Record<StatoPrenotazione, string> = {
  confermata: 'Confermata', in_attesa: 'In attesa', annullata: 'Annullata', arrivata: 'Arrivati',
}
const zonaBreve = (z: Tavolo['zona']) => z.charAt(0).toUpperCase() + z.slice(1)

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
  const [nuovaAperta, setNuovaAperta] = useState(false)
  const [filtroCat, setFiltroCat] = useState<CategoriaPiatto | 'tutte'>('tutte')
  const [q, setQ] = useSearchParams()
  // I tavoli ora si gestiscono per giorno dentro Prenotazioni: il vecchio ?tab=tavoli porta lì.
  const tab = (sezioni.find((x) => x.valore === q.get('tab'))?.valore ?? 'prenotazioni') as Sezione

  const oggi = config.oggi
  // Giorno scelto (di default oggi; ?giorno= arriva dalla campanella delle notifiche).
  const [giorno, setGiornoStato] = useState(q.get('giorno') ?? oggi)
  const [turno, setTurno] = useState<Turno>(new Date().getHours() < 16 ? 'pranzo' : 'cena')
  useEffect(() => {
    const g = q.get('giorno')
    if (g) { setGiornoStato(g); setQ({ tab: 'prenotazioni' }, { replace: true }) }
  }, [q, setQ])
  const setGiorno = setGiornoStato
  // prenotazione a cui si sta scegliendo il tavolo (modal con la pianta)
  const [prenTavolo, setPrenTavolo] = useState<string>()
  // Conferma prima di annullare/eliminare una prenotazione.
  const [daCancellare, setDaCancellare] = useState<{ pren: PrenotazioneRistorante; elimina: boolean }>()
  const spostaGiorno = (n: number) => setGiornoStato(format(addDays(parseISO(giorno), n), 'yyyy-MM-dd'))

  // ogni giorno ha la sua disposizione (o quella standard)
  const tavoli = tavoliDelGiorno(giorno)
  const tavoliPerId = useMemo(() => new Map(tavoli.map((t) => [t.id, t])), [tavoli])
  const prenGiorno = useMemo(() => prenotazioniRistorante.filter((p) => p.data === giorno), [prenotazioniRistorante, giorno])
  const chiusoGiorno = giorniChiusi.find((g) => g.data === giorno)
  // tavolo → chi lo occupa, per turno
  const occupantiPerTurno = useMemo(() => {
    const m: Record<Turno, Map<string, string>> = { pranzo: new Map(), cena: new Map() }
    for (const p of prenGiorno) {
      if (p.tavoloId && p.stato !== 'annullata') m[p.turno].set(p.tavoloId, p.nome)
    }
    return m
  }, [prenGiorno])

  // Lista del turno: prima chi deve ancora arrivare, poi gli arrivati, in fondo gli annullati.
  const ordine: Record<StatoPrenotazione, number> = { in_attesa: 0, confermata: 0, arrivata: 1, annullata: 2 }
  const listaTurno = prenGiorno.filter((p) => p.turno === turno)
    .sort((a, b) => ordine[a.stato] - ordine[b.stato] || (a.ora ?? '99').localeCompare(b.ora ?? '99') || a.nome.localeCompare(b.nome))
  const attive = listaTurno.filter((p) => p.stato !== 'annullata')
  const disp = disponibilitaTurno(tavoli, prenGiorno, giorno, turno)
  const suggerimenti = suggerisciTavoli(tavoli, prenGiorno, giorno, turno)
  const arrivati = listaTurno.filter((p) => p.stato === 'arrivata').length
  const attesi = listaTurno.filter((p) => p.stato === 'confermata' || p.stato === 'in_attesa').length
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
          {tab === 'prenotazioni' && (
            <div className="pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cabina">Panoramica del servizio</p>
              <h2 className="font-display text-2xl font-bold text-profondo sm:text-3xl">Prenotazioni</h2>
              <p className="text-sm text-profondo/60">Arrivi, tavoli e disponibilità in un solo colpo d’occhio.</p>
            </div>
          )}
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
            {tab === 'prenotazioni' && (
              <div className="grid grid-cols-2 rounded-xl border border-calce-200 bg-white p-1">
                {(['pranzo', 'cena'] as Turno[]).map((t) => (
                  <button key={t} type="button" onClick={() => setTurno(t)} className={cn('h-9 min-w-[5.5rem] rounded-lg px-3 text-sm font-semibold capitalize', turno === t ? 'bg-profondo text-white' : 'text-profondo/70 hover:bg-calce/60')}>{t}</button>
                ))}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {tab === 'prenotazioni' && (
                <Button variante="primario" onClick={() => setNuovaAperta(true)}><Plus className="h-4 w-4" /> Nuova prenotazione</Button>
              )}
            </div>
          </div>

          {tab === 'prenotazioni' && nuovaAperta && (
            <NuovaPrenotazione
              key={turno}
              tavoli={tavoli}
              occupantiPerTurno={occupantiPerTurno}
              turnoIniziale={turno}
              onChiudi={() => setNuovaAperta(false)}
              onCrea={(d) => { creaPrenotazioneRistorante({ ...d, data: giorno }); setNuovaAperta(false) }}
            />
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
        <div className="space-y-4">
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

          {/* Riepilogo del turno in grande */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Numero etichetta="Coperti previsti" valore={disp.copertiPrenotati} sotto={`${attive.length} prenotazion${attive.length === 1 ? 'e' : 'i'}`} />
            <Numero etichetta="Tavoli liberi" valore={disp.liberi.length} sotto={`su ${disp.tavoliTotali} tavoli`} rosso={disp.pieno} />
            <Numero
              etichetta="Da sistemare"
              valore={disp.senzaTavolo}
              sotto={disp.senzaTavolo > 0 ? 'tocca per sistemare' : 'senza tavolo assegnato'}
              rosso={disp.senzaTavolo > 0}
              onClick={disp.senzaTavolo > 0 ? () => setPrenTavolo(listaTurno.find((x) => !x.tavoloId && x.stato !== 'annullata')?.id) : undefined}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="min-w-0 space-y-6">
              {/* Arrivi del turno */}
              <section>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-profondo">In arrivo</h3>
                  <span className="text-xs text-profondo/55">{attesi} da accogliere · {arrivati} arrivat{arrivati === 1 ? 'o' : 'i'}</span>
                </div>
                <ul className="space-y-2">
                  {listaTurno.length === 0 && <li className="rounded-xl border border-calce-200 bg-white px-4 py-8 text-center text-sm text-profondo/45">Nessuna prenotazione per {turno}.</li>}
                  {listaTurno.map((p) => (
                    <RigaPrenotazione
                      key={p.id}
                      pren={p}
                      tavoloAssegnato={p.tavoloId ? tavoliPerId.get(p.tavoloId) : undefined}
                      onTavolo={() => setPrenTavolo(p.id)}
                      onStato={(stato) => (stato === 'annullata' ? setDaCancellare({ pren: p, elimina: false }) : impostaStatoPrenotazione(p.id, stato))}
                      onRimuovi={() => setDaCancellare({ pren: p, elimina: true })}
                    />
                  ))}
                </ul>
              </section>

              {/* Tavoli consigliati per chi è ancora senza */}
              {suggerimenti.length > 0 && (
                <section>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-profondo">Suggerimenti tavoli</h3>
                    <span className="text-xs text-profondo/55">{disp.senzaTavolo} da assegnare</span>
                  </div>
                  <ul className="space-y-2">
                    {suggerimenti.map(({ pren: p, tavolo: t, zona, zonaRispettata }) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-calce-200 bg-white p-4">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-cabina"><Lightbulb className="h-4 w-4" /> Tavolo {t.numero} consigliato</p>
                          <p className="mt-1 text-sm text-profondo"><b>{p.nome}</b> · {p.coperti} persone{p.ora && <> alle <span className="num">{p.ora}</span></>}</p>
                          <p className="text-sm text-profondo/70">{t.posti} posti in {zonaBreve(t.zona)}</p>
                          <p className={cn('mt-1 text-xs', zonaRispettata === false ? 'text-boa' : 'text-[#2F7564]')}>
                            {zonaRispettata === true ? 'Rispetta la zona preferita · libero nel turno'
                              : zonaRispettata === false ? `${zonaBreve(zona!)} piena · il più adatto libero`
                                : 'Il più piccolo libero che basta · libero nel turno'}
                          </p>
                        </div>
                        <Button variante="primario" dimensione="sm" onClick={() => setPrenTavolo(p.id)}><Check className="h-4 w-4" /> Assegna</Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(() => {
                const p = prenTavolo ? listaTurno.find((x) => x.id === prenTavolo) : undefined
                return p && (
                  <ScegliTavolo
                    aperto
                    onChiudi={() => setPrenTavolo(undefined)}
                    titolo={`Tavolo per ${p.nome} · ${p.coperti} persone${p.ora ? ` alle ${p.ora}` : ''}`}
                    coperti={p.coperti}
                    tavoli={tavoli}
                    occupanti={occupantiPerTurno[turno]}
                    correnteId={p.tavoloId}
                    consigliatoId={suggerimenti.find((x) => x.pren.id === p.id)?.tavolo.id}
                    onScegli={(id) => assegnaTavolo(p.id, id)}
                  />
                )
              })()}

              <Modal
                aperto={!!daCancellare}
                onChiudi={() => setDaCancellare(undefined)}
                titolo={daCancellare?.elimina ? 'Eliminare la prenotazione?' : 'Annullare la prenotazione?'}
                larghezza="max-w-sm"
                piede={
                  <div className="flex justify-end gap-2">
                    <Button dimensione="sm" onClick={() => setDaCancellare(undefined)}>No, indietro</Button>
                    <Button
                      dimensione="sm"
                      variante="pericolo"
                      onClick={() => {
                        if (!daCancellare) return
                        if (daCancellare.elimina) rimuoviPrenotazioneRistorante(daCancellare.pren.id)
                        else impostaStatoPrenotazione(daCancellare.pren.id, 'annullata')
                        setDaCancellare(undefined)
                      }}
                    >
                      Sì, {daCancellare?.elimina ? 'elimina' : 'annulla'}
                    </Button>
                  </div>
                }
              >
                {daCancellare && (
                  <p className="text-sm text-profondo">
                    <b>{daCancellare.pren.nome}</b> · {daCancellare.pren.coperti} persone · {daCancellare.pren.turno}
                    {daCancellare.pren.ora ? ` alle ${daCancellare.pren.ora}` : ''} del {format(parseISO(daCancellare.pren.data), 'd MMMM', { locale: itLocale })}.
                    {daCancellare.elimina && <span className="mt-1 block text-profondo/60">La prenotazione verrà rimossa definitivamente.</span>}
                  </p>
                )}
              </Modal>

              <a href={urlAdminApp()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-profondo/55 hover:text-profondo"><Smartphone className="h-3.5 w-3.5" /> App admin per il telefono</a>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-calce-200 bg-white p-4">
                <CalendarioMese giorno={giorno} oggi={oggi} onGiorno={setGiorno} prenotazioni={prenotazioniRistorante} richieste={daConfermare} chiusi={giorniChiusi} />
              </div>
              <div className="rounded-xl border border-calce-200 bg-white p-4">
                <h3 className="font-display text-base font-semibold text-profondo">Disponibilità tavoli</h3>
                <p className="mb-3 text-xs capitalize text-profondo/55">{turno} · {disp.tavoliTotali - disp.liberi.length} occupati, {disp.liberi.length} liberi</p>
                <ul className="max-h-[26rem] space-y-1.5 overflow-y-auto pr-0.5">
                  {[...tavoli].sort((a, b) => a.numero - b.numero).map((t) => {
                    const chi = attive.find((p) => p.tavoloId === t.id)
                    return (
                      <li key={t.id} className={cn('flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm', chi ? 'border-calce-200 bg-calce/40' : 'border-calce-200 bg-white')}>
                        <span className="min-w-0 truncate">
                          <b className="text-profondo">Tavolo {t.numero}</b>
                          <span className="text-profondo/55"> · {t.posti} posti · {zonaBreve(t.zona)}</span>
                        </span>
                        {chi
                          ? <span className="shrink-0 truncate text-xs font-medium text-profondo/60" title={chi.nome}>{chi.nome}</span>
                          : <span className="shrink-0 text-xs font-semibold text-cabina">Libero</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
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
function Numero({ etichetta, valore, sotto, rosso, onClick }: { etichetta: string; valore: number; sotto: string; rosso?: boolean; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn('rounded-xl border px-3 py-3 text-left sm:px-4 sm:py-4', onClick ? 'border-2 border-boa/60 bg-boa/5 hover:bg-boa/10' : 'border-calce-200 bg-white')}
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-profondo/55 sm:text-[11px]">{etichetta}</p>
      <p className={cn('num mt-1 text-3xl font-bold leading-tight sm:text-4xl', rosso ? 'text-boa' : 'text-profondo')}>{valore}</p>
      <p className={cn('truncate text-xs', onClick ? 'font-semibold text-boa' : 'text-profondo/55')}>{sotto}</p>
    </Tag>
  )
}

/** Scheda di una prenotazione: orario, nome, tavolo, note, arrivo e assegnazione tavolo. */
function RigaPrenotazione({
  pren: p, tavoloAssegnato, onTavolo, onStato, onRimuovi,
}: {
  pren: PrenotazioneRistorante
  tavoloAssegnato?: Tavolo
  onTavolo: () => void
  onStato: (stato: StatoPrenotazione) => void
  onRimuovi: () => void
}) {
  const annullata = p.stato === 'annullata'
  const arrivata = p.stato === 'arrivata'
  const daSistemare = !tavoloAssegnato && !annullata && !arrivata
  return (
    <li className={cn('flex overflow-hidden rounded-xl border bg-white', daSistemare ? 'border-2 border-tenda shadow-sm' : 'border-calce-200', (annullata || arrivata) && 'opacity-60')}>
      <div className={cn('flex w-20 shrink-0 flex-col items-center justify-center border-r px-2 py-3 sm:w-24', daSistemare ? 'border-tenda bg-tenda/25' : 'border-calce-200')}>
        <span className="num text-xl font-bold text-profondo">{p.ora ?? '—'}</span>
        <span className="text-xs capitalize text-profondo/55">{p.turno}</span>
      </div>
      <div className="min-w-0 flex-1 px-3 py-3 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 font-semibold text-profondo">
              {p.nome}
              {p.origine === 'sito' && <Badge tono="stagionale">Sito</Badge>}
              {p.origine === 'manuale' && <Badge tono="neutro"><Phone className="h-3 w-3" /> Tel.</Badge>}
              {(annullata || p.stato === 'in_attesa') && <Badge tono={tonoStato[p.stato]}>{etichettaStato[p.stato]}</Badge>}
              {daSistemare && <span className="rounded-md bg-tenda px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-profondo">Da sistemare</span>}
            </p>
            <p className="text-sm text-profondo/60">
              {p.coperti} persone · {tavoloAssegnato
                ? <>Tavolo {tavoloAssegnato.numero} · {zonaBreve(tavoloAssegnato.zona)}</>
                : <span className="text-[#9A6B00]">Tavolo da assegnare</span>}
            </p>
            {p.note && <p className="text-xs font-semibold text-[#9A6B00]">{p.note}</p>}
            {p.telefono && <p className="num text-xs text-profondo/50">{p.telefono}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="num hidden text-lg font-bold text-profondo sm:inline">{p.coperti}<span className="text-xs font-normal text-profondo/55"> pers.</span></span>
            {!annullata && (
              <button
                type="button"
                onClick={() => onStato(arrivata ? 'confermata' : 'arrivata')}
                className={cn('inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold', arrivata ? 'border-calce-200 bg-calce-200 text-profondo' : 'border-calce-200 bg-white text-profondo shadow-sm hover:bg-calce/60')}
                title={arrivata ? 'Annulla arrivo' : 'Segna come arrivati'}
              >
                {arrivata ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4" />} Arrivati
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {!annullata && (
            <button
              type="button"
              onClick={onTavolo}
              className={cn('inline-flex h-9 flex-1 items-center gap-1.5 rounded-lg border px-3 text-left text-[13px] font-medium',
                tavoloAssegnato ? 'border-calce-200 text-profondo hover:bg-calce/60' : 'border-dashed border-tenda bg-tenda/10 text-profondo hover:bg-tenda/20')}
            >
              <LayoutGrid className="h-4 w-4 shrink-0 text-cabina" />
              {tavoloAssegnato ? <>Tavolo {tavoloAssegnato.numero} · {zonaBreve(tavoloAssegnato.zona)} <span className="ml-auto text-profondo/45">Cambia</span></> : 'Scegli il tavolo sulla pianta'}
            </button>
          )}
          {annullata && <span className="flex-1" />}
          {annullata ? (
            <button type="button" onClick={onRimuovi} className="grid h-8 w-8 place-content-center rounded-lg text-profondo/45 hover:bg-boa/10 hover:text-boa" title="Elimina prenotazione" aria-label="Elimina prenotazione"><X className="h-4 w-4" /></button>
          ) : (
            <button type="button" onClick={() => onStato('annullata')} className="grid h-8 w-8 place-content-center rounded-lg text-profondo/45 hover:bg-boa/10 hover:text-boa" title="Annulla prenotazione" aria-label="Annulla prenotazione"><X className="h-4 w-4" /></button>
          )}
        </div>
      </div>
    </li>
  )
}

/** Form per una prenotazione presa a telefono / in loco. */
function NuovaPrenotazione({
  tavoli, occupantiPerTurno, turnoIniziale, onCrea, onChiudi,
}: {
  tavoli: Tavolo[]
  occupantiPerTurno: Record<Turno, Map<string, string>>
  turnoIniziale: Turno
  onCrea: (dati: { nome: string; coperti: number; turno: Turno; ora?: string; telefono?: string; note?: string; tavoloId?: string }) => void
  onChiudi: () => void
}) {
  const [nome, setNome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [coperti, setCoperti] = useState(2)
  const [turno, setTurno] = useState<Turno>(turnoIniziale)
  const [ora, setOra] = useState(turnoIniziale === 'pranzo' ? '12:30' : '20:00')
  const [tavoloId, setTavoloId] = useState('')
  const [note, setNote] = useState('')
  const [pianta, setPianta] = useState(false)
  const tavoloScelto = tavoli.find((t) => t.id === tavoloId)

  const salva = () => {
    if (nome.trim() === '') return
    onCrea({ nome: nome.trim(), coperti, turno, ora: ora || undefined, telefono: telefono.trim() || undefined, note: note.trim() || undefined, tavoloId: tavoloId || undefined })
  }
  const campo = 'h-10 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring'

  return (
    <div className="rounded-xl border border-calce-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-display font-semibold text-profondo"><Phone className="h-4 w-4 text-cabina" /> Nuova prenotazione</span>
        <button type="button" onClick={onChiudi} className="grid h-8 w-8 place-content-center rounded-md text-profondo/45 hover:bg-calce/60" aria-label="Chiudi"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Fam. Rossi" className={campo} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Telefono</span>
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="es. 340 1234567" className={campo} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Turno</span>
          <Select value={turno} onChange={(e) => { const t = e.target.value as Turno; setTurno(t); setOra(t === 'pranzo' ? '12:30' : '20:00'); setTavoloId('') }} opzioni={[{ valore: 'pranzo', etichetta: 'Pranzo' }, { valore: 'cena', etichetta: 'Cena' }]} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Orario</span>
          <input type="time" step={900} value={ora} onChange={(e) => setOra(e.target.value)} className={cn(campo, 'num')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Coperti</span>
          <input type="number" min={1} value={coperti} onChange={(e) => setCoperti(Math.max(1, Number(e.target.value) || 1))} className={cn(campo, 'num')} />
        </label>
        <div className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Tavolo (facoltativo)</span>
          <button type="button" onClick={() => setPianta(true)} className={cn(campo, 'inline-flex items-center gap-1.5 text-left')}>
            <LayoutGrid className="h-4 w-4 shrink-0 text-cabina" />
            {tavoloScelto ? `Tavolo ${tavoloScelto.numero} · ${zonaBreve(tavoloScelto.zona)}` : 'Scegli sulla pianta'}
          </button>
        </div>
        <ScegliTavolo
          aperto={pianta}
          onChiudi={() => setPianta(false)}
          titolo={`Tavolo per ${nome.trim() || 'la nuova prenotazione'} · ${coperti} persone`}
          coperti={coperti}
          tavoli={tavoli}
          occupanti={occupantiPerTurno[turno]}
          correnteId={tavoloId || undefined}
          onScegli={(id) => setTavoloId(id ?? '')}
        />
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Note (facoltative)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="es. preferisce la veranda, seggiolone…" className={campo} />
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button dimensione="sm" onClick={onChiudi}>Annulla</Button>
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
