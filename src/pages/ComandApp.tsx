/**
 * ComandApp — app del bagnante (rotta pubblica `/comandapp`, fuori dal gestionale).
 * Login con credenziali demo legate all'ombrellone → ordina dal bar → segue lo stato.
 * Le comande finiscono nel cruscotto del bar (pagina Comande) con il campanello.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Umbrella, LogOut, Plus, Minus, Send, Check, Loader2, ChefHat, Bell, ClipboardList, ShoppingBag } from 'lucide-react'
import type { ArticoloBar, CategoriaBar, StatoComanda } from '@/data/types'
import { getArticoliBar } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { euroCent } from '@/lib/formatters'
import { etichetteCategoriaBar } from '@/lib/etichette'
import { PASSI_COMANDA, UTENTI_COMANDAPP, etichettaStatoComanda } from '@/lib/comandapp'
import { ding, sbloccaAudio } from '@/lib/suoni'
import { cn } from '@/lib/cn'

type Utente = (typeof UTENTI_COMANDAPP)[number]
const CHIAVE = 'comandapp.sessione.v1'
const icona: Record<StatoComanda, typeof Send> = { in_attesa: Send, presa_in_carico: ClipboardList, in_preparazione: ChefHat, pronta: Bell }

function leggiSessione(): Utente | undefined {
  try { const u = localStorage.getItem(CHIAVE); return UTENTI_COMANDAPP.find((x) => x.utente === u) } catch { return undefined }
}

export default function ComandApp() {
  const [utente, setUtente] = useState<Utente | undefined>(leggiSessione)
  const esci = () => { try { localStorage.removeItem(CHIAVE) } catch { /* */ } setUtente(undefined) }
  return (
    <div className="min-h-screen bg-calce text-profondo">
      <header className="sticky top-0 z-10 bg-profondo px-4 py-3 text-white shadow">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <p className="font-display text-xl font-semibold leading-none">ComandApp</p>
            <p className="text-[11px] text-white/60">{config.nome}</p>
          </div>
          {utente && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-tenda px-3 py-1 text-sm font-bold text-profondo"><Umbrella className="h-4 w-4" /> {utente.ombrellone}</span>
              <button onClick={esci} className="grid h-8 w-8 place-content-center rounded-full hover:bg-white/10" aria-label="Esci"><LogOut className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">
        {utente ? <Area utente={utente} /> : <Login onEntra={(u) => { try { localStorage.setItem(CHIAVE, u.utente) } catch { /* */ } setUtente(u) }} />}
      </main>
    </div>
  )
}

function Login({ onEntra }: { onEntra: (u: Utente) => void }) {
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState(false)
  const entra = (e: React.FormEvent) => {
    e.preventDefault()
    sbloccaAudio()
    const u = UTENTI_COMANDAPP.find((x) => x.utente === utente.trim().toLowerCase() && x.password === password)
    if (u) onEntra(u); else setErrore(true)
  }
  const campo = 'h-12 w-full rounded-xl border border-calce-200 bg-white px-4 text-base focus-visible:focus-ring'
  return (
    <form onSubmit={entra} className="mt-6 space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 text-center">
        <Umbrella className="mx-auto h-10 w-10 text-cabina" />
        <h1 className="mt-2 font-display text-2xl font-semibold">Ordina dal tuo ombrellone</h1>
        <p className="text-sm text-profondo/60">Accedi con le credenziali ricevute alla cassa.</p>
      </div>
      <input value={utente} onChange={(e) => { setUtente(e.target.value); setErrore(false) }} placeholder="Utente" autoCapitalize="none" autoComplete="username" className={campo} />
      <input value={password} onChange={(e) => { setPassword(e.target.value); setErrore(false) }} type="password" placeholder="Password" autoComplete="current-password" className={campo} />
      {errore && <p className="text-sm text-boa">Utente o password non corretti.</p>}
      <button className="h-12 w-full rounded-xl bg-cabina text-base font-semibold text-white hover:bg-profondo">Entra</button>
      <p className="pt-1 text-center text-xs text-profondo/45">Demo: {UTENTI_COMANDAPP[0].utente} / {UTENTI_COMANDAPP[0].password}</p>
    </form>
  )
}

