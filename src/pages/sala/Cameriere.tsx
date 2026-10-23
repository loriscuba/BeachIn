/**
 * Modalità cameriere: tavolo → piatti dal menu del Ristorante → «Invia in cucina».
 * Pensata per telefono/palmare: tavoli a tessere grandi, piatti per sezione con + e −.
 * I piatti si dividono in uscite (Subito, 1ª, 2ª…) trascinandoli col dito/mouse (eventi pointer, così funziona anche
 * su telefono e iPad, dove il drag&drop HTML5 non va) oppure toccando il piatto e poi l'uscita;
 * poi il cameriere dà il «via» alle uscite successive e segna quelle servite.
 */
import { useMemo, useRef, useState, type PointerEvent as PE } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Minus, Send, Check, Search, Users, ChefHat, Tablet, GripVertical, Play, HandPlatter, ChevronUp } from 'lucide-react'
import type { ComandaSala, RigaComandaSala } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useSessione } from '@/context/SessioneContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { config } from '@/data/config'
import { euroCent } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { aperteDelTavolo, etichettaStatoSala, nomeUscita, statoRiga, tonoStatoSala, USCITE, uscitaPredefinita, usciteDi } from '@/lib/sala'

// 16px su telefono: con meno iPhone ingrandisce la pagina quando si tocca il campo
const campo = 'h-10 rounded-lg border border-calce-200 bg-white px-3 text-base text-profondo focus-visible:focus-ring sm:h-9 sm:text-sm'

