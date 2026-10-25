/**
 * Tablet self al tavolo: menu a tutto schermo, verde bosco ed elegante (spunto dal layout di Loris),
 * con foto rotonde, descrizioni e prezzi per sezione. Il cliente compone l'ordine e lo manda in cucina.
 * Un solo menu per tablet (scelto all'avvio): Ristorante (va in cucina), Bar (listino bar, va al bar, modulo Bar al tavolo)
 * o Lavagnetta (proposte del giorno, ogni voce va al suo reparto).
 * Bloccato: si esce solo col PIN scelto dal personale.
 */
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, Minus, Plus, ShoppingBag, UtensilsCrossed, X, Send, Check, ChefHat, Smartphone } from 'lucide-react'
import { QrCodice } from '@/components/QrCodice'
import type { Piatto, RigaComandaSala } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { config } from '@/data/config'
import { euroCent } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { urlTavoloQr, delConto, articoliComePiatti, etichettaStatoSala, fotoCopertinaSala, uscitaPredefinita } from '@/lib/sala'
import { salvaSelf, type StatoSelf } from './AvvioSelf'
import { useQrTavolo } from './QrTavoli'

// Palette del tablet: verde bosco, crema e oro
const BOSCO = 'bg-[#0E2A22]'
const PANNELLO = 'bg-[#143529]'
const ORO = 'text-[#D9B66A]'
const BTN_ORO = 'bg-[#D9B66A] text-[#0E2A22] hover:bg-[#E6C77E]'

const ALLERGENI: Record<string, string> = {
  glutine: 'glutine', crostacei: 'crostacei', uova: 'uova', pesce: 'pesce', arachidi: 'arachidi', soia: 'soia',
  latte: 'latte', frutta_guscio: 'frutta a guscio', sedano: 'sedano', molluschi: 'molluschi',
}

/** `qr`: aperto dal telefono del cliente col QR del tavolo (niente lucchetto né PIN; la comanda è «qr»).
 *  `seduta`: il conto su cui la pagina ordina; chiuso quello, l'invio viene rifiutato. */