function Area({ utente }: { utente: Utente }) {
  const { comande, inviaComanda } = useDemoData()
  const [tab, setTab] = useState<'ordina' | 'ordini'>('ordina')
  const [articoli, setArticoli] = useState<ArticoloBar[]>()
  const [cat, setCat] = useState<CategoriaBar>('gastronomia')
  const [qta, setQta] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  useEffect(() => { getArticoliBar().then((a) => { setArticoli(a); if (!a.some((x) => x.categoria === cat)) setCat(a[0]?.categoria) }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mie = comande.filter((c) => c.ombrellone === utente.ombrellone && c.origine === 'app')
  // "ding" quando una mia comanda diventa pronta
  const pronte = useRef(new Set(mie.filter((c) => c.stato === 'pronta').map((c) => c.id)))
  useEffect(() => {
    const nuove = mie.filter((c) => c.stato === 'pronta' && !pronte.current.has(c.id))
    nuove.forEach((c) => pronte.current.add(c.id))
    if (nuove.length) ding()
  }, [mie])

  const categorie = useMemo(() => [...new Set((articoli ?? []).map((a) => a.categoria))], [articoli])
  const righe = (articoli ?? []).filter((a) => qta[a.id]).map((a) => ({ articoloId: a.id, nome: a.nome, quantita: qta[a.id], prezzoUnitario: a.prezzoVendita }))
  const totale = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)
  const pezzi = righe.reduce((s, r) => s + r.quantita, 0)
  const cambia = (id: string, d: number) => setQta((q) => { const v = Math.max(0, (q[id] ?? 0) + d); const n = { ...q }; if (v) n[id] = v; else delete n[id]; return n })
  const invia = () => {
    if (!righe.length) return
    inviaComanda(utente.ombrellone, righe, note, { origine: 'app', cliente: utente.nome })
    ding(); setQta({}); setNote(''); setTab('ordini')
  }

  return (
    <div className="pb-28">
      <p className="mb-3 text-sm text-profondo/60">Ciao <b className="text-profondo">{utente.nome}</b>, ti portiamo tutto all'ombrellone {utente.ombrellone}.</p>
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-white p-1 text-sm font-semibold shadow-sm">
        <button onClick={() => setTab('ordina')} className={cn('rounded-lg py-2', tab === 'ordina' ? 'bg-profondo text-white' : 'text-profondo/60')}>Ordina</button>
        <button onClick={() => setTab('ordini')} className={cn('rounded-lg py-2', tab === 'ordini' ? 'bg-profondo text-white' : 'text-profondo/60')}>I miei ordini {mie.some((c) => c.stato !== 'pronta') && '•'}</button>
      </div>

      {tab === 'ordina' && (!articoli ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-profondo/40" /> : (
        <>
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {categorie.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={cn('shrink-0 rounded-full px-4 py-1.5 text-sm font-medium', cat === c ? 'bg-cabina text-white' : 'bg-white text-profondo/70 shadow-sm')}>{etichetteCategoriaBar[c]}</button>
            ))}
          </div>
          <ul className="space-y-2">
            {articoli.filter((a) => a.categoria === cat).map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.nome}</p>
                  <p className="num text-sm text-profondo/55">{euroCent(a.prezzoVendita)}</p>
                </div>
                {qta[a.id] ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => cambia(a.id, -1)} className="grid h-9 w-9 place-content-center rounded-full bg-calce" aria-label="Meno"><Minus className="h-4 w-4" /></button>
                    <span className="num w-5 text-center font-bold">{qta[a.id]}</span>
                    <button onClick={() => cambia(a.id, 1)} className="grid h-9 w-9 place-content-center rounded-full bg-cabina text-white" aria-label="Più"><Plus className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => cambia(a.id, 1)} className="grid h-9 w-9 place-content-center rounded-full bg-cabina text-white" aria-label="Aggiungi"><Plus className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
          {pezzi > 0 && (
            <div className="fixed inset-x-0 bottom-0 border-t border-calce-200 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <div className="mx-auto max-w-md space-y-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (es. senza ghiaccio)" className="h-10 w-full rounded-lg border border-calce-200 px-3 text-sm" />
                <button onClick={invia} className="flex h-12 w-full items-center justify-between rounded-xl bg-boa px-4 font-semibold text-white">
                  <span className="inline-flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Ordina {pezzi} {pezzi === 1 ? 'articolo' : 'articoli'}</span>
                  <span className="num">{euroCent(totale)}</span>
                </button>
              </div>
            </div>
          )}
        </>
      ))}

      {tab === 'ordini' && (
        <div className="space-y-3">
          {mie.length === 0 && <p className="py-10 text-center text-sm text-profondo/50">Nessun ordine ancora.</p>}
          {mie.map((c) => {
            const passo = PASSI_COMANDA.indexOf(c.stato)
            return (
              <div key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-profondo/55">Ordine delle {c.ora}</span>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-bold', c.stato === 'pronta' ? 'bg-acqua text-white' : 'bg-tenda/30 text-profondo')}>{etichettaStatoComanda[c.stato]}</span>
                </div>
                <div className="mb-3 flex items-center">
                  {PASSI_COMANDA.map((s, i) => {
                    const Icona = icona[s]
                    return (
                      <div key={s} className="flex flex-1 items-center last:flex-none">
                        <span className={cn('grid h-8 w-8 place-content-center rounded-full', i <= passo ? 'bg-cabina text-white' : 'bg-calce text-profondo/35', i === passo && c.stato !== 'pronta' && 'animate-pulse')} title={etichettaStatoComanda[s]}>
                          {i < passo || c.stato === 'pronta' ? <Check className="h-4 w-4" /> : <Icona className="h-4 w-4" />}
                        </span>
                        {i < PASSI_COMANDA.length - 1 && <span className={cn('h-0.5 flex-1', i < passo ? 'bg-cabina' : 'bg-calce')} />}
                      </div>
                    )
                  })}
                </div>
                {c.stato === 'pronta' && <p className="mb-2 text-sm font-semibold text-acqua">Il tuo ordine è pronto: arriva all'ombrellone {c.ombrellone}!</p>}
                <ul className="space-y-0.5 text-sm text-profondo/75">
                  {c.righe.map((r) => <li key={r.articoloId} className="flex justify-between"><span>{r.quantita}× {r.nome}</span><span className="num">{euroCent(r.quantita * r.prezzoUnitario)}</span></li>)}
                </ul>
                <p className="num mt-2 border-t border-calce-200 pt-2 text-right font-bold">{euroCent(c.totale)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
