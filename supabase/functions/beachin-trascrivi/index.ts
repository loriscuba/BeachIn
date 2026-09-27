// Edge Function "beachin-trascrivi": riceve un audio (multipart, campo "audio") dall'assistente vocale
// e lo trascrive con Whisper su Groq (piano gratuito). Chiave nel segreto GROQ_API_KEY (Edge Functions → Secrets).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (dati: unknown, status = 200) => new Response(JSON.stringify(dati), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const chiave = Deno.env.get('GROQ_API_KEY')
  if (!chiave) return json({ errore: 'GROQ_API_KEY non configurata su Supabase' }, 503)
  try {
    const dati = await req.formData()
    const audio = dati.get('audio')
    if (!(audio instanceof File) || audio.size === 0) return json({ errore: 'audio mancante' }, 400)
    if (audio.size > 5_000_000) return json({ errore: 'audio troppo lungo' }, 413)

    const inoltro = new FormData()
    inoltro.append('file', audio, audio.name || 'audio.webm')
    inoltro.append('model', 'whisper-large-v3-turbo')
    inoltro.append('language', 'it')
    inoltro.append('response_format', 'json')
    inoltro.append('temperature', '0')
    const suggerimento = dati.get('prompt')
    if (typeof suggerimento === 'string' && suggerimento) inoltro.append('prompt', suggerimento.slice(0, 800))

    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${chiave}` }, body: inoltro,
    })
    const corpo = await r.json().catch(() => ({}))
    if (!r.ok) return json({ errore: corpo?.error?.message ?? `Groq ${r.status}` }, r.status === 429 ? 429 : 502)
    return json({ testo: String(corpo.text ?? '').trim() })
  } catch (e) {
    return json({ errore: (e as Error).message }, 500)
  }
})
