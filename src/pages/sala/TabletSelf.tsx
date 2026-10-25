/**
 * Tablet self al tavolo: menu a tutto schermo con la grafica comune del Lido dei Pini (`components/menu/MenuLido`),
 * foto, descrizioni e prezzi per sezione. Il cliente compone l'ordine e lo manda in cucina.
 * Un solo menu per tablet (scelto all'avvio): Ristorante (va in cucina), Bar (listino bar, va al bar, modulo Bar al tavolo)
 * o Lavagnetta (proposte del giorno, ogni voce va al suo reparto).
 * Bloccato: si esce solo col PIN scelto dal personale.
 */
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, ShoppingBag, X, Send, Check, ChefHat, Smartphone } from 'lucide-react'
import { QrCodice } from '@/components/QrCodice'
import type { Piatto, RigaComandaSala } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { config } from '@/data/config'
import { euroCent } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { urlTavoloQr, delConto, articoliComePiatti, etichettaStatoSala, uscitaPredefinita } from '@/lib/sala'
import { logoLido } from '@/assets/sito'
import { PaginaMenu, CopertinaMenu, ChipSezioni, TitoloSezione, SchedaVoce, Stepper, TendaRighe, PiedeMenu, GRIGLIA_VOCI } from '@/components/menu/MenuLido'
import { salvaSelf, type StatoSelf } from './AvvioSelf'
import { useQrTavolo } from './QrTavoli'

// Grafica comune dei menu del lido (sabbia, inchiostro del logo, colore del menu in var(--acc))
const PANNELLO = 'bg-[#FBF7F0] text-[#3B2A20]'
const BTN = 'bg-[var(--acc)] text-white hover:brightness-110'

const ALLERGENI: Record<string, string> = {
  glutine: 'glutine', crostacei: 'crostacei', uova: 'uova', pesce: 'pesce', arachidi: 'arachidi', soia: 'soia',
  latte: 'latte', frutta_guscio: 'frutta a guscio', sedano: 'sedano', molluschi: 'molluschi',
}

/** `qr`: aperto dal telefono del cliente col QR del tavolo (niente lucchetto né PIN; la comanda è «qr»).
 *  `seduta`: il conto su cui la pagina ordina; chiuso quello, l'invio viene rifiutato. */
