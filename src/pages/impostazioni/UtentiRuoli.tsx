import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users2, ShieldCheck, Plus, KeyRound, Pencil, Power, Trash2, Save, Wand2 } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useSessione } from '@/context/SessioneContext'
import { supabase, supabaseAttivo } from '@/lib/supabase'
import { SEZIONI, LIVELLI, type Livello, type Permessi, type Ruolo, type Utente } from '@/lib/permessi'
import {
  leggiUtentiRuoli, creaUtente, aggiornaUtente, cambiaPassword, eliminaUtente, salvaRuolo, eliminaRuolo, idDaNome,
} from '@/lib/utenti'
import { cn } from '@/lib/cn'

const campo = 'h-10 w-full rounded-xl border border-calce-200 bg-white px-3 text-sm focus-visible:focus-ring'
const quando = (d: string | null) =>
  d ? new Date(d).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'mai'

/** Password provvisoria leggibile (da comunicare all'utente). */
function generaPassword() {
  const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const r = crypto.getRandomValues(new Uint32Array(12))
  return Array.from(r, (n) => c[n % c.length]).join('')
}

const tonoLivello: Record<Livello, 'spento' | 'acqua' | 'stagionale'> = { 0: 'spento', 1: 'acqua', 2: 'stagionale' }

export default function UtentiRuoli() {
  const { profilo, livello } = useSessione()
  const modifica = livello('utenti') === 2
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [ruoli, setRuoli] = useState<Ruolo[]>([])
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'errore'; msg: string } | null>(null)

  const ricarica = useCallback(async () => {
    const d = await leggiUtentiRuoli()
    setUtenti(d.utenti)
    setRuoli(d.ruoli)
  }, [])

  useEffect(() => {
    void ricarica()
    if (!supabase) return
    const db = supabase
    const canale = db.channel('utenti-ruoli')
      .on('postgres_changes', { event: '*', schema: 'beachin', table: 'utenti' }, () => { void ricarica() })
      .on('postgres_changes', { event: '*', schema: 'beachin', table: 'ruoli' }, () => { void ricarica() })
      .subscribe()
    return () => { void db.removeChannel(canale) }
  }, [ricarica])

  /** Esegue un'operazione, mostra l'esito e ricarica. */
  const esegui = async (op: Promise<string | null>, ok: string) => {
    const err = await op
    setEsito(err ? { tipo: 'errore', msg: err } : { tipo: 'ok', msg: ok })
    if (!err) await ricarica()
    return !err
  }

  if (!supabaseAttivo) {
    return (
      <Card>
        <CardHeader titolo={<span className="inline-flex items-center gap-2"><Users2 className="h-4 w-4 text-cabina" /> Utenti e ruoli</span>} />
        <CardBody className="pt-1 text-sm text-profondo/70">
          In modalità demo locale (senza database) c'è un solo accesso amministratore. Utenti, ruoli e permessi
          si gestiscono quando l'app è collegata a Supabase.
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {esito && (
        <p className={cn('rounded-xl px-3 py-2 text-sm', esito.tipo === 'errore' ? 'bg-boa/10 text-boa' : 'bg-emerald-50 text-emerald-800')}>
          {esito.msg}
        </p>
      )}
      <ElencoUtenti utenti={utenti} ruoli={ruoli} io={profilo?.id} modifica={modifica} esegui={esegui} />
      <MatricePermessi ruoli={ruoli} utenti={utenti} modifica={modifica} esegui={esegui} />
    </div>
  )
}

type Esegui = (op: Promise<string | null>, ok: string) => Promise<boolean>

