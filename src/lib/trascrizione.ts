/**
 * Registrazione dal microfono (MediaRecorder, funziona anche nell'app installata su iPhone)
 * + trascrizione con Whisper su Groq tramite la Edge Function Supabase `beachin-trascrivi`.
 */
import { useCallback, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DURATA_MAX = 12_000

function formato(): { mime: string; ext: string } {
  const candidati = [['audio/mp4', 'm4a'], ['audio/webm;codecs=opus', 'webm'], ['audio/webm', 'webm'], ['audio/ogg', 'ogg']]
  for (const [mime, ext] of candidati) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(mime)) return { mime, ext }
  return { mime: '', ext: 'webm' }
}

export const trascrizioneDisponibile = () =>
  !!supabase && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

export function useRegistrazione() {
  const [stato, setStato] = useState<'fermo' | 'registro' | 'trascrivo'>('fermo')
  const rec = useRef<MediaRecorder | null>(null)
  const timer = useRef<number>()

  const ferma = useCallback(() => {
    window.clearTimeout(timer.current)
    if (rec.current?.state === 'recording') rec.current.stop()
  }, [])

  /** Avvia la registrazione; alla fine (tocco o 12 s) trascrive e chiama onTesto. */
  const avvia = useCallback(async (onTesto: (t: string) => void, onErrore: (msg: string) => void, suggerimento?: string) => {
    if (!supabase) { onErrore('Trascrizione non disponibile (Supabase non configurato).'); return }
    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch { onErrore('Microfono non consentito. Abilitalo nelle impostazioni del telefono per questa app.'); return }
    const { mime, ext } = formato()
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    const pezzi: Blob[] = []
    r.ondataavailable = (e) => { if (e.data.size) pezzi.push(e.data) }
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      rec.current = null
      const blob = new Blob(pezzi, { type: r.mimeType || mime || 'audio/webm' })
      if (blob.size < 1000) { setStato('fermo'); onErrore('Registrazione troppo breve. Riprova.'); return }
      setStato('trascrivo')
      try {
        const fd = new FormData()
        fd.append('audio', new File([blob], `comando.${ext}`, { type: blob.type }))
        if (suggerimento) fd.append('prompt', suggerimento)
        const { data, error } = await supabase!.functions.invoke('beachin-trascrivi', { body: fd })
        if (error || !data?.testo) throw new Error(data?.errore ?? error?.message ?? 'nessun testo riconosciuto')
        onTesto(data.testo as string)
      } catch (e) {
        onErrore(`Trascrizione non riuscita: ${(e as Error).message}`)
      } finally {
        setStato('fermo')
      }
    }
    rec.current = r
    r.start()
    setStato('registro')
    timer.current = window.setTimeout(() => ferma(), DURATA_MAX)
  }, [ferma])

  return { stato, avvia, ferma }
}