export default function TabletSelf({ stato, onEsci, qr = false, seduta }: { stato: StatoSelf; onEsci: () => void; qr?: boolean; seduta?: string }) {
  const { menu, sezioniMenu, articoliBar, sezioniBar, lavagnetta, comandeSala, inviaComandaSala, verificaContoTavolo, tavoliQr } = useDemoData()
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
  const invia = async () => {
    if (!righe.length) return
    // dal QR: prima di inviare si chiede al DB se il conto è ancora aperto (il telefono può avere dati vecchi);
    // se è chiuso la pagina passa a «Conto chiuso»
    if (qr && seduta && !(await verificaContoTavolo(stato.tavolo, seduta))) return
    if (!inviaComandaSala(stato.tavolo, righe, { origine: qr ? 'qr' : 'self', note, seduta: seduta || undefined })) return
    setQta({}); setNote(''); setCarrello(false); setGrazie(true)
  }

  const voce = (p: Piatto) => ({ ...p, dettaglio: p.allergeni.length ? p.allergeni.map((a) => ALLERGENI[a] ?? a).join(' · ') : undefined })
  const [attiva, setAttiva] = useState<string>()

  // in un portale su <body>: fuori dallo shell (animazioni e tema scuro della pagina non lo toccano)
  return createPortal(
    <PaginaMenu tema={tipo} className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Barra: logo, sezioni, tavolo */}
      <header className="sticky top-0 z-20 border-b border-[#3B2A20]/10 bg-[#F6EFE3]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-8">
          <img src={logoLido} alt={config.nome} className="h-10 w-auto" />
          <ChipSezioni sezioni={sezioni} attiva={attiva} onScegli={(id) => { setAttiva(id); vai(id) }} className="ml-3 hidden md:flex" />
          <span className="ml-auto shrink-0 rounded-full bg-[var(--acc)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">Tavolo {stato.tavolo}</span>
          {!qr && <button type="button" onClick={() => setTelefono(true)} className="grid h-9 w-9 place-content-center rounded-full text-[color:var(--acc)] hover:bg-black/5" aria-label="Ordina dal tuo telefono" title="Ordina dal tuo telefono"><Smartphone className="h-4 w-4" /></button>}
          {!qr && <button type="button" onClick={() => setSblocco(true)} className="grid h-9 w-9 place-content-center rounded-full text-[#3B2A20]/35 hover:text-[#3B2A20]" aria-label="Sblocca tablet"><Lock className="h-4 w-4" /></button>}
        </div>
        <ChipSezioni sezioni={sezioni} attiva={attiva} onScegli={(id) => { setAttiva(id); vai(id) }} className="px-3 pb-2 md:hidden" />
      </header>

      <CopertinaMenu tema={tipo}>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/85">Scegli con calma e invia l’ordine: arriva direttamente a chi lo prepara. Allergie o richieste? Scrivile nelle note.</p>
      </CopertinaMenu>

      {/* Sezioni del menu */}
      <main className="mx-auto max-w-6xl space-y-12 px-4 pb-40 pt-16 sm:px-8">
        {sezioni.length === 0 && <p className="py-10 text-center text-[#3B2A20]/60">Il menu è in preparazione.</p>}
        {sezioni.map((s, i) => (
          <section key={s.id} id={`self-${s.id}`} className="scroll-mt-32">
            <TitoloSezione n={i + 1} nome={s.nome} />
            <div className={GRIGLIA_VOCI}>
              {s.piatti.map((p) => <SchedaVoce key={p.id} v={voce(p)} n={qta[p.id] ?? 0} onCambia={(d) => cambia(p.id, d)} />)}
            </div>
          </section>
        ))}
      </main>
      <PiedeMenu><p className="mt-3 text-xs text-[#3B2A20]/55">Per allergie e intolleranze chiedi al personale di sala.</p></PiedeMenu>

      {/* Barra ordine */}
      {(pezzi > 0 || ordini.length > 0) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-4">
          <button type="button" onClick={() => setCarrello(true)} className={cn('pointer-events-auto flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold shadow-2xl', BTN)}>
            <ShoppingBag className="h-5 w-5" />
            {pezzi > 0 ? <>Il tuo ordine · {pezzi} {pezzi === 1 ? 'voce' : 'voci'} · <span className="num">{euroCent(totale)}</span></> : <>I tuoi ordini · {ordini.length}</>}
          </button>
        </div>
      )}

      {/* Pannello ordine */}
      {carrello && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={() => setCarrello(false)}>
          <aside className={cn('flex h-full w-full max-w-md flex-col shadow-2xl', PANNELLO)} onClick={(e) => e.stopPropagation()}>
            <TendaRighe />
            <div className="flex items-center px-6 py-4">
              <h3 className="font-display text-2xl italic">Il tuo ordine</h3>
              <button type="button" onClick={() => setCarrello(false)} className="ml-auto grid h-9 w-9 place-content-center rounded-full hover:bg-black/5" aria-label="Chiudi"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-5">
              {righe.length === 0 && <p className="text-sm text-[#3B2A20]/55">Non hai ancora scelto nulla.</p>}
              {righe.map((r) => (
                <div key={r.piattoId} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{r.nome}</p>
                    <p className="num text-xs text-[#3B2A20]/55">{euroCent(r.prezzoUnitario)}</p>
                  </div>
                  <Stepper n={r.quantita} onCambia={(d) => cambia(r.piattoId, d)} />
                </div>
              ))}
              {righe.length > 0 && (
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={tipo === 'bar' ? 'Note per il bar (senza ghiaccio, poco zucchero…)' : 'Note per la cucina (allergie, cotture, senza…)'}
                  className="w-full rounded-xl border border-[#3B2A20]/15 bg-white px-3 py-2 text-sm placeholder:text-[#3B2A20]/35 focus:border-[color:var(--acc)] focus:outline-none" />
              )}
              {ordini.length > 0 && (
                <div className="space-y-2 border-t border-[#3B2A20]/10 pt-4">
                  <p className="font-gesso text-xl text-[color:var(--acc)]">Già ordinato</p>
                  {ordini.map((c) => (
                    <div key={c.id} className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
                      <div className="flex items-center gap-2 text-xs text-[#3B2A20]/60">
                        <span className="num">{c.ora}</span>
                        <span className={cn('ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold', c.stato === 'pronta' ? 'bg-[#DDEBE2] text-[#2F6B4F]' : 'bg-[var(--acc-chiaro)] text-[color:var(--acc)]')}>
                          <ChefHat className="h-3 w-3" /> {etichettaStatoSala[c.stato]}
                        </span>
                      </div>
                      <p className="mt-1 text-[#3B2A20]/85">{c.righe.map((x) => `${x.quantita}× ${x.nome}`).join(' · ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {righe.length > 0 && (
              <div className="border-t border-[#3B2A20]/10 px-6 py-4">
                <div className="mb-3 flex items-baseline justify-between"><span className="text-sm text-[#3B2A20]/65">Totale</span><span className="num font-display text-2xl">{euroCent(totale)}</span></div>
                <button type="button" onClick={invia} className={cn('flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.15em]', BTN)}>
                  <Send className="h-4 w-4" /> {tipo === 'bar' ? 'Invia al bar' : 'Invia in cucina'}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Conferma */}
      {grazie && (
        <div className="fixed inset-0 z-50 grid place-content-center bg-black/50 p-6" onClick={() => setGrazie(false)}>
          <div className={cn('max-w-sm overflow-hidden rounded-3xl text-center shadow-2xl', PANNELLO)}>
            <TendaRighe />
            <div className="p-8 pt-6">
              <span className="mx-auto grid h-16 w-16 place-content-center rounded-full bg-[var(--acc-chiaro)]"><Check className="h-8 w-8 text-[color:var(--acc)]" /></span>
              <h3 className="mt-4 font-display text-3xl italic">Grazie!</h3>
              <p className="mt-2 text-[#3B2A20]/70">Il tuo ordine è arrivato {tipo === 'bar' ? 'al bar' : 'in cucina'}. Puoi seguirne lo stato da «I tuoi ordini».</p>
              <button type="button" className={cn('mt-6 rounded-full px-6 py-2.5 text-sm font-semibold', BTN)}>Torna al menu</button>
            </div>
          </div>
        </div>
      )}

      {telefono && <QrTelefono tavolo={stato.tavolo} onChiudi={() => setTelefono(false)} />}
      {sblocco && <Sblocco pin={stato.pin} onChiudi={() => setSblocco(false)} onOk={() => { salvaSelf(null); if (document.fullscreenElement) void document.exitFullscreen?.(); onEsci() }} />}
    </PaginaMenu>,
    document.body
  )
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
        <Lock className={cn('mx-auto h-6 w-6', 'text-[color:var(--acc)]')} />
        <p className="mt-2 text-sm text-[#3B2A20]/70">Riservato al personale</p>
        <div className="my-4 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-3 w-3 rounded-full', i < v.length ? 'bg-[var(--acc)]' : 'bg-[#3B2A20]/15')} />)}
        </div>
        {errore && <p className="mb-2 text-xs text-[#E4572E]">PIN errato</p>}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => k ? (
            <button key={i} type="button" onClick={() => prova(k === '⌫' ? v.slice(0, -1) : (v + k).slice(0, 4))} className="num h-12 rounded-xl bg-[#3B2A20]/5 text-lg hover:bg-[#3B2A20]/10">{k}</button>
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
        <Smartphone className={cn('mx-auto h-6 w-6', 'text-[color:var(--acc)]')} />
        <h3 className="mt-2 font-display text-2xl italic">Ordina dal tuo telefono</h3>
        <p className="mt-1 text-sm text-[#3B2A20]/70">Inquadra il codice con la fotocamera: si apre il menu del tavolo {tavolo}.</p>
        {q && <QrCodice url={urlTavoloQr(q.codice)} className="mx-auto mt-4 w-52 overflow-hidden rounded-xl bg-white p-2" />}
        <button type="button" onClick={onChiudi} className={cn('mt-5 rounded-full px-6 py-2 text-sm font-semibold', BTN)}>Chiudi</button>
      </div>
    </div>
  )
}
