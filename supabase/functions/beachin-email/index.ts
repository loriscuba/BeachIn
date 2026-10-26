// Edge Function "beachin-email": chiamata dai trigger su beachin.richieste_ristorante e beachin.richieste_eventi.
// Manda al cliente, via Brevo, la mail "richiesta ricevuta" (insert) o "confermata/rifiutata" (cambio stato).
// Segreti nel Vault di Supabase, mai nel repository:
//   beachin_brevo_key       → chiave API Brevo (xkeysib-...)
//   beachin_email_mittente  → indirizzo mittente verificato su Brevo (es. prenotazioni@lidodeipini.it)
//   beachin_app_url         → (facoltativo) indirizzo pubblico dell'app per il link dell'invito, default Cloudflare Pages
//   beachin_email_img       → (facoltativo) cartella pubblica delle immagini della mail, default <app>/email/ (file in public/email)
// Grafica: testata blu col logo, foto (ristorante dal sito; evento = foto caricata dell'evento), scheda col riepilogo.
import postgres from 'npm:postgres@3.4.5'

const NOME = 'Lido dei Pini'
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false })

const dataIt = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

type Richiesta = {
  id: string; nome: string; email: string; stato: string
  data?: string; turno?: string; ora?: string | null; coperti?: number // ristorante
  evento_nome?: string; evento_data?: string; persone?: number; codice?: string | null; invio_ts?: number | null // eventi
  evento_foto?: string | null // URL pubblico della foto dell'evento (se caricata)
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

type Testo = { oggetto: string; titolo: string; righe: string[]; colore: string }
const OK = '#7FB7A8', ATTESA = '#F2C14E', NO = '#E4572E'

function testo(tabella: string, r: Richiesta): Testo {
  if (tabella === 'richieste_eventi') {
    const ev = `“${esc(r.evento_nome ?? 'evento')}” di ${dataIt(r.evento_data ?? '')}`
    // "Reinvia invito" dalle Presenze: stessa mail col QR, testo da promemoria
    if (r.stato === 'confermata' && r.invio_ts)
      return { oggetto: `Il tuo invito — ${r.evento_nome}`, titolo: 'Il tuo invito', colore: OK, righe: [`ecco il tuo invito per ${ev} per ${r.persone} persone.`, 'All’ingresso mostra il QR qui sotto.'] }
    if (r.stato === 'confermata')
      return { oggetto: `Evento confermato ✓ — ${r.evento_nome}`, titolo: 'Partecipazione confermata', colore: OK, righe: [`la tua partecipazione a ${ev} per ${r.persone} persone è <b>confermata</b>.`, 'Ti aspettiamo!'] }
    if (r.stato === 'rifiutata')
      return { oggetto: `Evento non disponibile — ${r.evento_nome}`, titolo: 'Posti esauriti', colore: NO, righe: [`ci dispiace, per ${ev} non ci sono più posti.`, 'Contattaci per altri eventi in programma.'] }
    return { oggetto: `Richiesta ricevuta — ${r.evento_nome}`, titolo: 'Richiesta ricevuta', colore: ATTESA, righe: [`abbiamo ricevuto la tua richiesta di partecipazione a ${ev} per ${r.persone} persone.`, 'Ti confermeremo a breve.'] }
  }
  const quando = `${r.turno === 'pranzo' ? 'pranzo' : 'cena'} di ${dataIt(r.data ?? '')}${r.ora ? ` alle <b>${esc(r.ora)}</b>` : ''}`
  if (r.stato === 'confermata')
    return { oggetto: `Tavolo confermato per ${dataIt(r.data ?? '')} ${r.ora ? `alle ${r.ora}` : `a ${r.turno === 'pranzo' ? 'pranzo' : 'cena'}`}`, titolo: 'Tavolo confermato', colore: OK, righe: [`il tuo tavolo per ${r.coperti} persone a ${quando} è <b>confermato</b>.`, 'Ti aspettiamo!'] }
  if (r.stato === 'rifiutata')
    return { oggetto: 'Tavolo non disponibile', titolo: 'Siamo al completo', colore: NO, righe: [`ci dispiace, per ${quando} siamo al completo.`, 'Prova con un altro turno o un’altra data.'] }
  return { oggetto: 'Richiesta ricevuta — tavolo ristorante', titolo: 'Richiesta ricevuta', colore: ATTESA, righe: [`abbiamo ricevuto la tua richiesta di tavolo per ${r.coperti} persone a ${quando}.`, 'Ti confermeremo a breve.'] }
}

/** Riepilogo in scheda: cosa, quando, quante persone. */
function riepilogo(tabella: string, r: Richiesta): [string, string][] {
  if (tabella === 'richieste_eventi')
    return [['Evento', esc(r.evento_nome ?? '')], ['Data', dataIt(r.evento_data ?? '')], ['Persone', String(r.persone ?? 1)]]
  return [['Ristorante', r.turno === 'pranzo' ? 'Pranzo' : 'Cena'], ['Data', dataIt(r.data ?? '')],
    ...(r.ora ? [['Ora', esc(r.ora)] as [string, string]] : []), ['Coperti', String(r.coperti ?? 1)]]
}

/** Mail completa (tabelle e stili in linea, come vogliono i client di posta). */
function pagina(tabella: string, r: Richiesta, t: Omit<Testo, 'oggetto'>, app: string, img: string): string {
  const evento = tabella === 'richieste_eventi'
  const foto = evento && r.evento_foto?.startsWith('https://') ? r.evento_foto : `${img}${evento ? 'evento' : 'ristorante'}.jpg`
  const righe = riepilogo(tabella, r).map(([k, v]) => `<tr><td style="padding:6px 0;color:#6B8590;font-size:13px;text-transform:uppercase;letter-spacing:.08em">${k}</td>
<td style="padding:6px 0;text-align:right;font-size:15px;font-weight:bold;color:#0F3B4C">${v}</td></tr>`).join('')
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#EDF1F2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDF1F2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#0F3B4C">
<tr><td align="center" style="background:#0F3B4C;padding:22px 24px 18px">
<img src="${img}logo.png" width="74" height="90" alt="${NOME}" style="display:block;border:0">
<p style="margin:10px 0 0;color:#7FB7A8;font-size:11px;letter-spacing:.3em;text-transform:uppercase">Savona</p></td></tr>
<tr><td style="padding:0;line-height:0"><img src="${esc(foto)}" width="560" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>
<tr><td style="height:5px;background:${t.colore};line-height:5px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:28px 28px 8px">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#0F3B4C">${t.titolo}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6">Gentile ${esc(r.nome)},</p>
${t.righe.map((x) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${x}</p>`).join('')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;padding:12px 18px;background:#EDF1F2;border-radius:14px">${righe}</table>
${evento && r.stato === 'confermata' && r.codice ? bloccoInvito(r.codice, app) : ''}
</td></tr>
<tr><td style="padding:16px 28px 28px;font-size:15px;line-height:1.6">A presto,<br><b>${NOME}</b></td></tr>
<tr><td align="center" style="background:#0F3B4C;padding:16px 24px;color:#BFD6DE;font-size:12px;line-height:1.6">
${NOME} · Savona<br><a href="${app.replace(/\/?$/, '/')}sito/anteprima" style="color:#F2C14E;text-decoration:none">Visita il nostro sito</a></td></tr>
</table></td></tr></table></body></html>`
}

Deno.serve(async (req) => {
  try {
    const { tabella = 'richieste_ristorante', record: r } = (await req.json()) as { tabella?: string; record: Richiesta }
    if (!r?.email?.includes('@')) return Response.json({ saltata: 'email mancante' })

    const segreti = await sql`select name, decrypted_secret as v from vault.decrypted_secrets
      where name in ('beachin_brevo_key', 'beachin_email_mittente', 'beachin_app_url', 'beachin_email_img')`
    const s = Object.fromEntries(segreti.map((x) => [x.name, x.v as string]))
    if (!s.beachin_brevo_key || !s.beachin_email_mittente) return Response.json({ saltata: 'Brevo non configurato' })

    const app = s.beachin_app_url || 'https://beachin.pages.dev/'
    const { oggetto, ...t } = testo(tabella, r)
    const html = pagina(tabella, r, t, app, s.beachin_email_img || `${app.replace(/\/?$/, '/')}email/`)

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
