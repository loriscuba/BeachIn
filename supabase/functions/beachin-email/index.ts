// Edge Function "beachin-email": chiamata dai trigger su beachin.richieste_ristorante.
// Manda al cliente, via Brevo, la mail "richiesta ricevuta" (insert) o "confermata/rifiutata" (cambio stato).
// Segreti nel Vault di Supabase, mai nel repository:
//   beachin_brevo_key       → chiave API Brevo (xkeysib-...)
//   beachin_email_mittente  → indirizzo mittente verificato su Brevo (es. prenotazioni@lidodeipini.it)
import postgres from 'npm:postgres@3.4.5'

const NOME = 'Lido dei Pini'
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false })

const dataIt = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

type Richiesta = { id: string; nome: string; email: string; data: string; turno: string; coperti: number; stato: string }

function testo(r: Richiesta): { oggetto: string; righe: string[] } {
  const quando = `${r.turno === 'pranzo' ? 'pranzo' : 'cena'} di ${dataIt(r.data)}`
  if (r.stato === 'confermata')
    return { oggetto: 'Tavolo confermato ✓', righe: [`il tuo tavolo per ${r.coperti} persone a ${quando} è <b>confermato</b>.`, 'Ti aspettiamo!'] }
  if (r.stato === 'rifiutata')
    return { oggetto: 'Tavolo non disponibile', righe: [`ci dispiace, per ${quando} siamo al completo.`, 'Prova con un altro turno o un’altra data.'] }
  return { oggetto: 'Richiesta ricevuta — tavolo ristorante', righe: [`abbiamo ricevuto la tua richiesta di tavolo per ${r.coperti} persone a ${quando}.`, 'Ti confermeremo a breve.'] }
}

Deno.serve(async (req) => {
  try {
    const { record: r } = (await req.json()) as { record: Richiesta }
    if (!r?.email?.includes('@')) return Response.json({ saltata: 'email mancante' })

    const segreti = await sql`select name, decrypted_secret as v from vault.decrypted_secrets
      where name in ('beachin_brevo_key', 'beachin_email_mittente')`
    const s = Object.fromEntries(segreti.map((x) => [x.name, x.v as string]))
    if (!s.beachin_brevo_key || !s.beachin_email_mittente) return Response.json({ saltata: 'Brevo non configurato' })

    const { oggetto, righe } = testo(r)
    const html = `<div style="font-family:Arial,sans-serif;color:#0F3B4C;max-width:520px">
<h2 style="color:#2E7D9A;margin:0 0 16px">${NOME}</h2>
<p>Gentile ${esc(r.nome)},</p>${righe.map((t) => `<p>${t}</p>`).join('')}
<p style="margin-top:24px">${NOME}<br><span style="color:#7FB7A8">Savona</span></p></div>`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': s.beachin_brevo_key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: NOME, email: s.beachin_email_mittente },
        to: [{ email: r.email, name: r.nome }],
        subject: oggetto,
        htmlContent: html,
        tags: ['beachin', `ristorante-${r.stato}`],
      }),
    })
    const esito = await res.json().catch(() => ({}))
    if (!res.ok) console.error('brevo', res.status, esito)
    return Response.json({ ok: res.ok, esito }, { status: res.ok ? 200 : 502 })
  } catch (e) {
    console.error(e)
    return Response.json({ errore: (e as Error).message }, { status: 500 })
  }
})
