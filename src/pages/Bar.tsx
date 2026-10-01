import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Plus, Search, Pencil, Tags, Trash2, ChevronUp, ChevronDown, Umbrella, Smartphone } from 'lucide-react'
import type { ArticoloBar } from '@/data/types'
import { contiAperti, quandoComanda } from '@/lib/contiBar'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { euroCent, numero, percento } from '@/lib/formatters'
import { cn } from '@/lib/cn'

/**
 * Bar: Listino (condiviso con ComandApp e Comande, tutto modificabile: categorie e articoli)
 * e Conti per ombrellone, calcolati dalle comande non ancora incassate.
 */
export default function Bar() {
  const [q, setQ] = useSearchParams()
  const tab = q.get('tab') === 'conti' ? 'conti' : 'listino'
  return (
    <div className="space-y-4">
      <Tabs valore={tab} onChange={(v) => setQ({ tab: v }, { replace: true })} opzioni={[{ valore: 'listino', etichetta: 'Listino' }, { valore: 'conti', etichetta: 'Conti' }]} />
      {tab === 'conti' ? <Conti /> : <Listino />}
    </div>
  )
}

// ———————————————————————————————— Conti ————————————————————————————————

function Conti() {
  const { comande, incassaComande } = useDemoData()
  const [aperto, setAperto] = useState<string>()
  const conti = useMemo(() => contiAperti(comande), [comande])
  const totale = conti.reduce((s, c) => s + c.totale, 0)

  return (
    <Card>
      <CardHeader
        titolo="Conti aperti per ombrellone"
        sottotitolo={conti.length ? `${conti.length} ${conti.length === 1 ? 'conto' : 'conti'} da incassare · ${euroCent(totale)}` : 'Dalle comande (ComandApp e banco) non ancora incassate'}
      />
      <CardBody className="pt-1">
        {conti.length === 0 ? (
          <p className="py-6 text-center text-sm text-profondo/50">Nessun conto aperto: tutto incassato.</p>
        ) : (
          <ul className="divide-y divide-calce-200">
            {conti.map((c) => {
              const espanso = aperto === c.chiave
              const inCorso = c.comande.filter((x) => x.stato !== 'pronta').length
              return (
                <li key={c.chiave} className="py-2.5">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setAperto(espanso ? undefined : c.chiave)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="grid h-10 w-10 shrink-0 place-content-center rounded-full bg-cabina/10 text-cabina"><Umbrella className="h-5 w-5" /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-profondo">
                          Ombrellone {c.ombrellone}{c.postazioneId && c.postazioneId !== c.ombrellone && <span className="font-normal text-profondo/50"> ({c.postazioneId})</span>}{c.clienti.length > 0 && <span className="font-normal text-profondo/70"> · {c.clienti.join(', ')}</span>}
                        </span>
                        <span className="block truncate text-xs text-profondo/55">
                          {c.comande.length} {c.comande.length === 1 ? 'comanda' : 'comande'} dal {quandoComanda(c.comande[0])}
                          {inCorso > 0 && <> · <span className="text-[#7A5A12]">{inCorso} in corso</span></>} · {c.righe.map((r) => `${r.quantita}× ${r.nome}`).join(', ')}
                        </span>
                      </span>
                    </button>
                    <span className="num shrink-0 text-sm font-bold text-profondo">{euroCent(c.totale)}</span>
                    <Button variante="primario" dimensione="sm" onClick={() => incassaComande(c.comande.map((x) => x.id))}>
                      <CheckCircle2 className="h-4 w-4" /> Incassa
                    </Button>
                  </div>
                  {espanso && (
                    <ul className="ml-[3.25rem] mt-2 space-y-1 rounded-lg bg-calce/60 p-3 text-sm">
                      {c.comande.map((x) => (
                        <li key={x.id}>
                          <p className="flex items-center gap-1.5 text-xs text-profondo/55">
                            {x.origine === 'app' && <Smartphone className="h-3.5 w-3.5" />} {quandoComanda(x)} · {x.origine === 'app' ? 'ComandApp' : 'banco'}{x.cliente ? ` · ${x.cliente}` : ''}
                          </p>
                          {x.righe.map((r) => (
                            <p key={r.articoloId} className="flex justify-between"><span>{r.quantita}× {r.nome}</span><span className="num">{euroCent(r.quantita * r.prezzoUnitario)}</span></p>
                          ))}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

// ———————————————————————————————— Listino ————————————————————————————————

const VUOTO: Omit<ArticoloBar, 'id'> = { nome: '', categoria: '', prezzoVendita: 0, costoAcquisto: 0, giacenza: 0, sogliaRiordino: 0, unita: 'pz', disponibile: true }

function Listino() {
  const { articoliBar, sezioniBar, modificaArticoloBar } = useDemoData()
  const [cerca, setCerca] = useState('')
  const [filtro, setFiltro] = useState('tutte')
  const [modifica, setModifica] = useState<ArticoloBar | 'nuovo'>()
  const [categorie, setCategorie] = useState(false)
  const t = cerca.trim().toLowerCase()
  const gruppi = sezioniBar
    .filter((s) => filtro === 'tutte' || s.id === filtro)
    .map((s) => ({ sez: s, articoli: articoliBar.filter((a) => a.categoria === s.id && (!t || a.nome.toLowerCase().includes(t))) }))
    .filter((g) => g.articoli.length > 0 || (!t && filtro !== 'tutte'))
  // articoli finiti in una categoria eliminata altrove: li mostro per poterli spostare
  const orfani = articoliBar.filter((a) => !sezioniBar.some((s) => s.id === a.categoria) && (!t || a.nome.toLowerCase().includes(t)))
  const sottoSoglia = articoliBar.filter((a) => a.giacenza < a.sogliaRiordino).length

  return (
    <Card>
      <CardHeader
        titolo="Listino e giacenze"
        sottotitolo={`${articoliBar.length} articoli in ${sezioniBar.length} categorie · lo stesso listino di ComandApp${sottoSoglia ? ` · ${sottoSoglia} sotto soglia` : ''}`}
      />
      <CardBody className="space-y-3 pt-1">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[10rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-profondo/40" />
            <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca articolo" className="h-9 w-full rounded-lg border border-calce-200 bg-white pl-8 pr-3 text-sm focus-visible:focus-ring" />
          </label>
          <div className="w-40"><Select value={filtro} onChange={(e) => setFiltro(e.target.value)} opzioni={[{ valore: 'tutte', etichetta: 'Tutte le categorie' }, ...sezioniBar.map((s) => ({ valore: s.id, etichetta: s.nome }))]} /></div>
          <Button onClick={() => setCategorie(true)}><Tags className="h-4 w-4" /> Categorie</Button>
          <Button variante="primario" onClick={() => setModifica('nuovo')}><Plus className="h-4 w-4" /> Nuovo articolo</Button>
        </div>

        {[...gruppi, ...(orfani.length ? [{ sez: { id: '', nome: 'Senza categoria' }, articoli: orfani }] : [])].map(({ sez, articoli }) => (
          <section key={sez.id || 'orfani'}>
            <h3 className="mb-1 flex items-baseline justify-between border-b border-calce-200 pb-1 text-xs font-semibold uppercase tracking-wide text-profondo/50">
              <span>{sez.nome}</span><span className="font-normal normal-case">{articoli.length} articoli</span>
            </h3>
            {articoli.length === 0 && <p className="py-3 text-center text-sm text-profondo/45">Nessun articolo in questa categoria.</p>}
            <ul className="divide-y divide-calce-200/70">
              {articoli.map((a) => {
                const off = a.disponibile === false
                const margine = a.prezzoVendita > 0 ? (a.prezzoVendita - a.costoAcquisto) / a.prezzoVendita : 0
                return (
                  <li key={a.id} className={cn('flex items-center gap-3 py-2 text-sm', off && 'opacity-55')}>
                    <button onClick={() => setModifica(a)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className="truncate font-medium text-profondo">{a.nome}</span>
                      <Pencil className="h-3.5 w-3.5 shrink-0 text-profondo/30" />
                    </button>
                    <span className="num hidden w-16 text-right text-xs text-profondo/50 sm:block" title="Margine">{percento(margine)}</span>
                    <span className={cn('num w-14 text-right text-xs', a.giacenza < a.sogliaRiordino ? 'font-semibold text-boa' : 'text-profondo/60')} title={`Giacenza (soglia ${a.sogliaRiordino})`}>
                      {numero(a.giacenza)} {a.unita}
                    </span>
                    <span className="num w-16 text-right font-semibold text-profondo">{euroCent(a.prezzoVendita)}</span>
                    <button
                      onClick={() => modificaArticoloBar(a.id, { disponibile: off })}
                      className={cn('w-24 shrink-0 rounded-full px-2 py-1 text-xs font-semibold', off ? 'bg-boa/15 text-boa' : 'bg-acqua/20 text-profondo')}
                      title="In ComandApp e Comande compaiono solo gli articoli disponibili"
                    >
                      {off ? 'Esaurito' : 'Disponibile'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {gruppi.length === 0 && orfani.length === 0 && <p className="py-6 text-center text-sm text-profondo/50">Nessun articolo trovato.</p>}
      </CardBody>

      {modifica && <ModificaArticolo articolo={modifica === 'nuovo' ? undefined : modifica} categoriaIniziale={filtro !== 'tutte' ? filtro : sezioniBar[0]?.id ?? ''} onChiudi={() => setModifica(undefined)} />}
      {categorie && <GestisciCategorie onChiudi={() => setCategorie(false)} />}
    </Card>
  )
}

function ModificaArticolo({ articolo, categoriaIniziale, onChiudi }: { articolo?: ArticoloBar; categoriaIniziale: string; onChiudi: () => void }) {
  const { sezioniBar, aggiungiArticoloBar, modificaArticoloBar, rimuoviArticoloBar } = useDemoData()
  const [d, setD] = useState<Omit<ArticoloBar, 'id'>>(() => (articolo ? { ...VUOTO, ...articolo } : { ...VUOTO, categoria: categoriaIniziale }))
  const [conferma, setConferma] = useState(false)
  const set = (patch: Partial<Omit<ArticoloBar, 'id'>>) => setD((x) => ({ ...x, ...patch }))
  const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0 }
  const valido = d.nome.trim() !== '' && sezioniBar.some((s) => s.id === d.categoria)
  const salva = () => {
    if (!valido) return
    const dati = { ...d, nome: d.nome.trim() }
    if (articolo) modificaArticoloBar(articolo.id, dati)
    else aggiungiArticoloBar(dati)
    onChiudi()
  }
  const campo = 'h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm focus-visible:focus-ring'
  const etichetta = 'mb-1 block text-xs font-medium text-profondo/60'
  return (
    <Modal
      aperto
      onChiudi={onChiudi}
      titolo={articolo ? `Modifica «${articolo.nome}»` : 'Nuovo articolo'}
      piede={
        <div className="flex items-center justify-between gap-2">
          {articolo ? (
            conferma
              ? <Button variante="pericolo" dimensione="sm" onClick={() => { rimuoviArticoloBar(articolo.id); onChiudi() }}><Trash2 className="h-4 w-4" /> Conferma eliminazione</Button>
              : <Button variante="fantasma" dimensione="sm" onClick={() => setConferma(true)}><Trash2 className="h-4 w-4" /> Elimina</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button dimensione="sm" onClick={onChiudi}>Annulla</Button>
            <Button variante="primario" dimensione="sm" disabled={!valido} onClick={salva}>Salva</Button>
          </div>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); salva() }} className="grid grid-cols-2 gap-3">
        <label className="col-span-2"><span className={etichetta}>Nome</span><input autoFocus value={d.nome} onChange={(e) => set({ nome: e.target.value })} className={campo} /></label>
        <label className="col-span-2"><span className={etichetta}>Categoria</span>
          <Select value={d.categoria} onChange={(e) => set({ categoria: e.target.value })} opzioni={[...(sezioniBar.some((s) => s.id === d.categoria) ? [] : [{ valore: d.categoria, etichetta: '— scegli —' }]), ...sezioniBar.map((s) => ({ valore: s.id, etichetta: s.nome }))]} />
        </label>
        <label><span className={etichetta}>Prezzo di vendita (€)</span><input inputMode="decimal" defaultValue={d.prezzoVendita || ''} onChange={(e) => set({ prezzoVendita: num(e.target.value) })} className={campo} /></label>
        <label><span className={etichetta}>Costo d'acquisto (€)</span><input inputMode="decimal" defaultValue={d.costoAcquisto || ''} onChange={(e) => set({ costoAcquisto: num(e.target.value) })} className={campo} /></label>
        <label><span className={etichetta}>Giacenza</span><input inputMode="numeric" defaultValue={d.giacenza || ''} onChange={(e) => set({ giacenza: Math.round(num(e.target.value)) })} className={campo} /></label>
        <label><span className={etichetta}>Soglia di riordino</span><input inputMode="numeric" defaultValue={d.sogliaRiordino || ''} onChange={(e) => set({ sogliaRiordino: Math.round(num(e.target.value)) })} className={campo} /></label>
        <label><span className={etichetta}>Unità</span><input value={d.unita} onChange={(e) => set({ unita: e.target.value })} className={campo} /></label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={d.disponibile !== false} onChange={(e) => set({ disponibile: e.target.checked })} className="h-4 w-4 accent-cabina" /> Disponibile in ComandApp
        </label>
        {d.prezzoVendita > 0 && <p className="col-span-2 text-xs text-profondo/55">Margine {percento((d.prezzoVendita - d.costoAcquisto) / d.prezzoVendita)} · {euroCent(d.prezzoVendita - d.costoAcquisto)} a pezzo</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

function GestisciCategorie({ onChiudi }: { onChiudi: () => void }) {
  const { sezioniBar, articoliBar, aggiungiSezioneBar, rinominaSezioneBar, spostaSezioneBar, rimuoviSezioneBar } = useDemoData()
  const [nuova, setNuova] = useState('')
  const aggiungi = () => { if (nuova.trim()) { aggiungiSezioneBar(nuova); setNuova('') } }
  return (
    <Modal aperto onChiudi={onChiudi} titolo="Categorie del listino" piede={<p className="text-xs text-profondo/55">L'ordine è quello delle schede in ComandApp. Si elimina solo una categoria vuota.</p>}>
      <ul className="space-y-2">
        {sezioniBar.map((s, i) => {
          const n = articoliBar.filter((a) => a.categoria === s.id).length
          return (
            <li key={s.id} className="flex items-center gap-2">
              <input defaultValue={s.nome} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.nome) rinominaSezioneBar(s.id, v) }} className="h-9 min-w-0 flex-1 rounded-lg border border-calce-200 bg-white px-3 text-sm focus-visible:focus-ring" />
              <span className="w-8 text-right text-xs text-profondo/50">{n}</span>
              <button disabled={i === 0} onClick={() => spostaSezioneBar(s.id, -1)} className="grid h-8 w-8 place-content-center rounded-lg text-profondo/60 hover:bg-calce disabled:opacity-30" aria-label="Sposta su"><ChevronUp className="h-4 w-4" /></button>
              <button disabled={i === sezioniBar.length - 1} onClick={() => spostaSezioneBar(s.id, 1)} className="grid h-8 w-8 place-content-center rounded-lg text-profondo/60 hover:bg-calce disabled:opacity-30" aria-label="Sposta giù"><ChevronDown className="h-4 w-4" /></button>
              <button disabled={n > 0} onClick={() => rimuoviSezioneBar(s.id)} className="grid h-8 w-8 place-content-center rounded-lg text-boa hover:bg-boa/10 disabled:opacity-25" aria-label="Elimina" title={n > 0 ? 'Sposta o elimina prima gli articoli' : 'Elimina'}><Trash2 className="h-4 w-4" /></button>
            </li>
          )
        })}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); aggiungi() }} className="mt-4 flex gap-2">
        <input value={nuova} onChange={(e) => setNuova(e.target.value)} placeholder="Nuova categoria (es. Aperitivi)" className="h-9 min-w-0 flex-1 rounded-lg border border-calce-200 bg-white px-3 text-sm focus-visible:focus-ring" />
        <Button variante="primario" dimensione="sm" type="submit" disabled={!nuova.trim()}><Plus className="h-4 w-4" /> Aggiungi</Button>
      </form>
    </Modal>
  )
}
