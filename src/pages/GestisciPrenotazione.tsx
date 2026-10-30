/**
 * Modifica o annulla la prenotazione (rotta pubblica `/prenotazione?t=CODICE`, link nella mail di ricevuta e di conferma).
 * Il codice segreto (64 caratteri casuali) apre solo quella prenotazione: lettura e modifiche passano dalle funzioni del DB
 * `beachin.prenotazione_cliente` / `modifica_prenotazione_cliente` / `annulla_prenotazione_cliente`, che controllano anche
 * il limite di tempo del gestore e se la funzionalità «Modifica e annulla dal sito» è attiva.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, Clock, Loader2, Phone, Ticket, Users, UtensilsCrossed } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { CalendarioDisponibilita } from '@/components/sito/CalendarioDisponibilita'
import { descriviSistemazione, prenotabilita, statoGiorno } from '@/lib/disponibilita'
import { supabase, supabaseInvii } from '@/lib/supabase'
import { logoLido } from '@/assets/sito'
import { config } from '@/data/config'
import { cn } from '@/lib/cn'
import { urlInvito } from '@/lib/invitiEventi'
import type { StatoPrenotazioneOnline, Turno } from '@/data/types'

interface Prenotazione {
  tipo: 'tavolo' | 'evento'
  id: string
  nome: string
  data: string
  turno?: Turno
  ora?: string | null
  persone: number
  stato: StatoPrenotazioneOnline
  evento_nome?: string
  codice?: string | null
  attiva: boolean
  ore_limite: number
  scadenza: string
  modificabile: boolean
}

const dataIt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const scadenzaIt = (s: string) => new Date(s).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
const STATI: Record<StatoPrenotazioneOnline, [string, string]> = {
  da_confermare: ['In attesa di conferma', 'bg-tenda/25 text-[#7A5A12]'],
  confermata: ['Confermata', 'bg-acqua/30 text-profondo'],
  rifiutata: ['Non disponibile', 'bg-boa/15 text-boa'],
  annullata: ['Annullata', 'bg-boa/15 text-boa'],
}
const pc = 'h-11 w-full rounded-xl border border-calce-200 bg-calce/40 px-3 text-base text-profondo'

export default function GestisciPrenotazione() {
  const [q] = useSearchParams()
  const token = (q.get('t') ?? '').replace(/[^a-f0-9]/gi, '')
  const [p, setP] = useState<Prenotazione | null>()
  const [errore, setErrore] = useState<string>()
  const [fatto, setFatto] = useState<string>()
  const [modo, setModo] = useState<'vista' | 'modifica' | 'annulla'>('vista')
  const [lavoro, setLavoro] = useState(false)

  // lettura col client normale (senza keepalive: su iPhone una seconda richiesta keepalive subito dopo l'annullamento
  // non partiva); un tentativo in più e, se la prenotazione era già a schermo, resta quella invece dell'errore
  const carica = useCallback(async () => {
    if (!supabase || token.length < 32) { setP(null); return }
    let r = await supabase.rpc('prenotazione_cliente', { p_token: token })
    if (r.error) { await new Promise((ok) => setTimeout(ok, 800)); r = await supabase.rpc('prenotazione_cliente', { p_token: token }) }
    if (r.error) {
      setP((prima) => {
        if (!prima) setErrore('Non riusciamo a caricare la prenotazione: riprova tra poco.')
        return prima ?? null
      })
      return
    }
    setP((r.data as Prenotazione | null) ?? null)
  }, [token])
  useEffect(() => { void carica() }, [carica])

  const esegui = async (fn: 'modifica_prenotazione_cliente' | 'annulla_prenotazione_cliente', args: Record<string, unknown>, ok: string) => {
    if (!supabaseInvii) return
    setLavoro(true); setErrore(undefined)
    const { data, error } = await supabaseInvii.rpc(fn, { p_token: token, ...args })
    setLavoro(false)
    const r = data as { ok?: boolean; errore?: string } | null
    if (error || !r?.ok) { setErrore(r?.errore ?? 'Qualcosa non ha funzionato: riprova o chiamaci.'); return }
    setFatto(ok); setModo('vista')
    // già giusta a schermo anche se la rilettura non riesce
    if (fn === 'annulla_prenotazione_cliente') setP((x) => x && { ...x, stato: 'annullata', modificabile: false })
    await carica()
  }

  const tel = config.telefono
  const evento = p?.tipo === 'evento'

  return (
    <div className="min-h-screen bg-profondo px-4 py-8 text-white">
      <div className="mx-auto max-w-md">
        <img src={logoLido} alt={config.nome} className="mx-auto h-16 w-auto brightness-0 invert" />
        <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.3em] text-tenda">La tua prenotazione</p>

        {p === undefined ? (
          <div className="mt-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/70" /></div>
        ) : p === null ? (
          <p className="mt-6 rounded-2xl bg-white/10 p-4 text-center text-white/80">
            {errore ?? 'Link non valido o scaduto: apri il link dalla mail della prenotazione.'}
          </p>
        ) : (
          <div className="mt-4 rounded-3xl bg-white p-5 text-profondo shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-display text-2xl font-semibold leading-tight">
                {evento ? p.evento_nome : 'Tavolo al ristorante'}
              </h1>
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', STATI[p.stato][1])}>{STATI[p.stato][0]}</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-profondo/80">
              <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cabina" /><span className="capitalize">{dataIt(p.data)}</span></li>
              {!evento && <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-cabina" />{p.turno === 'pranzo' ? 'Pranzo' : 'Cena'}{p.ora ? ` alle ${p.ora}` : ''}</li>}
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-cabina" />{p.nome} · {p.persone} {p.persone === 1 ? 'persona' : 'persone'}</li>
            </ul>

            {fatto && <p className="mt-4 rounded-xl bg-acqua/25 px-3 py-2 text-sm font-medium">{fatto}</p>}
            {errore && <p className="mt-4 rounded-xl bg-boa/10 px-3 py-2 text-sm font-medium text-boa">{errore}</p>}

            {p.modificabile ? (
              <>
                {modo === 'vista' && (
                  <div className="mt-5 space-y-2">
                    <button type="button" onClick={() => { setModo('modifica'); setFatto(undefined); setErrore(undefined) }}
                      className="h-12 w-full rounded-xl bg-profondo font-semibold text-white">Modifica</button>
                    <button type="button" onClick={() => { setModo('annulla'); setFatto(undefined); setErrore(undefined) }}
                      className="h-12 w-full rounded-xl font-semibold text-boa ring-1 ring-boa/40">Annulla la prenotazione</button>
                    <p className="pt-1 text-center text-xs text-profondo/55">Puoi cambiare online fino a {scadenzaIt(p.scadenza)}.</p>
                  </div>
                )}
                {modo === 'annulla' && (
                  <div className="mt-5 rounded-2xl bg-boa/5 p-4">
                    <p className="font-semibold">Vuoi davvero annullare?</p>
                    <p className="mt-1 text-sm text-profondo/70">{evento ? 'Il tuo invito non sarà più valido.' : 'Il tavolo verrà liberato.'} Ti mandiamo una mail di conferma.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setModo('vista')} className="h-11 rounded-xl font-semibold ring-1 ring-calce-200">Indietro</button>
                      <button type="button" disabled={lavoro} onClick={() => void esegui('annulla_prenotazione_cliente', {}, 'Prenotazione annullata. Ti abbiamo mandato una mail di conferma.')}
                        className="h-11 rounded-xl bg-boa font-semibold text-white disabled:opacity-60">{lavoro ? 'Attendi…' : 'Sì, annulla'}</button>
                    </div>
                  </div>
                )}
                {modo === 'modifica' && (evento
                  ? <ModificaEvento persone={p.persone} lavoro={lavoro} onIndietro={() => setModo('vista')}
                      onSalva={(n) => void esegui('modifica_prenotazione_cliente', { p_data: null, p_turno: null, p_ora: null, p_persone: n }, 'Prenotazione aggiornata. Ti abbiamo mandato una mail.')} />
                  : <ModificaTavolo p={p} lavoro={lavoro} onIndietro={() => setModo('vista')}
                      onSalva={(d) => void esegui('modifica_prenotazione_cliente', { p_data: d.data, p_turno: d.turno, p_ora: d.ora, p_persone: d.persone }, 'Prenotazione aggiornata. Ti abbiamo mandato una mail.')} />)}
              </>
            ) : (p.stato === 'da_confermare' || p.stato === 'confermata') && (
              <p className="mt-5 rounded-xl bg-calce px-3 py-3 text-sm text-profondo/75">
                {p.attiva
                  ? <>Il tempo per modificare online è scaduto ({evento ? `fino a ${p.ore_limite} ore prima del giorno dell’evento` : `fino a ${p.ore_limite} ore prima`}).</>
                  : <>Per modificare o annullare contattaci.</>}
                {' '}Per cambiare chiamaci: <a href={`tel:${tel.replace(/\s/g, '')}`} className="font-semibold text-cabina">{tel}</a>
              </p>
            )}
            {evento && p.stato === 'confermata' && p.codice && (
              <a href={urlInvito(p.codice)} className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-cabina"><Ticket className="h-4 w-4" /> Apri il tuo invito</a>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-white/50">
          {config.nome} · {config.indirizzo} Savona<br />
          <a href={`tel:${tel.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 text-white/70"><Phone className="h-3.5 w-3.5" /> {tel}</a>
        </p>
      </div>
    </div>
  )
}

function ModificaEvento({ persone, lavoro, onIndietro, onSalva }: { persone: number; lavoro: boolean; onIndietro: () => void; onSalva: (n: number) => void }) {
  const [n, setN] = useState(String(persone))
  const valido = Number(n) >= 1 && Number(n) <= 20 && Number(n) !== persone
  return (
    <div className="mt-5 space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-profondo/60">Quante persone?</span>
        <input type="number" min={1} max={20} inputMode="numeric" className={pc} value={n} onChange={(e) => setN(e.target.value)} />
      </label>
      <Pulsanti valido={valido} lavoro={lavoro} onIndietro={onIndietro} onSalva={() => onSalva(Number(n))} />
    </div>
  )
}

function ModificaTavolo({ p, lavoro, onIndietro, onSalva }: {
  p: Prenotazione; lavoro: boolean; onIndietro: () => void
  onSalva: (d: { data: string; turno: Turno; ora: string; persone: number }) => void
}) {
  const { tavoliDelGiorno, prenotazioniRistorante, richiesteRistorante, giorniChiusi } = useDemoData()
  // la propria prenotazione non occupa posti: si può spostare anche nel suo stesso turno
  const altre = useMemo(() => prenotazioniRistorante.filter((x) => x.id !== `PR-${p.id}`), [prenotazioniRistorante, p.id])
  const inAttesa = useMemo(() => richiesteRistorante.filter((r) => r.stato === 'da_confermare' && r.id !== p.id), [richiesteRistorante, p.id])
  const disp = (d: string, t: Turno) => prenotabilita(tavoliDelGiorno(d), altre, inAttesa, d, t)
  const statoDi = (d: string) => {
    const st = statoGiorno(tavoliDelGiorno(d), altre, giorniChiusi, d)
    if (st.stato === 'chiuso') return st
    const pieno = { pranzo: st.pieno.pranzo || disp(d, 'pranzo').coperti.length === 0, cena: st.pieno.cena || disp(d, 'cena').coperti.length === 0 }
    return { ...st, pieno, stato: pieno.pranzo && pieno.cena ? 'pieno' as const : pieno.pranzo || pieno.cena ? 'parziale' as const : 'libero' as const }
  }
  const [f, setF] = useState({ data: p.data, turno: p.turno ?? 'cena' as Turno, ora: p.ora ?? '', coperti: String(p.persone) })
  const sel = statoDi(f.data)
  const turnoPieno = sel.pieno[f.turno]
  const pren = disp(f.data, f.turno)
  const n = Number(f.coperti) || 0
  const sist = pren.coperti.find((c) => c.n === n)?.sistemazione
  const oraOk = pren.orari.some((o) => o.ora === f.ora && o.postiLiberi >= n)
  const cambiato = f.data !== p.data || f.turno !== p.turno || f.ora !== (p.ora ?? '') || n !== p.persone
  const valido = sel.stato !== 'chiuso' && !turnoPieno && !!sist && oraOk && cambiato
  const scegliData = (d: string) => {
    const st = statoDi(d)
    setF((x) => ({ ...x, data: d, ora: '', turno: st.pieno[x.turno] ? (x.turno === 'cena' ? 'pranzo' : 'cena') : x.turno }))
  }

  return (
    <div className="mt-5 space-y-3">
      <div>
        <span className="mb-1 block text-xs font-medium text-profondo/60">Data</span>
        <CalendarioDisponibilita valore={f.data} minimo={config.oggi} onScegli={scegliData} stato={(d) => statoDi(d).stato} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Turno</span>
          <select className={pc} value={f.turno} onChange={(e) => setF((x) => ({ ...x, turno: e.target.value as Turno, ora: '' }))}>
            <option value="pranzo" disabled={sel.pieno.pranzo}>Pranzo{sel.pieno.pranzo ? ' — al completo' : ''}</option>
            <option value="cena" disabled={sel.pieno.cena}>Cena{sel.pieno.cena ? ' — al completo' : ''}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-profondo/60">Persone</span>
          <select className={pc} value={sist ? f.coperti : ''} onChange={(e) => setF((x) => ({ ...x, coperti: e.target.value }))} disabled={turnoPieno}>
            {!sist && <option value="">Scegli…</option>}
            {pren.coperti.map((c) => <option key={c.n} value={c.n}>{c.n} {c.n === 1 ? 'persona' : 'persone'}</option>)}
          </select>
        </label>
      </div>
      {!turnoPieno && sel.stato !== 'chiuso' && (
        <div>
          <span className="mb-1 block text-xs font-medium text-profondo/60">Orario di arrivo</span>
          <div className="flex flex-wrap gap-2">
            {pren.orari.map((o) => {
              const off = o.postiLiberi < Math.max(1, n)
              return (
                <button key={o.ora} type="button" disabled={off} onClick={() => setF((x) => ({ ...x, ora: o.ora }))}
                  className={cn('num h-10 rounded-full px-4 text-sm font-semibold ring-1',
                    f.ora === o.ora ? 'bg-cabina text-white ring-cabina' : off ? 'cursor-not-allowed bg-calce text-profondo/30 line-through ring-calce-200' : 'bg-white text-profondo ring-calce-200')}>
                  {o.ora}
                </button>
              )
            })}
          </div>
          {sist && <p className="mt-1.5 text-xs text-profondo/55">Per {n} {n === 1 ? 'persona' : 'persone'}: {descriviSistemazione(sist)}.</p>}
        </div>
      )}
      {(sel.stato === 'chiuso' || turnoPieno) && (
        <p className="rounded-xl bg-boa/10 px-3 py-2 text-sm font-medium text-boa">
          {sel.stato === 'chiuso' ? 'Il ristorante è chiuso questo giorno: scegli un’altra data.' : 'Questo turno è al completo: scegli un altro giorno o turno.'}
        </p>
      )}
      <Pulsanti valido={valido} lavoro={lavoro} onIndietro={onIndietro}
        onSalva={() => onSalva({ data: f.data, turno: f.turno, ora: f.ora, persone: n })} />
      <p className="flex items-center gap-1.5 text-xs text-profondo/50"><UtensilsCrossed className="h-3.5 w-3.5" /> Per gruppi più grandi chiamaci.</p>
    </div>
  )
}

function Pulsanti({ valido, lavoro, onIndietro, onSalva }: { valido: boolean; lavoro: boolean; onIndietro: () => void; onSalva: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={onIndietro} className="h-11 rounded-xl font-semibold ring-1 ring-calce-200">Indietro</button>
      <button type="button" disabled={!valido || lavoro} onClick={onSalva}
        className="h-11 rounded-xl bg-profondo font-semibold text-white disabled:opacity-40">{lavoro ? 'Attendi…' : 'Salva modifiche'}</button>
    </div>
  )
}
