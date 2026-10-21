// Edge Function "beachin-email": chiamata dai trigger su beachin.richieste_ristorante e beachin.richieste_eventi.
// Manda al cliente, via Brevo, la mail "richiesta ricevuta" (insert) o "confermata/rifiutata" (cambio stato).
// Segreti nel Vault di Supabase, mai nel repository:
//   beachin_brevo_key       → chiave API Brevo (xkeysib-...)
//   beachin_email_mittente  → indirizzo mittente verificato su Brevo (es. prenotazioni@lidodeipini.it)
//   beachin_app_url         → (facoltativo) indirizzo pubblico dell'app per il link dell'invito, default Cloudflare Pages
import postgres from 'npm:postgres@3.4.5'

const NOME = 'Lido dei Pini'
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false })

const dataIt = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

type Richiesta = {
  id: string; nome: string; email: string; stato: string
  data?: string; turno?: string; ora?: string | null; coperti?: number // ristorante
  evento_nome?: string; evento_data?: string; persone?: number; codice?: string | null // eventi
}

/** Blocco invito con QR (solo eventi confermati): il QR contiene il link alla pagina dell'invito, letto all'ingresso dall'app admin. */
function bloccoInvito(codice: string, base: string): string {
  const url = `${base.replace(/\/?$/, '/')}invito?c=${encodeURIComponent(codice)}`
  // QR come immagine remota: i client di posta (Gmail, Outlook) bloccano le immagini data: incorporate
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&color=0F3B4C&data=${encodeURIComponent(url)}`
  return `<div style="margin:24px 0;padding:20px;border:1px solid #DCE4E6;border-radius:16px;text-align:center">
<p style="margin:0 0 12px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#2E7D9A"><b>Il tuo invito</b></p>
<img src="${qr}" width="200" height="200" alt="QR dell'invito ${esc(codice)}" style="display:block;margin:0 auto">
<p style="margin:12px 0 4px;font:bold 22px monospace;letter-spacing:.3em">${esc(codice)}</p>
<p style="margin:0 0 16px;color:#567">Mostra questo QR all'ingresso.</p>
<a href="${url}" style="display:inline-block;background:#0F3B4C;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Apri l'invito</a></div>`
}

function testo(tabella: string, r: Richiesta): { oggetto: string; righe: string[] } {
  if (tabella === 'richieste_eventi') {
    const ev = `“${esc(r.evento_nome ?? 'evento')}” di ${dataIt(r.evento_data ?? '')}`
    if (r.stato === 'confermata')
      return { oggetto: `Evento confermato ✓ — ${r.evento_nome}`, righe: [`la tua partecipazione a ${ev} per ${r.persone} persone è <b>confermata</b>.`, 'Ti aspettiamo!'] }
    if (r.stato === 'rifiutata')
      return { oggetto: `Evento non disponibile — ${r.evento_nome}`, righe: [`ci dispiace, per ${ev} non ci sono più posti.`, 'Contattaci per altri eventi in programma.'] }
    return { oggetto: `Richiesta ricevuta — ${r.evento_nome}`, righe: [`abbiamo ricevuto la tua richiesta di partecipazione a ${ev} per ${r.persone} persone.`, 'Ti confermeremo a breve.'] }
  }
  const quando = `${r.turno === 'pranzo' ? 'pranzo' : 'cena'} di ${dataIt(r.data ?? '')}${r.ora ? ` alle <b>${esc(r.ora)}</b>` : ''}`
  if (r.stato === 'confermata')
    return { oggetto: 'Tavolo confermato ✓', righe: [`il tuo tavolo per ${r.coperti} persone a ${quando} è <b>confermato</b>.`, 'Ti aspettiamo!'] }
  if (r.stato === 'rifiutata')
    return { oggetto: 'Tavolo non disponibile', righe: [`ci dispiace, per ${quando} siamo al completo.`, 'Prova con un altro turno o un’altra data.'] }
  return { oggetto: 'Richiesta ricevuta — tavolo ristorante', righe: [`abbiamo ricevuto la tua richiesta di tavolo per ${r.coperti} persone a ${quando}.`, 'Ti confermeremo a breve.'] }
}

Deno.serve(async (req) => {
  try {
    const { tabella = 'richieste_ristorante', record: r } = (await req.json()) as { tabella?: string; record: Richiesta }
    if (!r?.email?.includes('@')) return Response.json({ saltata: 'email mancante' })

    const segreti = await sql`select name, decrypted_secret as v from vault.decrypted_secrets
      where name in ('beachin_brevo_key', 'beachin_email_mittente', 'beachin_app_url')`
    const s = Object.fromEntries(segreti.map((x) => [x.name, x.v as string]))
    if (!s.beachin_brevo_key || !s.beachin_email_mittente) return Response.json({ saltata: 'Brevo non configurato' })

    const { oggetto, righe } = testo(tabella, r)
    const html = `<div style="font-family:Arial,sans-serif;color:#0F3B4C;max-width:520px">
<h2 style="color:#2E7D9A;margin:0 0 16px">${NOME}</h2>
<p>Gentile ${esc(r.nome)},</p>${righe.map((t) => `<p>${t}</p>`).join('')}
${tabella === 'richieste_eventi' && r.stato === 'confermata' && r.codice ? bloccoInvito(r.codice, s.beachin_app_url || 'https://beachin.pages.dev/') : ''}
<p style="margin-top:24px">${NOME}<br><span style="color:#7FB7A8">Savona</span></p></div>`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': s.beachin_brevo_key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: NOME, email: s.beachin_email_mittente },
        to: [{ email: r.email, name: r.nome }],
        subject: oggetto,
        htmlContent: html,
        tags: ['beachin', `${tabella === 'richieste_eventi' ? 'evento' : 'ristorante'}-${r.stato}`],
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