/** `app`: dentro l'app di sala (barra delle schede in fondo, la barra della comanda le sta sopra). */
export default function Cameriere({ app = false }: { app?: boolean }) {
  const { menu, sezioniMenu, tavoliDelGiorno, comandeSala, inviaComandaSala, chiamaUscitaSala, segnaRigheSala } = useDemoData()
  const { profilo } = useSessione()
  const tavoli = useMemo(() => [...tavoliDelGiorno(config.oggi)].sort((a, b) => a.numero - b.numero), [tavoliDelGiorno])
  const [tavolo, setTavolo] = useState<number | null>(null)
  const [coperti, setCoperti] = useState('')
  const [note, setNote] = useState('')
  const [qta, setQta] = useState<Record<string, number>>({})
  // uscita scelta a mano per piatto (altrimenti quella proposta dalla sezione)
  const [usc, setUsc] = useState<Record<string, number>>({})
  const [sopra, setSopra] = useState<number | null>(null)
  // piatto scelto con un tocco (poi si tocca l'uscita) e trascinamento in corso
  const [scelto, setScelto] = useState<string | null>(null)
  const sceltoRef = useRef(scelto)
  sceltoRef.current = scelto
  const [fantasma, setFantasma] = useState<{ nome: string; x: number; y: number } | null>(null)
  const presa = useRef<{ id: string; nome: string; x0: number; y0: number; mossa: boolean } | null>(null)
  const zonaSotto = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-uscita]')
    return el ? Number(el.getAttribute('data-uscita')) : null
  }
  const sposta = (id: string, n: number) => { setUsc((m) => ({ ...m, [id]: n })); setScelto(null) }
  // Safari su iPhone perde gli eventi pointer sull'elemento (capture) e scorre la pagina: si ascolta su window
  // e si blocca lo scorrimento (touchmove non passivo) finché il dito tiene il piatto.
  const giu = (e: PE, id: string, nome: string) => {
    if ((e.target as HTMLElement).closest('button')) return
    presa.current = { id, nome, x0: e.clientX, y0: e.clientY, mossa: false }
    const blocca = (ev: TouchEvent) => { if (presa.current) ev.preventDefault() }
    const muovi = (ev: PointerEvent) => {
      const p = presa.current
      if (!p) return
      if (!p.mossa && Math.hypot(ev.clientX - p.x0, ev.clientY - p.y0) < 6) return
      p.mossa = true
      setFantasma({ nome: p.nome, x: ev.clientX, y: ev.clientY })
      setSopra(zonaSotto(ev.clientX, ev.clientY))
    }
    const fine = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', muovi)
      window.removeEventListener('pointerup', fine)
      window.removeEventListener('pointercancel', fine)
      document.removeEventListener('touchmove', blocca)
      const p = presa.current
      presa.current = null
      setFantasma(null); setSopra(null)
      if (!p || ev.type === 'pointercancel') return
      if (p.mossa) {
        const n = zonaSotto(ev.clientX, ev.clientY)
        if (n != null) sposta(p.id, n)
      } else {
        // tocco: scegli il piatto, poi tocca l'uscita (anche sopra un altro piatto di quell'uscita)
        const gia = sceltoRef.current
        const n = zonaSotto(ev.clientX, ev.clientY)
        if (gia && gia !== p.id && n != null) sposta(gia, n)
        else setScelto(gia === p.id ? null : p.id)
      }
    }
    window.addEventListener('pointermove', muovi)
    window.addEventListener('pointerup', fine)
    window.addEventListener('pointercancel', fine)
    document.addEventListener('touchmove', blocca, { passive: false })
  }
  const [sezione, setSezione] = useState<string>('tutte')
  const [cerca, setCerca] = useState('')
  const [inviata, setInviata] = useState(false)
  const rifComanda = useRef<HTMLDivElement>(null)

  const q = cerca.trim().toLowerCase()
  const righe: RigaComandaSala[] = useMemo(
    () => sezioniMenu.flatMap((s) => menu.filter((p) => p.categoria === s.id && (qta[p.id] ?? 0) > 0).map((p) => ({
      piattoId: p.id, nome: p.nome, sezione: s.nome, quantita: qta[p.id], prezzoUnitario: p.prezzo, uscita: usc[p.id] ?? uscitaPredefinita(s.id),
    }))),
    [menu, sezioniMenu, qta, usc]
  )
  const totale = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)
  const pezzi = righe.reduce((s, r) => s + r.quantita, 0)
  const aperte = tavolo == null ? [] : aperteDelTavolo(comandeSala, tavolo)
  const contoTavolo = aperte.reduce((s, c) => s + c.totale, 0)

  const cambia = (id: string, d: number) => setQta((m) => {
    const v = Math.max(0, (m[id] ?? 0) + d)
    const n = { ...m }
    if (v) n[id] = v; else delete n[id]
    return n
  })
  const invia = () => {
    if (tavolo == null || !righe.length) return
    inviaComandaSala(tavolo, righe, { origine: 'cameriere', cameriere: profilo?.nome, coperti: Number(coperti) || undefined, note })
    setQta({}); setUsc({}); setScelto(null); setNote('')
    setInviata(true)
    window.setTimeout(() => setInviata(false), 3000)
  }

  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_380px]', !app && tavolo != null && 'pb-20 md:pb-0')}>
      <div className="min-w-0 space-y-4">
        {/* Tavoli */}
        {tavolo != null ? (
          <Card>
            <CardBody className="flex items-center gap-3 py-3">
              <span className="grid h-11 w-11 place-content-center rounded-xl bg-gradient-to-br from-profondo to-cabina text-lg font-bold text-white num">{tavolo}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-profondo">Tavolo {tavolo}</p>
                <p className="text-xs text-profondo/55">{aperte.length ? `${aperte.length} comand${aperte.length > 1 ? 'e aperte' : 'a aperta'} · ${euroCent(contoTavolo)}` : 'Nessuna comanda aperta'}</p>
              </div>
              <Button dimensione="sm" onClick={() => setTavolo(null)}>Cambia tavolo</Button>
            </CardBody>
          </Card>
        ) : (
        <Card>
          <CardHeader titolo="Tavolo" sottotitolo="Tocca il tavolo per cui prendi la comanda" />
          <CardBody className="pt-2">
            <div className="grid grid-cols-4 gap-2 min-[400px]:grid-cols-5 sm:grid-cols-8 lg:grid-cols-9">
              {tavoli.map((t) => {
                const n = aperteDelTavolo(comandeSala, t.numero).length
                return (
                  <button key={t.id} type="button" onClick={() => { setTavolo(t.numero); setCoperti('') }}
                    className={cn('relative grid h-14 place-content-center rounded-xl border text-center transition',
                      tavolo === t.numero ? 'border-cabina bg-gradient-to-br from-profondo to-cabina text-white shadow' : n ? 'border-tenda bg-tenda/15 text-profondo' : 'border-calce-200 bg-white text-profondo hover:border-cabina')}>
                    <span className="num text-lg font-bold leading-none">{t.numero}</span>
                    <span className={cn('text-[10px]', tavolo === t.numero ? 'text-white/75' : 'text-profondo/50')}>{t.posti} posti</span>
                    {n > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-content-center rounded-full bg-boa px-1 text-[11px] font-bold text-white">{n}</span>}
                  </button>
                )
              })}
            </div>
          </CardBody>
        </Card>
        )}

        {/* Menu */}
        <Card>
          <CardHeader titolo="Menu" sottotitolo="Lo stesso del Ristorante → Menu" />
          <CardBody className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative w-full min-w-0 sm:w-auto sm:min-w-[10rem] sm:flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-profondo/40" />
                <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca piatto" className={cn(campo, 'w-full pl-8')} />
              </label>
              <div className="-mx-1 flex w-full min-w-0 gap-1 overflow-x-auto px-1 pb-1">
                {[{ id: 'tutte', nome: 'Tutto' }, ...sezioniMenu].map((s) => (
                  <button key={s.id} type="button" data-naviga onClick={() => setSezione(s.id)}
                    className={cn('whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium', sezione === s.id ? 'border-cabina bg-cabina text-white' : 'border-calce-200 text-profondo/70')}>
                    {s.nome}
                  </button>
                ))}
              </div>
            </div>
            {sezioniMenu.filter((s) => sezione === 'tutte' || s.id === sezione).map((s) => {
              const piatti = menu.filter((p) => p.categoria === s.id && (!q || p.nome.toLowerCase().includes(q)))
              if (!piatti.length) return null
              return (
                <div key={s.id}>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-profondo/50">{s.nome}</h3>
                  <ul className="divide-y divide-calce-200">
                    {piatti.map((p) => {
                      const n = qta[p.id] ?? 0
                      return (
                        <li key={p.id} className="flex items-center gap-3 py-2">
                          {p.foto ? <img src={p.foto} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="h-10 w-10 shrink-0 rounded-lg bg-calce/60" />}
                          <button type="button" onClick={() => cambia(p.id, 1)} className="min-w-0 flex-1 text-left">
                            <span className="block truncate text-sm font-medium text-profondo">{p.nome}</span>
                            <span className="num text-xs text-profondo/55">{euroCent(p.prezzo)}</span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            {n > 0 && (
                              <>
                                <button type="button" onClick={() => cambia(p.id, -1)} className="grid h-9 w-9 place-content-center rounded-full border border-calce-200 text-profondo" aria-label="Togli uno"><Minus className="h-4 w-4" /></button>
                                <span className="num w-6 text-center font-bold text-profondo">{n}</span>
                              </>
                            )}
                            <button type="button" onClick={() => cambia(p.id, 1)} className="grid h-9 w-9 place-content-center rounded-full bg-cabina text-white" aria-label="Aggiungi uno"><Plus className="h-4 w-4" /></button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      {/* Comanda in corso + comande del tavolo */}
      <div ref={rifComanda} className="scroll-mt-20 min-w-0 space-y-4 md:sticky md:top-4 md:self-start">
        <Card>
          <CardHeader titolo={tavolo == null ? 'Comanda' : `Comanda · tavolo ${tavolo}`} sottotitolo={pezzi ? `${pezzi} piatti · ${euroCent(totale)}` : 'Nessun piatto ancora'} />
          <CardBody className="space-y-3 pt-2">
            {righe.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-profondo/50">{scelto ? 'Ora tocca l’uscita dove spostarlo.' : 'Trascina i piatti nell’uscita giusta, oppure tocca il piatto e poi l’uscita.'}</p>
                {USCITE.map((n) => {
                  const qui = righe.filter((r) => r.uscita === n)
                  return (
                    <div key={n} data-uscita={n}
                      onClick={() => { if (scelto) sposta(scelto, n) }}
                      className={cn('cursor-pointer rounded-xl border border-dashed p-2 transition', sopra === n ? 'border-cabina bg-cabina/10' : scelto ? 'cursor-pointer border-cabina/50' : qui.length ? 'border-calce-300' : 'border-calce-200 opacity-60')}>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">{nomeUscita(n)}</p>
                      {!qui.length && <p className="py-1 text-center text-xs text-profondo/35">{scelto ? 'Tocca per spostare qui' : 'Trascina qui'}</p>}
                      <ul className="space-y-1 text-sm">
                        {qui.map((r) => (
                          <li key={r.piattoId}
                            onPointerDown={(e) => giu(e, r.piattoId, r.nome)}
                            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn('flex touch-none select-none items-center gap-1.5 rounded-lg bg-white px-1.5 py-1.5 shadow-sm cursor-grab active:cursor-grabbing',
                              scelto === r.piattoId && 'ring-2 ring-cabina', fantasma && presa.current?.id === r.piattoId && 'opacity-40')}>
                            <GripVertical className="h-4 w-4 shrink-0 text-profondo/30" />
                            <span className="num w-6 font-bold text-cabina">{r.quantita}×</span>
                            <span className="min-w-0 flex-1 truncate text-profondo">{r.nome}</span>
                            <button type="button" title="Sposta all'uscita successiva" onClick={() => setUsc((m) => ({ ...m, [r.piattoId]: ((r.uscita ?? 1) + 1) % USCITE.length }))}
                              className="num grid h-7 min-w-7 place-content-center rounded-full border border-calce-200 px-1.5 text-xs font-semibold text-profondo/70 hover:border-cabina">{n === 0 ? 'S' : n}</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
                <p className="num text-right text-sm font-semibold text-profondo">{euroCent(totale)}</p>
                {/* in un portale: dentro la pagina (animata con transform) il fixed non seguirebbe il dito */}
                {fantasma && createPortal(
                  <div className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-cabina px-3 py-1.5 text-sm font-medium text-white shadow-xl"
                    style={{ left: fantasma.x, top: fantasma.y }}>{fantasma.nome}</div>,
                  document.body
                )}
              </div>
            )}
            <div className="flex gap-2">
              <label className="relative w-24">
                <Users className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-profondo/40" />
                <input value={coperti} onChange={(e) => setCoperti(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Coperti" className={cn(campo, 'w-full pl-8')} />
              </label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note per la cucina (allergie, cotture…)" className={cn(campo, 'min-w-0 flex-1')} />
            </div>
            <Button variante="primario" className="w-full" disabled={tavolo == null || !righe.length} onClick={invia}>
              {inviata ? <><Check className="h-4 w-4" /> Inviata in cucina</> : <><Send className="h-4 w-4" /> {tavolo == null ? 'Scegli il tavolo' : 'Invia in cucina'}</>}
            </Button>
          </CardBody>
        </Card>

        {tavolo != null && (
          <Card>
            <CardHeader titolo={`Tavolo ${tavolo}: già ordinato`} sottotitolo={aperte.length ? `Conto finora ${euroCent(contoTavolo)}` : 'Nessuna comanda aperta'} />
            {aperte.length > 0 && (
              <CardBody className="space-y-2 pt-2">
                {aperte.map((c) => <ComandaAperta key={c.id} c={c} onVia={(n) => chiamaUscitaSala(c.id, n)} onServita={(indici) => segnaRigheSala(c.id, indici, 'servita')} />)}
              </CardBody>
            )}
          </Card>
        )}
      </div>

      {/* su telefono la comanda è in fondo alla pagina: barra fissa con il riepilogo e l'invio (portale: la pagina usa transform) */}
      {tavolo != null && createPortal(
        <div className={cn('fixed inset-x-0 z-30 px-3 pb-2 md:hidden', app ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))]' : 'bottom-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]')}>
          <div className="flex items-center gap-2 rounded-2xl bg-profondo p-2 text-white shadow-xl">
            <button type="button" onClick={() => rifComanda.current?.scrollIntoView({ behavior: 'smooth' })} className="flex min-w-0 flex-1 items-center gap-2 px-2 text-left">
              <ChevronUp className="h-4 w-4 shrink-0 text-white/60" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Tavolo {tavolo} · {pezzi ? `${pezzi} piatti` : 'comanda vuota'}</span>
                <span className="num block text-xs text-white/65">{pezzi ? euroCent(totale) : 'Tocca per vedere uscite e già ordinato'}</span>
              </span>
            </button>
            <button type="button" disabled={!righe.length} onClick={invia}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-tenda px-4 text-sm font-semibold text-profondo disabled:opacity-40">
              {inviata ? <><Check className="h-4 w-4" /> Inviata</> : <><Send className="h-4 w-4" /> Invia</>}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/** Comanda già inviata: uscite con il loro stato, «Dai il via» alla prossima e «Servita» quando è pronta. */
function ComandaAperta({ c, onVia, onServita }: { c: ComandaSala; onVia: (n: number) => void; onServita: (indici: number[]) => void }) {
  const uscite = usciteDi(c)
  const prossima = uscite.find((u) => !u.chiamata)
  return (
    <div className="rounded-xl border border-calce-200 p-2.5 text-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="num font-semibold text-profondo">{c.ora}</span>
        {c.origine === 'self' ? <Badge tono="mare"><Tablet className="h-3 w-3" /> Tablet</Badge> : <Badge tono="neutro"><ChefHat className="h-3 w-3" /> {c.cameriere ?? 'Sala'}</Badge>}
        <Badge tono={tonoStatoSala[c.stato]} puntino className="ml-auto">{etichettaStatoSala[c.stato]}</Badge>
      </div>
      <div className="space-y-1.5">
        {uscite.map((u) => {
          // piatti già pronti ma non serviti: il cameriere li porta subito o aspetta il resto dell'uscita
          const pronti = u.righe.filter(({ r }) => statoRiga(c, r) === 'pronta').map(({ i }) => i)
          const inParte = u.stato === 'attesa' && pronti.length > 0
          return (
          <div key={u.n} className={cn('rounded-lg px-2 py-1.5', u.stato === 'servita' ? 'bg-calce/40 text-profondo/40' : u.stato === 'pronta' || inParte ? 'bg-acqua/15' : !u.chiamata ? 'bg-calce/30' : 'bg-tenda/10')}>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
              <span className="text-profondo/60">{nomeUscita(u.n)}</span>
              <span className={cn('ml-auto', u.stato === 'pronta' || inParte ? 'text-acqua' : 'text-profondo/45')}>
                {u.stato === 'servita' ? 'Servita' : u.stato === 'pronta' ? 'Pronta' : inParte ? `Pronti ${pronti.length} su ${u.righe.length}` : u.chiamata ? 'In cucina' : 'In attesa del via'}
              </span>
            </div>
            <ul className="mt-0.5 space-y-0.5">
              {u.righe.map(({ r, i }) => {
                const st = statoRiga(c, r)
                return (
                  <li key={i} className={cn('flex items-center gap-1.5', st === 'servita' ? 'text-profondo/40 line-through' : 'text-profondo/75')}>
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', st === 'pronta' ? 'bg-acqua' : st === 'servita' ? 'bg-calce-300' : 'bg-tenda')} />
                    <span className="min-w-0 flex-1">{r.quantita}× {r.nome}</span>
                    {st === 'pronta' && <span className="text-[11px] font-semibold text-acqua">pronto</span>}
                  </li>
                )
              })}
            </ul>
            {pronti.length > 0 && (
              <Button dimensione="sm" variante={inParte ? 'secondario' : 'primario'} className="mt-1.5 w-full" onClick={() => onServita(pronti)}>
                <HandPlatter className="h-4 w-4" /> {inParte ? `Porta subito i pronti (${pronti.length})` : 'Servita'}
              </Button>
            )}
            {inParte && <p className="mt-1 text-center text-[11px] text-profondo/50">oppure aspetta che sia pronta tutta l’uscita</p>}
          </div>
          )
        })}
      </div>
      {prossima && (
        <Button dimensione="sm" className="mt-2 w-full" onClick={() => onVia(prossima.n)}><Play className="h-4 w-4" /> Dai il via: {nomeUscita(prossima.n).toLowerCase()}</Button>
      )}
    </div>
  )
}
