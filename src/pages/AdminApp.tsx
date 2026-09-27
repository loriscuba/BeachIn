/**
 * App admin (rotta pubblica `/adminapp`, mobile): il gestore conferma/rifiuta le richieste
 * di tavolo arrivate dal sito e modifica il menu a voce. Con Supabase i dati sono condivisi dal vivo.
 */
import { useEffect, useRef, useState } from 'react'
import { LogOut, Check, X, Users, Phone, CalendarDays, Mic, Inbox, Bell, BellOff } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { UTENTI_ADMIN } from '@/lib/adminapp'
import { campanello, sbloccaAudio } from '@/lib/suoni'
import { supabaseAttivo } from '@/lib/supabase'
import AssistenteVocale from '@/pages/AssistenteVocale'
import { cn } from '@/lib/cn'

const CHIAVE = 'adminapp.sessione.v1'
const dataIt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

export default function AdminApp() {
  const [dentro, setDentro] = useState(() => { try { return localStorage.getItem(CHIAVE) === '1' } catch { return false } })
  const esci = () => { try { localStorage.removeItem(CHIAVE) } catch { /* */ } setDentro(false) }
  return (
    <div className="min-h-screen bg-calce text-profondo">
      <header className="sticky top-0 z-10 bg-profondo px-4 py-3 text-white shadow">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <p className="font-display text-xl font-semibold leading-none">BeachIn Admin</p>
            <p className="text-[11px] text-white/60">{config.nome} · {supabaseAttivo ? 'dati condivisi (Supabase)' : 'modalità demo locale'}</p>
          </div>
          {dentro && <button onClick={esci} className="grid h-8 w-8 place-content-center rounded-full hover:bg-white/10" aria-label="Esci"><LogOut className="h-4 w-4" /></button>}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4">
        {dentro ? <Area /> : <Login onEntra={() => { try { localStorage.setItem(CHIAVE, '1') } catch { /* */ } setDentro(true) }} />}
      </main>
    </div>
  )
}

function Login({ onEntra }: { onEntra: () => void }) {
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState(false)
  const campo = 'h-12 w-full rounded-xl border border-calce-200 bg-white px-4 text-base focus-visible:focus-ring'
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); sbloccaAudio(); if (UTENTI_ADMIN.some((u) => u.utente === utente.trim().toLowerCase() && u.password === password)) onEntra(); else setErrore(true) }}
      className="mx-auto mt-6 max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-sm"
    >
      <h1 className="text-center font-display text-2xl font-semibold">Area gestore</h1>
      <input value={utente} onChange={(e) => { setUtente(e.target.value); setErrore(false) }} placeholder="Utente" autoCapitalize="none" autoComplete="username" className={campo} />
      <input value={password} onChange={(e) => { setPassword(e.target.value); setErrore(false) }} type="password" placeholder="Password" autoComplete="current-password" className={campo} />
      {errore && <p className="text-sm text-boa">Utente o password non corretti.</p>}
      <button className="h-12 w-full rounded-xl bg-cabina text-base font-semibold text-white hover:bg-profondo">Entra</button>
      <p className="text-center text-xs text-profondo/45">Demo: {UTENTI_ADMIN[0].utente} / {UTENTI_ADMIN[0].password}</p>
    </form>
  )
}

function Area() {
  const { richiesteRistorante, confermaRistorante, rifiutaRistorante } = useDemoData()
  const [tab, setTab] = useState<'prenotazioni' | 'menu'>('prenotazioni')
  const [suoni, setSuoni] = useState(true)
  const daConfermare = richiesteRistorante.filter((r) => r.stato === 'da_confermare')
  const gestite = richiesteRistorante.filter((r) => r.stato !== 'da_confermare').slice(0, 10)

  // campanello quando arriva una nuova richiesta dal sito
  const viste = useRef(new Set(richiesteRistorante.map((r) => r.id)))
  useEffect(() => {
    const nuove = richiesteRistorante.filter((r) => !viste.current.has(r.id))
    nuove.forEach((r) => viste.current.add(r.id))
    if (suoni && nuove.some((r) => r.stato === 'da_confermare')) campanello()
  }, [richiesteRistorante, suoni])

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <div className="grid flex-1 grid-cols-2 rounded-xl bg-white p-1 text-sm font-semibold shadow-sm">
          <button onClick={() => setTab('prenotazioni')} className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg py-2', tab === 'prenotazioni' ? 'bg-profondo text-white' : 'text-profondo/60')}>
            <Inbox className="h-4 w-4" /> Prenotazioni {daConfermare.length > 0 && <span className="rounded-full bg-boa px-1.5 text-xs text-white">{daConfermare.length}</span>}
          </button>
          <button onClick={() => setTab('menu')} className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg py-2', tab === 'menu' ? 'bg-profondo text-white' : 'text-profondo/60')}><Mic className="h-4 w-4" /> Menu a voce</button>
        </div>
        <button onClick={() => { sbloccaAudio(); setSuoni(!suoni) }} className="grid w-11 place-content-center rounded-xl bg-white text-profondo/60 shadow-sm" aria-label={suoni ? 'Disattiva suoni' : 'Attiva suoni'}>
          {suoni ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>
      </div>

      {tab === 'prenotazioni' && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-profondo/50">Da confermare</h2>
          {daConfermare.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-profondo/50 shadow-sm">Nessuna richiesta in attesa.</p>}
          {daConfermare.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-lg font-semibold">{r.nome}</p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-profondo/70">
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {dataIt(r.data)} · <span className="capitalize">{r.turno}</span></span>
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {r.coperti} coperti</span>
                {r.telefono && <a href={`tel:${r.telefono}`} className="inline-flex items-center gap-1 text-cabina"><Phone className="h-4 w-4" /> {r.telefono}</a>}
              </p>
              {r.note && <p className="mt-1 text-sm italic text-profondo/55">«{r.note}»</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => rifiutaRistorante(r.id)} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-boa/40 font-semibold text-boa"><X className="h-4 w-4" /> Rifiuta</button>
                <button onClick={() => confermaRistorante(r.id)} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-acqua font-semibold text-white"><Check className="h-4 w-4" /> Conferma</button>
              </div>
            </div>
          ))}
          {gestite.length > 0 && (
            <>
              <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-profondo/50">Gestite di recente</h2>
              <ul className="divide-y divide-calce-200 rounded-2xl bg-white px-4 shadow-sm">
                {gestite.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <span><b>{r.nome}</b> · {dataIt(r.data)} {r.turno} · {r.coperti}p</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', r.stato === 'confermata' ? 'bg-acqua/20 text-profondo' : 'bg-boa/15 text-boa')}>{r.stato === 'confermata' ? 'Confermata' : 'Rifiutata'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === 'menu' && <AssistenteVocale />}
    </div>
  )
}
