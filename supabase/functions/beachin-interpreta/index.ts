// Edge Function "beachin-interpreta": quando il parser a regole dell'assistente vocale non capisce una frase,
// la fa interpretare a un LLM su Groq (piano gratuito) e restituisce i comandi strutturati per il menu.
// Body JSON: { testo, piatti: string[], sezioni: {id,nome}[] } → { comandi: [...] }. Chiave nel segreto GROQ_API_KEY.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (dati: unknown, status = 200) => new Response(JSON.stringify(dati), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const ISTRUZIONI = `Sei l'assistente che modifica il menu di un ristorante italiano. Ricevi una frase detta a voce
(può contenere errori di trascrizione) e la traduci in comandi JSON. Rispondi SOLO con {"comandi":[...]}.
Comandi possibili:
- {"azione":"aggiungi","nome":"...","prezzo":numero|null,"categoria":"<id sezione>"}
- {"azione":"rimuovi","nome":"..."}
- {"azione":"prezzo","nome":"...","prezzo":numero}
- {"azione":"rinomina","nome":"...","nuovoNome":"..."}
- {"azione":"sostituisci","nome":"<piatto da togliere>","nuovoNome":"<piatto nuovo>","prezzo":numero|null}  (sostituisci/rimpiazza X con Y, metti Y al posto di X)
- {"azione":"leggi"} | {"azione":"svuota"} | {"azione":"aiuto"}
Regole: per rimuovi/prezzo/rinomina/sostituisci usa il nome ESATTO del piatto del menu più simile a quello detto.
Per aggiungi scrivi il nome del piatto con l'iniziale maiuscola, senza articoli, e scegli la categoria tra gli id delle sezioni.
Prezzi in euro come numero (es. 6.5). Più azioni nella frase → più comandi nell'ordine detto.
Se la frase non riguarda il menu, rispondi {"comandi":[]}.
Esempi:
«sostituiscimi la tartare di tonno con una poké di riso al curry a 24 euro» → {"comandi":[{"azione":"sostituisci","nome":"Tartare di tonno","nuovoNome":"Poké di riso al curry","prezzo":24}]}
«togli il tiramisù e metti la panna cotta a 6» → {"comandi":[{"azione":"rimuovi","nome":"Tiramisù"},{"azione":"aggiungi","nome":"Panna cotta","prezzo":6,"categoria":"dolci"}]}
«la carbonara da adesso costa 13 e mezzo» → {"comandi":[{"azione":"prezzo","nome":"Carbonara","prezzo":13.5}]}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const chiave = Deno.env.get('GROQ_API_KEY')
  if (!chiave) return json({ errore: 'GROQ_API_KEY non configurata su Supabase' }, 503)
  try {
    const { testo, piatti, sezioni } = await req.json()
    if (typeof testo !== 'string' || !testo.trim()) return json({ errore: 'testo mancante' }, 400)
    const contesto = `Sezioni (id: nome): ${(Array.isArray(sezioni) ? sezioni : []).slice(0, 30).map((s: { id: string; nome: string }) => `${s.id}: ${s.nome}`).join('; ')}
Piatti nel menu: ${(Array.isArray(piatti) ? piatti : []).slice(0, 200).join('; ')}`.slice(0, 6000)

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chiave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${ISTRUZIONI}\n\n${contesto}` },
          { role: 'user', content: testo.slice(0, 500) },
        ],
      }),
    })
    const corpo = await r.json().catch(() => ({}))
    if (!r.ok) return json({ errore: corpo?.error?.message ?? `Groq ${r.status}` }, r.status === 429 ? 429 : 502)
    const risposta = JSON.parse(corpo?.choices?.[0]?.message?.content ?? '{}')
    return json({ comandi: Array.isArray(risposta?.comandi) ? risposta.comandi : [] })
  } catch (e) {
    return json({ errore: (e as Error).message }, 500)
  }
})
