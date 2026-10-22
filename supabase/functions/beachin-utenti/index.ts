// Edge Function "beachin-utenti": gestione degli account dello staff (Impostazioni → Utenti e ruoli).
// Chi chiama deve essere collegato con permesso "utenti" in modifica (beachin.ha_permesso('utenti', 2)).
// Body JSON { azione, ... }:
//   crea     { username, nome, ruolo_id, password } → account Auth confermato (email sintetica <username>@utenti.beachin.local) + profilo
//   aggiorna { id, nome?, ruolo_id?, attivo? }    → disattivare = profilo non attivo + account bloccato (niente nuovi token)
//   password { id, password }                     → nuova password
//   elimina  { id }                               → solo utenti già disattivati
// La regola "almeno un amministratore attivo" la fa rispettare il trigger beachin.verifica_amministratore.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (dati: unknown, status = 200) => new Response(JSON.stringify(dati), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const errore = (messaggio: string, status = 400) => json({ errore: messaggio }, status)

const URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVIZIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BLOCCO = '876000h' // ~100 anni
const DOMINIO_UTENTI = 'utenti.beachin.local' // come src/lib/permessi.ts

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  try {
    // 1) Chi chiama: client con il suo token, le funzioni del DB vedono auth.uid()
    const chiamante = createClient(URL, ANON, {
      db: { schema: 'beachin' },
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    })
    const { data: puo, error: e1 } = await chiamante.rpc('ha_permesso', { sezione: 'utenti', minimo: 2 })
    if (e1 || puo !== true) return errore('Permesso negato: serve "Utenti e ruoli" in modifica', 403)
    const { data: { user: io } } = await chiamante.auth.getUser()

    const admin = createClient(URL, SERVIZIO, { db: { schema: 'beachin' }, auth: { persistSession: false } })
    const corpo = await req.json()
    const { azione } = corpo as { azione: string }

    if (azione === 'crea') {
      const username = String(corpo.username ?? '').trim().toLowerCase()
      const nome = String(corpo.nome ?? '').trim()
      const password = String(corpo.password ?? '')
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) return errore('Nome utente: 3–30 caratteri tra lettere minuscole, numeri, punto e trattino')
      if (!nome || !corpo.ruolo_id) return errore('Servono nome e ruolo')
      const { data: doppio } = await admin.from('utenti').select('id').eq('username', username).maybeSingle()
      if (doppio) return errore(`Il nome utente ${username} è già usato`)
      const email = `${username}@${DOMINIO_UTENTI}`
      if (password.length < 8) return errore('La password deve avere almeno 8 caratteri')
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nome, app: 'beachin' } })
      if (error) return errore(/already|registered|exists/i.test(error.message) ? `Il nome utente ${username} è già usato` : error.message)
      const { error: e2 } = await admin.from('utenti').insert({ id: data.user.id, email, username, nome, ruolo_id: corpo.ruolo_id, attivo: true })
      if (e2) { await admin.auth.admin.deleteUser(data.user.id); return errore(e2.message) }
      return json({ id: data.user.id })
    }

    const id = String(corpo.id ?? '')
    if (!id) return errore('Manca l\'utente')
    const { data: utente } = await admin.from('utenti').select('id, attivo').eq('id', id).maybeSingle()
    if (!utente) return errore('Utente non trovato', 404)

    if (azione === 'aggiorna') {
      const modifiche: Record<string, unknown> = {}
      if (typeof corpo.nome === 'string' && corpo.nome.trim()) modifiche.nome = corpo.nome.trim()
      if (typeof corpo.ruolo_id === 'string') modifiche.ruolo_id = corpo.ruolo_id
      if (typeof corpo.attivo === 'boolean') {
        if (!corpo.attivo && id === io?.id) return errore('Non puoi disattivare te stesso')
        modifiche.attivo = corpo.attivo
      }
      const { error } = await admin.from('utenti').update(modifiche).eq('id', id)
      if (error) return errore(error.message)
      if (typeof corpo.attivo === 'boolean') {
        const { error: e3 } = await admin.auth.admin.updateUserById(id, { ban_duration: corpo.attivo ? 'none' : BLOCCO })
        if (e3) return errore(e3.message)
      }
      return json({ ok: true })
    }

    if (azione === 'password') {
      const password = String(corpo.password ?? '')
      if (password.length < 8) return errore('La password deve avere almeno 8 caratteri')
      const { error } = await admin.auth.admin.updateUserById(id, { password })
      return error ? errore(error.message) : json({ ok: true })
    }

    if (azione === 'elimina') {
      if (utente.attivo) return errore('Disattiva l\'utente prima di eliminarlo')
      const { error } = await admin.auth.admin.deleteUser(id) // il profilo va via in cascata
      return error ? errore(error.message) : json({ ok: true })
    }

    return errore('Azione sconosciuta')
  } catch (e) {
    console.error(e)
    return errore((e as Error).message, 500)
  }
})