function ElencoUtenti({ utenti, ruoli, io, modifica, esegui }: { utenti: Utente[]; ruoli: Ruolo[]; io?: string; modifica: boolean; esegui: Esegui }) {
  const [nuovo, setNuovo] = useState(false)
  const [inModifica, setInModifica] = useState<Utente>()
  const [perPassword, setPerPassword] = useState<Utente>()
  const nomeRuolo = (id: string) => ruoli.find((r) => r.id === id)?.nome ?? id

  return (
    <Card>
      <CardHeader
        titolo={<span className="inline-flex items-center gap-2"><Users2 className="h-4 w-4 text-cabina" /> Utenti</span>}
        sottotitolo="Chi può entrare nel gestionale e nell'app admin. Un utente disattivato perde l'accesso subito."
        azione={modifica && <Button dimensione="sm" variante="primario" onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo utente</Button>}
      />
      <CardBody className="pt-1">
        {utenti.length === 0 && <p className="py-3 text-sm text-profondo/60">Nessun utente.</p>}
        {utenti.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 border-b border-calce-200 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', u.attivo ? 'text-profondo' : 'text-profondo/45 line-through')}>
                {u.nome} {u.id === io && <span className="text-xs font-normal text-profondo/50">(tu)</span>}
              </p>
              <p className="truncate text-xs text-profondo/55">{u.email} · ultimo accesso {quando(u.ultimo_accesso)}</p>
            </div>
            <Badge tono="mare">{nomeRuolo(u.ruolo_id)}</Badge>
            <Badge tono={u.attivo ? 'verde' : 'rosso'} puntino>{u.attivo ? 'Attivo' : 'Disattivato'}</Badge>
            {modifica && (
              <div className="flex gap-1">
                <Button dimensione="sm" variante="fantasma" title="Modifica" onClick={() => setInModifica(u)}><Pencil className="h-4 w-4" /></Button>
                <Button dimensione="sm" variante="fantasma" title="Nuova password" onClick={() => setPerPassword(u)}><KeyRound className="h-4 w-4" /></Button>
                {u.id !== io && (
                  <Button
                    dimensione="sm" variante="fantasma" title={u.attivo ? 'Disattiva' : 'Riattiva'}
                    onClick={() => void esegui(aggiornaUtente(u.id, { attivo: !u.attivo }), u.attivo ? `${u.nome} disattivato` : `${u.nome} riattivato`)}
                  >
                    <Power className={cn('h-4 w-4', u.attivo ? 'text-boa' : 'text-emerald-700')} />
                  </Button>
                )}
                {!u.attivo && (
                  <Button
                    dimensione="sm" variante="fantasma" title="Elimina definitivamente"
                    onClick={() => { if (confirm(`Eliminare definitivamente ${u.nome}?`)) void esegui(eliminaUtente(u.id), `${u.nome} eliminato`) }}
                  >
                    <Trash2 className="h-4 w-4 text-boa" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </CardBody>

      {nuovo && <ModaleNuovoUtente ruoli={ruoli} onChiudi={() => setNuovo(false)} esegui={esegui} />}
      {inModifica && <ModaleModificaUtente utente={inModifica} ruoli={ruoli} onChiudi={() => setInModifica(undefined)} esegui={esegui} />}
      {perPassword && <ModalePassword utente={perPassword} onChiudi={() => setPerPassword(undefined)} esegui={esegui} />}
    </Card>
  )
}

function SceltaRuolo({ ruoli, valore, onChange }: { ruoli: Ruolo[]; valore: string; onChange: (v: string) => void }) {
  return (
    <select value={valore} onChange={(e) => onChange(e.target.value)} className={campo}>
      {ruoli.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
    </select>
  )
}

function CampoPassword({ valore, onChange }: { valore: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <input value={valore} onChange={(e) => onChange(e.target.value)} placeholder="Almeno 8 caratteri" className={cn(campo, 'font-mono')} autoComplete="new-password" />
      <Button type="button" dimensione="sm" onClick={() => onChange(generaPassword())} title="Genera"><Wand2 className="h-4 w-4" /></Button>
    </div>
  )
}

function ModaleNuovoUtente({ ruoli, onChiudi, esegui }: { ruoli: Ruolo[]; onChiudi: () => void; esegui: Esegui }) {
  const [f, setF] = useState({ nome: '', email: '', ruolo_id: ruoli.find((r) => !r.amministratore)?.id ?? ruoli[0]?.id ?? '', password: generaPassword() })
  const [attesa, setAttesa] = useState(false)
  const valido = f.nome.trim() && f.email.includes('@') && f.ruolo_id && f.password.length >= 8
  const salva = async () => {
    setAttesa(true)
    const ok = await esegui(creaUtente(f), `Utente ${f.nome} creato. Comunicagli email e password: ${f.password}`)
    setAttesa(false)
    if (ok) onChiudi()
  }
  return (
    <Modal aperto onChiudi={onChiudi} titolo="Nuovo utente"
      piede={<Button variante="primario" disabled={!valido || attesa} onClick={() => void salva()}>{attesa ? 'Creo…' : 'Crea utente'}</Button>}>
      <div className="space-y-3">
        <label className="block"><span className="text-xs text-profondo/60">Nome e cognome</span>
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className={campo} /></label>
        <label className="block"><span className="text-xs text-profondo/60">Email (è il nome utente)</span>
          <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={campo} autoCapitalize="none" /></label>
        <label className="block"><span className="text-xs text-profondo/60">Ruolo</span>
          <SceltaRuolo ruoli={ruoli} valore={f.ruolo_id} onChange={(v) => setF({ ...f, ruolo_id: v })} /></label>
        <label className="block"><span className="text-xs text-profondo/60">Password provvisoria</span>
          <CampoPassword valore={f.password} onChange={(v) => setF({ ...f, password: v })} /></label>
      </div>
    </Modal>
  )
}

function ModaleModificaUtente({ utente, ruoli, onChiudi, esegui }: { utente: Utente; ruoli: Ruolo[]; onChiudi: () => void; esegui: Esegui }) {
  const [nome, setNome] = useState(utente.nome)
  const [ruolo, setRuolo] = useState(utente.ruolo_id)
  const salva = async () => { if (await esegui(aggiornaUtente(utente.id, { nome, ruolo_id: ruolo }), `${nome} aggiornato`)) onChiudi() }
  return (
    <Modal aperto onChiudi={onChiudi} titolo={`Modifica ${utente.nome}`}
      piede={<Button variante="primario" disabled={!nome.trim()} onClick={() => void salva()}>Salva</Button>}>
      <div className="space-y-3">
        <p className="text-sm text-profondo/60">{utente.email}</p>
        <label className="block"><span className="text-xs text-profondo/60">Nome e cognome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} /></label>
        <label className="block"><span className="text-xs text-profondo/60">Ruolo</span>
          <SceltaRuolo ruoli={ruoli} valore={ruolo} onChange={setRuolo} /></label>
      </div>
    </Modal>
  )
}

function ModalePassword({ utente, onChiudi, esegui }: { utente: Utente; onChiudi: () => void; esegui: Esegui }) {
  const [password, setPassword] = useState(generaPassword())
  const salva = async () => { if (await esegui(cambiaPassword(utente.id, password), `Nuova password di ${utente.nome}: ${password}`)) onChiudi() }
  return (
    <Modal aperto onChiudi={onChiudi} titolo={`Nuova password per ${utente.nome}`}
      piede={<Button variante="primario" disabled={password.length < 8} onClick={() => void salva()}>Imposta password</Button>}>
      <CampoPassword valore={password} onChange={setPassword} />
    </Modal>
  )
}

/** Griglia ruoli × sezioni: ogni cella Nessuno / Lettura / Modifica. L'amministratore ha sempre tutto. */
function MatricePermessi({ ruoli, utenti, modifica, esegui }: { ruoli: Ruolo[]; utenti: Utente[]; modifica: boolean; esegui: Esegui }) {
  const [bozza, setBozza] = useState<Record<string, Permessi>>({})
  const [nuovo, setNuovo] = useState(false)
  useEffect(() => { setBozza({}) }, [ruoli])
  const permessi = (r: Ruolo) => bozza[r.id] ?? r.permessi
  const cambiati = useMemo(() => ruoli.filter((r) => bozza[r.id] && JSON.stringify(bozza[r.id]) !== JSON.stringify(r.permessi)), [ruoli, bozza])
  const imposta = (r: Ruolo, s: string, l: Livello) => setBozza({ ...bozza, [r.id]: { ...permessi(r), [s]: l } })
  const salva = async () => {
    for (const r of cambiati) {
      if (!(await esegui(salvaRuolo({ ...r, permessi: bozza[r.id] }, false), 'Permessi salvati'))) return
    }
  }
  const assegnati = (id: string) => utenti.filter((u) => u.ruolo_id === id).length

  return (
    <Card>
      <CardHeader
        titolo={<span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cabina" /> Ruoli e permessi</span>}
        sottotitolo="Per ogni ruolo, cosa può fare in ogni sezione. Vale nel menu e nel database."
        azione={modifica && (
          <div className="flex gap-2">
            <Button dimensione="sm" onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo ruolo</Button>
            <Button dimensione="sm" variante="primario" disabled={cambiati.length === 0} onClick={() => void salva()}>
              <Save className="h-4 w-4" /> Salva{cambiati.length > 0 && ` (${cambiati.length})`}
            </Button>
          </div>
        )}
      />
      <CardBody className="overflow-x-auto pt-1">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-profondo/55">
              <th className="py-2 pr-3 font-medium">Sezione</th>
              {ruoli.map((r) => (
                <th key={r.id} className="px-2 py-2 font-medium">
                  <span className="block text-profondo">{r.nome}</span>
                  <span className="font-normal">{assegnati(r.id)} utenti</span>
                  {modifica && !r.di_sistema && assegnati(r.id) === 0 && (
                    <button className="ml-1 text-boa hover:underline" onClick={() => { if (confirm(`Eliminare il ruolo ${r.nome}?`)) void esegui(eliminaRuolo(r.id), 'Ruolo eliminato') }}>elimina</button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEZIONI.map((s) => (
              <tr key={s.id} className="border-t border-calce-200">
                <td className="py-2 pr-3 text-profondo">{s.nome}</td>
                {ruoli.map((r) => {
                  if (r.amministratore) return <td key={r.id} className="px-2 py-2"><Badge tono="stagionale">Tutto</Badge></td>
                  const l = (permessi(r)[s.id] ?? 0) as Livello
                  return (
                    <td key={r.id} className="px-2 py-2">
                      {modifica ? (
                        <select
                          value={l}
                          onChange={(e) => imposta(r, s.id, Number(e.target.value) as Livello)}
                          className={cn('h-8 rounded-lg border border-calce-200 bg-white px-2 text-xs', l === 2 && 'font-semibold text-cabina', l === 0 && 'text-profondo/45')}
                        >
                          {LIVELLI.map((x) => <option key={x.valore} value={x.valore}>{x.nome}</option>)}
                        </select>
                      ) : (
                        <Badge tono={tonoLivello[l]}>{LIVELLI[l].nome}</Badge>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
      {nuovo && <ModaleNuovoRuolo ruoli={ruoli} onChiudi={() => setNuovo(false)} esegui={esegui} />}
    </Card>
  )
}

function ModaleNuovoRuolo({ ruoli, onChiudi, esegui }: { ruoli: Ruolo[]; onChiudi: () => void; esegui: Esegui }) {
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [base, setBase] = useState('')
  const id = idDaNome(nome)
  const esiste = ruoli.some((r) => r.id === id)
  const salva = async () => {
    const permessi = ruoli.find((r) => r.id === base)?.permessi ?? {}
    if (await esegui(salvaRuolo({ id, nome: nome.trim(), descrizione: descrizione.trim() || null, permessi }, true), `Ruolo ${nome} creato`)) onChiudi()
  }
  return (
    <Modal aperto onChiudi={onChiudi} titolo="Nuovo ruolo"
      piede={<Button variante="primario" disabled={!nome.trim() || esiste} onClick={() => void salva()}>Crea ruolo</Button>}>
      <div className="space-y-3">
        <label className="block"><span className="text-xs text-profondo/60">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Cassa / Reception" className={campo} /></label>
        {esiste && <p className="text-xs text-boa">Esiste già un ruolo con questo nome.</p>}
        <label className="block"><span className="text-xs text-profondo/60">Descrizione</span>
          <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className={campo} /></label>
        <label className="block"><span className="text-xs text-profondo/60">Parti dai permessi di</span>
          <select value={base} onChange={(e) => setBase(e.target.value)} className={campo}>
            <option value="">Nessun permesso</option>
            {ruoli.filter((r) => !r.amministratore).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select></label>
      </div>
    </Modal>
  )
}
