// Edge Function "beachin-push": chiamata dal trigger su beachin.richieste_ristorante (nuova richiesta dal sito).
// Invia una notifica Web Push a tutti i telefoni del gestore iscritti (beachin.push_iscrizioni).
// Chiave privata VAPID nel Vault di Supabase (segreto `beachin_vapid_private`), mai nel repository.
import webpush from 'npm:web-push@3.6.7'
import postgres from 'npm:postgres@3.4.5'

const VAPID_PUBBLICA = 'BKCQla4JMqnJkbo21hLm_4czvgZK6zPnH6xYFU0CLOea0wBc-BweE9rvi6OD-xAqyK4IiMI9H2_TA8cAOuSBCMU'
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false })

const dataIt = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

Deno.serve(async (req) => {
  try {
    const { record: r } = await req.json()
    const [{ segreto }] = await sql`select decrypted_secret as segreto from vault.decrypted_secrets where name = 'beachin_vapid_private'`
    webpush.setVapidDetails('https://loriscuba.github.io/BeachIn/', VAPID_PUBBLICA, segreto)

    const iscrizioni = await sql`select endpoint, p256dh, auth, url from beachin.push_iscrizioni`
    let inviate = 0
    for (const s of iscrizioni) {
      const payload = JSON.stringify({
        titolo: 'Nuova prenotazione 🍽️',
        corpo: `${r?.nome ?? 'Cliente'} · ${r?.coperti ?? '?'} persone · ${r?.turno ?? ''} ${r?.data ? dataIt(r.data) : ''}`.trim(),
        url: s.url,
        tag: `richiesta-${r?.id ?? Date.now()}`,
      })
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'high' })
        inviate++
      } catch (e) {
        const stato = (e as { statusCode?: number }).statusCode
        // iscrizione scaduta o revocata: la tolgo
        if (stato === 404 || stato === 410) await sql`delete from beachin.push_iscrizioni where endpoint = ${s.endpoint}`
        else console.error('push fallita', stato, (e as Error).message)
      }
    }
    return Response.json({ iscrizioni: iscrizioni.length, inviate })
  } catch (e) {
    console.error(e)
    return Response.json({ errore: (e as Error).message }, { status: 500 })
  }
})