export default function TabletSelf({ stato, onEsci, qr = false, seduta }: { stato: StatoSelf; onEsci: () => void; qr?: boolean; seduta?: string }) {
  const { menu, sezioniMenu, articoliBar, sezioniBar, lavagnetta, comandeSala, inviaComandaSala, tavoliQr } = useDemoData()
  const conBar = useModuli().moduloAttivo('bar-tavolo')
  const tipo = stato.menu === 'bar' && !conBar ? 'ristorante' : stato.menu ?? 'ristorante'
  const [qta, setQta] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [carrello, setCarrello] = useState(false)
  const [grazie, setGrazie] = useState(false)
  const [sblocco, setSblocco] = useState(false)
  const [telefono, setTelefono] = useState(false)

  // reparto per piatto (la lavagnetta li mescola)
  const { sezioni, alBar } = useMemo(() => {
    if (tipo === 'bar') {
      const bevande = articoliComePiatti(articoliBar)
      return { sezioni: sezioniBar.map((s) => ({ ...s, piatti: bevande.filter((p) => p.categoria === s.id) })).filter((s) => s.piatti.length), alBar: new Set(bevande.map((p) => p.id)) }
    }
    if (tipo === 'lavagnetta') {
      const piatti: Piatto[] = lavagnetta.map((v) => ({ id: v.id, nome: v.nome, descrizione: v.descrizione, categoria: 'lavagnetta', prezzo: v.prezzo ?? 0, foodCost: 0, allergeni: [], vendutiStagione: 0 }))
      return { sezioni: piatti.length ? [{ id: 'lavagnetta', nome: 'La lavagna di oggi', piatti }] : [], alBar: new Set(lavagnetta.filter((v) => v.reparto === 'bar').map((v) => v.id)) }
    }
    return { sezioni: sezioniMenu.map((s) => ({ ...s, piatti: menu.filter((p) => p.categoria === s.id) })).filter((s) => s.piatti.length), alBar: new Set<string>() }
  }, [tipo, menu, sezioniMenu, articoliBar, sezioniBar, lavagnetta])
  const righe: RigaComandaSala[] = useMemo(
    () => sezioni.flatMap((s) => s.piatti.filter((p) => qta[p.id]).map((p) => ({
      piattoId: p.id, nome: p.nome, sezione: s.nome, quantita: qta[p.id], prezzoUnitario: p.prezzo,
      ...(alBar.has(p.id) ? { uscita: 0, reparto: 'bar' as const } : { uscita: tipo === 'lavagnetta' ? 1 : uscitaPredefinita(s.id) }),
    }))),
    [sezioni, alBar, tipo, qta]
  )
  const pezzi = righe.reduce((s, r) => s + r.quantita, 0)
  const totale = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)
  const ordini = delConto(comandeSala, stato.tavolo, seduta || tavoliQr.find((q) => q.numero === stato.tavolo)?.seduta)

  const cambia = (id: string, d: number) => setQta((m) => {
    const v = Math.max(0, (m[id] ?? 0) + d)
    const n = { ...m }
    if (v) n[id] = v; else delete n[id]
    return n
  })
  const vai = (id: string) => document.getElementById(`self-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const invia = () => {
    if (!righe.length) return
    if (!inviaComandaSala(stato.tavolo, righe, { origine: qr ? 'qr' : 'self', note, seduta: seduta || undefined })) return
    setQta({}); setNote(''); setCarrello(false); setGrazie(true)
  }

  // in un portale su <body>: fuori dallo shell (animazioni e tema scuro della pagina non lo toccano)
  return createPortal(
    <div className={cn('fixed inset-0 z-[100] overflow-y-auto text-[#F3EBDD]', BOSCO)}>
      {/* Barra */}
      <header className={cn('sticky top-0 z-20 border-b border-white/5 backdrop-blur', 'bg-[#0E2A22]/90')}>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <span className={cn('font-gesso text-3xl leading-none', ORO)}>{config.nome}</span>
          <nav className="ml-4 hidden gap-1 overflow-x-auto md:flex">
            {sezioni.map((s) => (
              <button key={s.id} type="button" onClick={() => vai(s.id)} className="whitespace-nowrap rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#F3EBDD]/70 hover:text-[#D9B66A]">{s.nome}</button>
            ))}
          </nav>
          <span className="ml-auto rounded-full border border-[#D9B66A]/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#D9B66A]">Tavolo {stato.tavolo}</span>
          {!qr && <button type="button" onClick={() => setTelefono(true)} className="grid h-9 w-9 place-content-center rounded-full text-[#D9B66A]/80 hover:text-[#D9B66A]" aria-label="Ordina dal tuo telefono" title="Ordina dal tuo telefono"><Smartphone className="h-4 w-4" /></button>}
          {!qr && <button type="button" onClick={() => setSblocco(true)} className="grid h-9 w-9 place-content-center rounded-full text-[#F3EBDD]/40 hover:text-[#F3EBDD]" aria-label="Sblocca tablet"><Lock className="h-4 w-4" /></button>}
        </div>
        {/* sezioni su tablet in verticale */}
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
          {sezioni.map((s) => (
            <button key={s.id} type="button" onClick={() => vai(s.id)} className="whitespace-nowrap rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-[#F3EBDD]/75">{s.nome}</button>
          ))}
        </nav>
      </header>

      {/* Copertina */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-6 py-10 sm:px-8 md:grid-cols-2 md:py-16">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#D9B66A]/80">Benvenuti al tavolo {stato.tavolo}</p>
          <h1 className="mt-3 font-display text-5xl italic leading-[1.05] sm:text-6xl">Il mare,<br />nel piatto</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#F3EBDD]/70">
            Sfoglia il nostro menu, scegli con calma e invia l’ordine: arriva direttamente a chi lo prepara. Per allergie o richieste scrivilo nelle note.
          </p>
          <button type="button" onClick={() => sezioni[0] && vai(sezioni[0].id)} className="mt-6 rounded-sm border border-[#D9B66A]/60 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-[#D9B66A] hover:bg-[#D9B66A]/10">Sfoglia il menu</button>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-0 rounded-full bg-black/30 blur-2xl" />
          <Foto src={fotoCopertinaSala} className="relative h-full w-full border-[10px] border-[#143529]" icona="h-16 w-16" />
        </div>
      </section>

      {/* Sezioni del menu */}
      <main className="mx-auto max-w-6xl space-y-14 px-6 pb-40 sm:px-8">
        {sezioni.map((s, i) => (
          <section key={s.id} id={`self-${s.id}`} className="scroll-mt-28">
            <div className="mb-6 text-center">
              <p className={cn('font-gesso text-2xl', ORO)}>{String(i + 1).padStart(2, '0')}</p>
              <h2 className="font-display text-4xl italic">{s.nome}</h2>
              <div className="mx-auto mt-3 h-px w-24 bg-[#D9B66A]/40" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {s.piatti.map((p) => <SchedaPiatto key={p.id} p={p} n={qta[p.id] ?? 0} onCambia={(d) => cambia(p.id, d)} />)}
            </div>
          </section>
        ))}
        <p className="text-center text-xs text-[#F3EBDD]/40">Per allergie e intolleranze chiedi al personale di sala.</p>
      </main>

      {/* Barra ordine */}
      {(pezzi > 0 || ordini.length > 0) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-4">
          <button type="button" onClick={() => setCarrello(true)} className={cn('pointer-events-auto flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold shadow-2xl', BTN_ORO)}>
            <ShoppingBag className="h-5 w-5" />
            {pezzi > 0 ? <>Il tuo ordine · {pezzi} {pezzi === 1 ? 'piatto' : 'piatti'} · <span className="num">{euroCent(totale)}</span></> : <>I tuoi ordini · {ordini.length}</>}
          </button>
        </div>
      )}

      {/* Pannello ordine */}
      {carrello && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setCarrello(false)}>
          <aside className={cn('flex h-full w-full max-w-md flex-col shadow-2xl', PANNELLO)} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center border-b border-white/10 px-6 py-4">
              <h3 className="font-display text-2xl italic">Il tuo ordine</h3>
              <button type="button" onClick={() => setCarrello(false)} className="ml-auto grid h-9 w-9 place-content-center rounded-full hover:bg-white/10" aria-label="Chiudi"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {righe.length === 0 && <p className="text-sm text-[#F3EBDD]/55">Non hai ancora scelto nulla.</p>}
              {righe.map((r) => (
                <div key={r.piattoId} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px]">{r.nome}</p>
                    <p className="num text-xs text-[#F3EBDD]/55">{euroCent(r.prezzoUnitario)}</p>
                  </div>
                  <Stepper n={r.quantita} onCambia={(d) => cambia(r.piattoId, d)} />
                </div>
              ))}
              {righe.length > 0 && (
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note per la cucina (allergie, cotture, senza…)"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F3EBDD] placeholder:text-[#F3EBDD]/35 focus:border-[#D9B66A]/60 focus:outline-none" />
              )}
              {ordini.length > 0 && (
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#D9B66A]/80">Già ordinato</p>
                  {ordini.map((c) => (
                    <div key={c.id} className="rounded-xl bg-black/20 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 text-xs text-[#F3EBDD]/60">
                        <span className="num">{c.ora}</span>
                        <span className={cn('ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5', c.stato === 'pronta' ? 'bg-[#7FB7A8]/25 text-[#BFE3D8]' : 'bg-[#D9B66A]/15 text-[#D9B66A]')}>
                          <ChefHat className="h-3 w-3" /> {etichettaStatoSala[c.stato]}
                        </span>
                      </div>
                      <p className="mt-1 text-[#F3EBDD]/85">{c.righe.map((x) => `${x.quantita}× ${x.nome}`).join(' · ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {righe.length > 0 && (
              <div className="border-t border-white/10 px-6 py-4">
                <div className="mb-3 flex items-baseline justify-between"><span className="text-sm text-[#F3EBDD]/65">Totale</span><span className="num font-display text-2xl">{euroCent(totale)}</span></div>
                <button type="button" onClick={invia} className={cn('flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.15em]', BTN_ORO)}>
                  <Send className="h-4 w-4" /> Invia in cucina
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Conferma */}
      {grazie && (
        <div className="fixed inset-0 z-50 grid place-content-center bg-black/60 p-6" onClick={() => setGrazie(false)}>
          <div className={cn('max-w-sm rounded-3xl p-8 text-center shadow-2xl', PANNELLO)}>
            <span className="mx-auto grid h-16 w-16 place-content-center rounded-full bg-[#D9B66A]/15"><Check className={cn('h-8 w-8', ORO)} /></span>
            <h3 className="mt-4 font-display text-3xl italic">Grazie!</h3>
            <p className="mt-2 text-[#F3EBDD]/70">Il tuo ordine è arrivato in cucina. Puoi seguirne lo stato da «I tuoi ordini».</p>
            <button type="button" className={cn('mt-6 rounded-full px-6 py-2.5 text-sm font-semibold', BTN_ORO)}>Torna al menu</button>
          </div>
        </div>
      )}

      {telefono && <QrTelefono tavolo={stato.tavolo} onChiudi={() => setTelefono(false)} />}
      {sblocco && <Sblocco pin={stato.pin} onChiudi={() => setSblocco(false)} onOk={() => { salvaSelf(null); if (document.fullscreenElement) void document.exitFullscreen?.(); onEsci() }} />}
    </div>,
    document.body
  )
}

function SchedaPiatto({ p, n, onCambia }: { p: Piatto; n: number; onCambia: (d: number) => void }) {
  return (
    <article className={cn('flex flex-col items-center rounded-3xl px-6 pb-6 pt-7 text-center ring-1 ring-white/5 transition', PANNELLO, n > 0 && 'ring-[#D9B66A]/50')}>
      <Foto src={p.foto} className="h-40 w-40 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]" />
      <h3 className="mt-5 font-display text-xl leading-snug">{p.nome}</h3>
      {p.descrizione && <p className="mt-2 text-sm leading-relaxed text-[#F3EBDD]/65">{p.descrizione}</p>}
      {p.allergeni.length > 0 && <p className="mt-2 text-[11px] uppercase tracking-wider text-[#F3EBDD]/35">{p.allergeni.map((a) => ALLERGENI[a] ?? a).join(' · ')}</p>}
      <div className="mt-auto flex w-full items-center justify-between pt-5">
        <span className={cn('num font-display text-2xl', ORO)}>{euroCent(p.prezzo)}</span>
        {n > 0 ? <Stepper n={n} onCambia={onCambia} /> : (
          <button type="button" onClick={() => onCambia(1)} className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold', BTN_ORO)}><Plus className="h-4 w-4" /> Aggiungi</button>
        )}
      </div>
    </article>
  )
}

function Stepper({ n, onCambia }: { n: number; onCambia: (d: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onCambia(-1)} className="grid h-10 w-10 place-content-center rounded-full border border-white/15 hover:bg-white/10" aria-label="Togli uno"><Minus className="h-4 w-4" /></button>
      <span className="num w-6 text-center text-lg font-semibold">{n}</span>
      <button type="button" onClick={() => onCambia(1)} className={cn('grid h-10 w-10 place-content-center rounded-full', BTN_ORO)} aria-label="Aggiungi uno"><Plus className="h-4 w-4" /></button>
    </div>
  )
}

/** Foto rotonda come un piatto visto dall'alto; senza foto (o se non carica) un piatto stilizzato. */
function Foto({ src, className, icona = 'h-10 w-10' }: { src?: string; className?: string; icona?: string }) {
  const [errore, setErrore] = useState(false)
  if (!src || errore) {
    return (
      <div className={cn('grid shrink-0 place-content-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#2A5A48,#0B231C_70%)] ring-1 ring-[#D9B66A]/20', className)}>
        <UtensilsCrossed className={cn('text-[#D9B66A]/40', icona)} />
      </div>
    )
  }
  return <img src={src} alt="" loading="lazy" onError={() => setErrore(true)} className={cn('shrink-0 rounded-full object-cover', className)} />
}

function Sblocco({ pin, onChiudi, onOk }: { pin: string; onChiudi: () => void; onOk: () => void }) {
  const [v, setV] = useState('')
  const [errore, setErrore] = useState(false)
  const prova = (x: string) => {
    setV(x); setErrore(false)
    if (x.length === 4) { if (x === pin) onOk(); else { setErrore(true); setV('') } }
  }
  return (
    <div className="fixed inset-0 z-[60] grid place-content-center bg-black/70 p-6" onClick={onChiudi}>
      <div className={cn('w-72 rounded-3xl p-6 text-center', PANNELLO)} onClick={(e) => e.stopPropagation()}>
        <Lock className={cn('mx-auto h-6 w-6', ORO)} />
        <p className="mt-2 text-sm text-[#F3EBDD]/75">Riservato al personale</p>
        <div className="my-4 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-3 w-3 rounded-full', i < v.length ? 'bg-[#D9B66A]' : 'bg-white/15')} />)}
        </div>
        {errore && <p className="mb-2 text-xs text-[#E4572E]">PIN errato</p>}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => k ? (
            <button key={i} type="button" onClick={() => prova(k === '⌫' ? v.slice(0, -1) : (v + k).slice(0, 4))} className="num h-12 rounded-xl bg-black/20 text-lg hover:bg-black/30">{k}</button>
          ) : <span key={i} />)}
        </div>
      </div>
    </div>
  )
}

/** QR fisso del tavolo, per ordinare dal proprio telefono invece che dal tablet. */
function QrTelefono({ tavolo, onChiudi }: { tavolo: number; onChiudi: () => void }) {
  const q = useQrTavolo(tavolo)
  return (
    <div className="fixed inset-0 z-[60] grid place-content-center bg-black/70 p-6" onClick={onChiudi}>
      <div className={cn('w-80 rounded-3xl p-6 text-center', PANNELLO)} onClick={(e) => e.stopPropagation()}>
        <Smartphone className={cn('mx-auto h-6 w-6', ORO)} />
        <h3 className="mt-2 font-display text-2xl italic">Ordina dal tuo telefono</h3>
        <p className="mt-1 text-sm text-[#F3EBDD]/70">Inquadra il codice con la fotocamera: si apre il menu del tavolo {tavolo}.</p>
        {q && <QrCodice url={urlTavoloQr(q.codice)} className="mx-auto mt-4 w-52 overflow-hidden rounded-xl bg-white p-2" />}
        <button type="button" onClick={onChiudi} className={cn('mt-5 rounded-full px-6 py-2 text-sm font-semibold', BTN_ORO)}>Chiudi</button>
      </div>
    </div>
  )
}
