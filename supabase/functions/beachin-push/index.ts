// Edge Function "beachin-push": chiamata dai trigger del DB, invia notifiche Web Push ai telefoni iscritti (beachin.push_iscrizioni).
// - tipo "richiesta" (default, trigger su beachin.richieste_ristorante): nuova prenotazione tavolo → app admin
// - tipo "ombrellone" (beachin.prenotazioni_online) ed "evento" (beachin.richieste_eventi) → app admin
// - tipo "notizia" (insert su beachin.notizie) e "lavagnetta" (beachin.lavagnetta) → app clienti
// Chiave privata VAPID nel Vault di Supabase (segreto `beachin_vapid_private`), mai nel repository.
import webpush from 'npm:web-push@3.6.7'
import postgres from 'npm:postgres@3.4.5'

const VAPID_PUBBLICA = 'BKCQla4JMqnJkbo21hLm_4czvgZK6zPnH6xYFU0CLOea0wBc-BweE9rvi6OD-xAqyK4IiMI9H2_TA8cAOuSBCMU'
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false })

const dataIt = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

const taglia = (t?: string) => (t && t.length > 120 ? `${t.slice(0, 117)}…` : t ?? '')

Deno.serve(async (req) => {
  try {
    const { record: r, tipo = 'richiesta' } = await req.json()
    const app = ['richiesta', 'ombrellone', 'evento'].includes(tipo) ? 'admin' : 'clienti'
    const messaggio = tipo === 'notizia'
      ? { titolo: `📰 ${r?.titolo ?? 'Nuova news'}`, corpo: taglia(r?.testo) || 'Apri l\'app per leggerla', tag: `notizia-${r?.id ?? Date.now()}` }
      : tipo === 'lavagnetta'
        ? { titolo: '🍽️ Lavagna del giorno aggiornata', corpo: 'Scopri le proposte di oggi', tag: 'lavagnetta' }
        : tipo === 'ombrellone'
          ? { titolo: 'Prenotazione ombrellone ⛱️', corpo: `${r?.nome ?? 'Cliente'} · ${r?.persone ?? '?'} persone · dal ${r?.dal ? dataIt(r.dal) : '?'} al ${r?.al ? dataIt(r.al) : '?'}`, tag: `ombrellone-${r?.id ?? Date.now()}` }
          : tipo === 'evento'
            ? { titolo: `Richiesta per ${r?.evento_nome ?? 'un evento'} 🎉`, corpo: `${r?.nome ?? 'Cliente'} · ${r?.persone ?? '?'} persone${r?.evento_data ? ` · ${dataIt(r.evento_data)}` : ''}`, tag: `evento-${r?.id ?? Date.now()}` }
            : {
            titolo: 'Nuova prenotazione 🍽️',
            corpo: `${r?.nome ?? 'Cliente'} · ${r?.coperti ?? '?'} persone · ${r?.turno ?? ''} ${r?.data ? dataIt(r.data) : ''}`.trim(),
            tag: `richiesta-${r?.id ?? Date.now()}`,
          }
    const [{ segreto }] = await sql`select decrypted_secret as segreto from vault.decrypted_secrets where name = 'beachin_vapid_private'`
    webpush.setVapidDetails('https://loriscuba.github.io/BeachIn/', VAPID_PUBBLICA, segreto)

    const iscrizioni = await sql`select endpoint, p256dh, auth, url from beachin.push_iscrizioni where app = ${app}`
    let inviate = 0
    for (const s of iscrizioni) {
      const payload = JSON.stringify({ ...messaggio, url: s.url, app })
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'high' })
        inviate++
      } catch (e) {
        const stato = (e as { statusCode?: number }).statusCode
        // iscrizione scaduta o revocata: la tolgo
        if (stato === 404 || stato === 410) await sql`delete from beachin.push_iscrizioni where endpoint = ${s.endpoint} and app = ${app}`
        else console.error('push fallita', stato, (e as Error).message)
      }
    }
    return Response.json({ iscrizioni: iscrizioni.length, inviate })
  } catch (e) {
    console.error(e)
    return Response.json({ errore: (e as Error).message }, { status: 500 })
  }
})
