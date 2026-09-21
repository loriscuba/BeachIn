import { useMemo, useState } from 'react'
import {
  Trophy, Music, PartyPopper, UtensilsCrossed, Flower2, Gift, CalendarDays, Users, TrendingUp, Wallet,
  Plus, Pencil, Trash2, ImagePlus, X, Ticket,
} from 'lucide-react'
import type { Evento, RichiestaEvento, TipoEvento } from '@/data/types'
import { useDemoData, type DatiPartecipanteEvento } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { euro, numero, dataEstesa, giornoMese } from '@/lib/formatters'
import { etichetteTipoEvento } from '@/lib/etichette'
import { fileAImmagine, importaImmagini, messaggioFileFalliti } from '@/lib/immagini'
import { cn } from '@/lib/cn'

const iconaTipo: Record<TipoEvento, typeof Trophy> = {
  sport: Trophy, musica: Music, festa: PartyPopper, gastronomia: UtensilsCrossed, benessere: Flower2, privato: Gift,
}
const mesiLabel: Record<string, string> = { '05': 'Maggio', '06': 'Giugno', '07': 'Luglio', '08': 'Agosto', '09': 'Settembre' }

export default function Eventi() {
  const { eventi, aggiungiEvento, modificaEvento, eliminaEvento, richiesteEventi, aggiungiPartecipanteEvento, rimuoviPartecipanteEvento, aggiungiFotoEvento, rimuoviFotoEvento } = useDemoData()
  const [sel, setSel] = useState<Evento>()
  const [form, setForm] = useState<{ open: boolean; evento?: Evento }>({ open: false })

  const ordinati = useMemo(() => [...eventi].sort((a, b) => a.data.localeCompare(b.data)), [eventi])
  const sintesi = useMemo(() => {
    const ricavi = eventi.reduce((s, e) => s + e.ricavi, 0)
    const costi = eventi.reduce((s, e) => s + e.costiSostenuti, 0)
    const partecipanti = eventi.reduce((s, e) => s + e.partecipanti, 0)
    return { ricavi, costi, margine: ricavi - costi, partecipanti }
  }, [eventi])

  const perMese = useMemo(() => {
    const g: Record<string, Evento[]> = {}
    for (const e of ordinati) (g[e.data.slice(5, 7)] ??= []).push(e)
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b))
  }, [ordinati])

  const oggi = config.stagione.oggi
  // Versione "viva" dell'evento selezionato: si aggiorna quando cambia l'album.
  const selLive = sel ? eventi.find((x) => x.id === sel.id) ?? sel : undefined

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icona={CalendarDays} etichetta="Eventi in stagione" valore={String(eventi.length)} />
        <Kpi icona={TrendingUp} etichetta="Ricavi eventi" valore={euro(sintesi.ricavi)} />
        <Kpi icona={Wallet} etichetta="Costi sostenuti" valore={euro(sintesi.costi)} />
        <Kpi icona={Users} etichetta="Partecipanti" valore={numero(sintesi.partecipanti)} sotto={`margine ${euro(sintesi.margine)}`} />
      </div>

      {/* Calendario / timeline */}
      <Card>
        <CardHeader
          titolo="Calendario eventi"
          sottotitolo="Clicca un evento per la scheda"
          azione={<Button variante="primario" dimensione="sm" onClick={() => setForm({ open: true })}><Plus className="h-4 w-4" /> Nuovo evento</Button>}
        />
        <CardBody className="space-y-4 pt-2">
          {perMese.length === 0 && <p className="py-6 text-center text-sm text-profondo/45">Nessun evento. Aggiungine uno con “Nuovo evento”.</p>}
          {perMese.map(([m, list]) => (
            <div key={m}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{mesiLabel[m] ?? m}</p>
              <ul className="space-y-2">
                {list.map((e) => {
                  const Icona = iconaTipo[e.tipo]
                  const futuro = e.data > oggi
                  const margine = e.ricavi - e.costiSostenuti
                  return (
                    <li key={e.id}>
                      <button onClick={() => setSel(e)} className="flex w-full items-center gap-3 rounded-lg border border-calce-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-calce-300 hover:bg-calce/50">
                        {e.foto ? (
                          <img src={e.foto} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-profondo/8 text-cabina"><Icona className="h-5 w-5" /></span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-profondo">{e.nome}</p>
                          <p className="num text-xs text-profondo/55">{giornoMese(e.data)} · {e.prezzo ? euro(e.prezzo) : (e.partecipanti > 0 ? `${e.partecipanti} partecipanti` : 'in programma')}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {futuro && e.ricavi === 0 ? <Badge tono="tenda">In programma</Badge> : (
                            <><p className={cn('num text-sm font-bold', margine >= 0 ? 'text-profondo' : 'text-boa')}>{euro(margine)}</p><p className="text-[11px] text-profondo/45">margine</p></>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardBody>
      </Card>

      <SchedaEvento
        evento={selLive}
        partecipanti={selLive ? richiesteEventi.filter((r) => r.eventoId === selLive.id && r.stato === 'confermata') : []}
        onChiudi={() => setSel(undefined)}
        onModifica={(e) => { setSel(undefined); setForm({ open: true, evento: e }) }}
        onElimina={(e) => { if (confirm(`Eliminare l’evento “${e.nome}”?`)) { eliminaEvento(e.id); setSel(undefined) } }}
        onAggiungiPartecipante={aggiungiPartecipanteEvento}
        onRimuoviPartecipante={rimuoviPartecipanteEvento}
        onAggiungiFoto={aggiungiFotoEvento}
        onRimuoviFoto={rimuoviFotoEvento}
      />

      <FormEvento
        stato={form}
        onChiudi={() => setForm({ open: false })}
        onSalva={(e) => { form.evento ? modificaEvento(e) : aggiungiEvento(e); setForm({ open: false }) }}
      />
    </div>
  )
}

function SchedaEvento({ evento: e, partecipanti, onChiudi, onModifica, onElimina, onAggiungiPartecipante, onRimuoviPartecipante, onAggiungiFoto, onRimuoviFoto }: {
  evento?: Evento
  partecipanti: RichiestaEvento[]
  onChiudi: () => void
  onModifica: (e: Evento) => void
  onElimina: (e: Evento) => void
  onAggiungiPartecipante: (d: DatiPartecipanteEvento) => void
  onRimuoviPartecipante: (id: string) => void
  onAggiungiFoto: (id: string, immagine: string) => void
  onRimuoviFoto: (id: string, indice: number) => void
}) {
  const Icona = e ? iconaTipo[e.tipo] : Trophy
  const caricaAlbum = async (files: FileList | null) => {
    if (!e) return
    const falliti = await importaImmagini(files, (uri) => onAggiungiFoto(e.id, uri))
    if (falliti.length) alert(messaggioFileFalliti(falliti))
  }
  const margine = e ? e.ricavi - e.costiSostenuti : 0
  const scostamento = e ? e.costiSostenuti - e.budget : 0
  const totPersone = partecipanti.reduce((s, p) => s + p.persone, 0)

  return (
    <Drawer
      aperto={!!e}
      onChiudi={onChiudi}
      intestazione={e ? (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-profondo text-white"><Icona className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-bold text-profondo">{e.nome}</h2>
            <div className="mt-0.5 flex items-center gap-2"><Badge tono="stagionale">{etichetteTipoEvento[e.tipo]}</Badge><span className="num text-xs text-profondo/50 capitalize">{dataEstesa(e.data)}</span></div>
          </div>
        </div>
      ) : undefined}
      piede={e ? (
        <div className="flex gap-2">
          <Button variante="secondario" onClick={() => onModifica(e)}><Pencil className="h-4 w-4" /> Modifica</Button>
          <Button variante="pericolo" onClick={() => onElimina(e)}><Trash2 className="h-4 w-4" /> Elimina</Button>
        </div>
      ) : undefined}
    >
      {e && (
        <div className="space-y-4">
          {e.foto && <img src={e.foto} alt="" className="h-44 w-full rounded-xl object-cover" />}
          <p className="text-sm text-profondo/75">{e.descrizione}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-calce-200 bg-white px-3 py-2 text-sm">
              <Users className="h-4 w-4 text-cabina" /><span className="text-profondo/75">{e.partecipanti > 0 ? `${numero(e.partecipanti)} partecipanti` : 'Evento in programma'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-calce-200 bg-white px-3 py-2 text-sm">
              <Ticket className="h-4 w-4 text-cabina" /><span className="text-profondo/75">{e.prezzo ? `${euro(e.prezzo)} a persona` : 'Ingresso gratuito'}</span>
            </div>
          </div>
          <div className="rounded-lg border border-calce-200 bg-white">
            <RigaCE label="Budget" valore={euro(e.budget)} muto />
            <RigaCE label="Costi sostenuti" valore={euro(e.costiSostenuti)} />
            <RigaCE label="Ricavi" valore={euro(e.ricavi)} />
            <div className="flex items-center justify-between px-3 py-2.5"><span className="text-sm font-semibold text-profondo">Margine</span><span className={cn('num text-lg font-bold', margine >= 0 ? 'text-profondo' : 'text-boa')}>{euro(margine)}</span></div>
          </div>
          <div className={cn('rounded-lg px-3 py-2 text-xs', scostamento <= 0 ? 'bg-acqua/20 text-profondo' : 'bg-tenda/20 text-[#7A5A12]')}>
            {e.budget === 0 ? 'Evento privato senza budget di spesa dedicato.' : scostamento <= 0 ? `Costi entro budget (${euro(-scostamento)} risparmiati).` : `Costi oltre budget di ${euro(scostamento)}.`}
          </div>

          {/* Partecipanti confermati */}
          <Partecipanti evento={e} lista={partecipanti} totPersone={totPersone} onAggiungi={onAggiungiPartecipante} onRimuovi={onRimuoviPartecipante} />

          {/* Album foto dell'evento (es. foto di un torneo concluso) */}
          <div className="rounded-lg border border-calce-200 bg-white">
            <div className="flex items-center justify-between border-b border-calce-200 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-profondo"><ImagePlus className="h-4 w-4 text-cabina" /> Album foto</span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-calce-200 bg-white px-2.5 py-1 text-xs font-semibold text-profondo hover:bg-calce">
                <ImagePlus className="h-3.5 w-3.5" /> Carica foto
                <input type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={(ev) => { caricaAlbum(ev.target.files); ev.target.value = '' }} />
              </label>
            </div>
            <div className="p-2">
              {(e.galleria?.length ?? 0) === 0 ? (
                <p className="px-1 py-3 text-center text-xs text-profondo/45">Nessuna foto. Carica qui le foto dell’evento da mostrare sul sito.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {e.galleria!.map((src, idx) => (
                    <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-calce-200">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => onRimuoviFoto(e.id, idx)} className="absolute right-1 top-1 grid h-6 w-6 place-content-center rounded-md bg-profondo-900/60 text-white hover:bg-boa" aria-label="Rimuovi foto"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}

function Partecipanti({ evento: e, lista, totPersone, onAggiungi, onRimuovi }: {
  evento: Evento
  lista: RichiestaEvento[]
  totPersone: number
  onAggiungi: (d: DatiPartecipanteEvento) => void
  onRimuovi: (id: string) => void
}) {
  const [nuovo, setNuovo] = useState<{ nome: string; persone: string; telefono: string }>({ nome: '', persone: '1', telefono: '' })
  const [apriForm, setApriForm] = useState(false)
  const aggiungi = () => {
    if (!nuovo.nome.trim()) return
    onAggiungi({
      nome: nuovo.nome.trim(), eventoId: e.id, eventoNome: e.nome, eventoData: e.data,
      persone: Math.max(1, Number(nuovo.persone) || 1), telefono: nuovo.telefono.trim() || undefined,
    })
    setNuovo({ nome: '', persone: '1', telefono: '' })
  }
  return (
    <div className="rounded-lg border border-calce-200 bg-white">
      <div className="flex items-center justify-between border-b border-calce-200 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-profondo"><Ticket className="h-4 w-4 text-cabina" /> Partecipanti confermati</span>
        <Badge tono={lista.length ? 'acqua' : 'neutro'}>{lista.length} {lista.length === 1 ? 'nome' : 'nomi'} · {numero(totPersone)} pers.</Badge>
      </div>
      {lista.length === 0 ? (
        <p className="px-3 py-3 text-center text-xs text-profondo/45">Ancora nessun partecipante confermato.</p>
      ) : (
        <ul className="divide-y divide-calce-200">
          {lista.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-profondo">{p.nome} <span className="font-normal text-profondo/50">· {p.persone} pers.</span></p>
                <p className="text-[11px] text-profondo/45">
                  {p.origine === 'manuale' ? 'inserito in loco' : 'dal sito'}{p.telefono ? ` · ${p.telefono}` : p.email ? ` · ${p.email}` : ''}
                </p>
              </div>
              {p.origine === 'manuale' && (
                <button onClick={() => onRimuovi(p.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-profondo/45 transition-colors hover:bg-boa/10 hover:text-boa" aria-label="Rimuovi partecipante"><Trash2 className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-calce-200 p-2">
        {apriForm ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input className={`${ic} col-span-2`} value={nuovo.nome} onChange={(ev) => setNuovo((n) => ({ ...n, nome: ev.target.value }))} placeholder="Nome e cognome" autoFocus onKeyDown={(ev) => ev.key === 'Enter' && aggiungi()} />
              <input type="number" min={1} className={`${ic} num`} value={nuovo.persone} onChange={(ev) => setNuovo((n) => ({ ...n, persone: ev.target.value }))} placeholder="pers." />
            </div>
            <input className={ic} value={nuovo.telefono} onChange={(ev) => setNuovo((n) => ({ ...n, telefono: ev.target.value }))} placeholder="Telefono (facoltativo)" onKeyDown={(ev) => ev.key === 'Enter' && aggiungi()} />
            <div className="flex justify-end gap-2">
              <Button variante="secondario" dimensione="sm" onClick={() => setApriForm(false)}>Chiudi</Button>
              <Button variante="primario" dimensione="sm" onClick={aggiungi} disabled={!nuovo.nome.trim()}><Plus className="h-4 w-4" /> Aggiungi</Button>
            </div>
          </div>
        ) : (
          <Button variante="secondario" dimensione="sm" onClick={() => setApriForm(true)} className="w-full justify-center"><Plus className="h-4 w-4" /> Aggiungi partecipante (in loco)</Button>
        )}
      </div>
    </div>
  )
}

function FormEvento({ stato, onChiudi, onSalva }: { stato: { open: boolean; evento?: Evento }; onChiudi: () => void; onSalva: (e: Evento) => void }) {
  const e = stato.evento
  const vuoto = { nome: '', tipo: 'musica' as TipoEvento, data: config.stagione.oggi, budget: '0', costiSostenuti: '0', ricavi: '0', partecipanti: '0', descrizione: '', prezzo: '0', foto: '' }
  const iniziale = e
    ? { nome: e.nome, tipo: e.tipo, data: e.data, budget: String(e.budget), costiSostenuti: String(e.costiSostenuti), ricavi: String(e.ricavi), partecipanti: String(e.partecipanti), descrizione: e.descrizione, prezzo: String(e.prezzo ?? 0), foto: e.foto ?? '' }
    : vuoto
  // chiave per re-inizializzare lo stato del form quando cambia l'evento
  return <FormEventoInterno key={e?.id ?? 'nuovo'} iniziale={iniziale} open={stato.open} modifica={!!e} idEsistente={e?.id} onChiudi={onChiudi} onSalva={onSalva} />
}

function FormEventoInterno({ iniziale, open, modifica, idEsistente, onChiudi, onSalva }: {
  iniziale: { nome: string; tipo: TipoEvento; data: string; budget: string; costiSostenuti: string; ricavi: string; partecipanti: string; descrizione: string; prezzo: string; foto: string }
  open: boolean; modifica: boolean; idEsistente?: string; onChiudi: () => void; onSalva: (e: Evento) => void
}) {
  const [f, setF] = useState(iniziale)
  const [caricando, setCaricando] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const valido = f.nome.trim() !== ''
  const caricaFoto = async (file?: File) => {
    if (!file) return
    setCaricando(true)
    try { set('foto', await fileAImmagine(file)) }
    catch { alert(messaggioFileFalliti([file.name])) }
    finally { setCaricando(false) }
  }
  const salva = () => onSalva({
    id: idEsistente ?? `E-NEW-${Date.now()}`,
    nome: f.nome.trim(), tipo: f.tipo, data: f.data,
    budget: Number(f.budget) || 0, costiSostenuti: Number(f.costiSostenuti) || 0,
    ricavi: Number(f.ricavi) || 0, partecipanti: Number(f.partecipanti) || 0,
    descrizione: f.descrizione.trim(),
    prezzo: Number(f.prezzo) || 0,
    foto: f.foto || undefined,
  })
  return (
    <Modal aperto={open} onChiudi={onChiudi} titolo={modifica ? 'Modifica evento' : 'Nuovo evento'}
      piede={<div className="flex justify-end gap-2"><Button variante="secondario" onClick={onChiudi}>Annulla</Button><Button variante="primario" onClick={salva} disabled={!valido}>{modifica ? 'Salva modifiche' : 'Crea evento'}</Button></div>}>
      <div className="grid grid-cols-2 gap-3">
        <CampoE label="Foto evento" span2>
          {f.foto ? (
            <div className="relative overflow-hidden rounded-lg border border-calce-200">
              <img src={f.foto} alt="" className="h-36 w-full object-cover" />
              <button type="button" onClick={() => set('foto', '')} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75" aria-label="Rimuovi foto"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-calce-300 bg-calce/40 text-profondo/55 transition-colors hover:border-cabina hover:text-cabina">
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-medium">{caricando ? 'Caricamento…' : 'Carica una foto'}</span>
              <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => caricaFoto(e.target.files?.[0])} />
            </label>
          )}
        </CampoE>
        <CampoE label="Nome" span2><input className={ic} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="es. Aperitivo in musica" /></CampoE>
        <CampoE label="Tipo"><Select value={f.tipo} onChange={(e) => set('tipo', e.target.value)} opzioni={Object.entries(etichetteTipoEvento).map(([v, l]) => ({ valore: v, etichetta: l }))} /></CampoE>
        <CampoE label="Data"><input type="date" className={ic} value={f.data} onChange={(e) => set('data', e.target.value)} /></CampoE>
        <CampoE label="Prezzo partecipazione (€)" span2><input type="number" className={`${ic} num`} value={f.prezzo} onChange={(e) => set('prezzo', e.target.value)} placeholder="0 = evento gratuito" /></CampoE>
        <CampoE label="Budget (€)"><input type="number" className={`${ic} num`} value={f.budget} onChange={(e) => set('budget', e.target.value)} /></CampoE>
        <CampoE label="Costi sostenuti (€)"><input type="number" className={`${ic} num`} value={f.costiSostenuti} onChange={(e) => set('costiSostenuti', e.target.value)} /></CampoE>
        <CampoE label="Ricavi (€)"><input type="number" className={`${ic} num`} value={f.ricavi} onChange={(e) => set('ricavi', e.target.value)} /></CampoE>
        <CampoE label="Partecipanti"><input type="number" className={`${ic} num`} value={f.partecipanti} onChange={(e) => set('partecipanti', e.target.value)} /></CampoE>
        <CampoE label="Descrizione" span2><textarea rows={3} className={`${ic} h-auto py-2`} value={f.descrizione} onChange={(e) => set('descrizione', e.target.value)} /></CampoE>
      </div>
    </Modal>
  )
}

const ic = 'h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring'
function CampoE({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return <label className={cn('block', span2 && 'col-span-2')}><span className="mb-1 block text-xs font-medium text-profondo/60">{label}</span>{children}</label>
}

function RigaCE({ label, valore, muto }: { label: string; valore: string; muto?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-calce-200 px-3 py-2 text-sm last:border-0">
      <span className="text-profondo/65">{label}</span>
      <span className={cn('num font-medium', muto ? 'text-profondo/60' : 'text-profondo')}>{valore}</span>
    </div>
  )
}

function Kpi({ icona: Icona, etichetta, valore, sotto }: { icona: typeof Trophy; etichetta: string; valore: string; sotto?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50"><Icona className="h-3.5 w-3.5 text-cabina" /> {etichetta}</p>
        <p className="num mt-0.5 text-2xl font-bold text-profondo">{valore}</p>
        {sotto && <p className="num text-xs text-profondo/50">{sotto}</p>}
      </CardBody>
    </Card>
  )
}
