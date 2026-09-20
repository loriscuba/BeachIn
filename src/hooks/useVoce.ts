/**
 * useVoce — hook attorno alla Web Speech API del browser.
 * - Riconoscimento vocale (voce → testo) in italiano.
 * - Sintesi vocale (testo → voce) per far "parlare" l'assistente.
 *
 * Il microfono richiede in genere HTTPS o localhost e funziona al meglio su
 * Chrome/Edge. Dove non è disponibile, `supportata` è false e la pagina resta
 * usabile via testo.
 */
import { useCallback, useRef, useState } from 'react'

export interface ControlliVoce {
  supportata: boolean
  inAscolto: boolean
  avviaAscolto: (onTesto: (testo: string) => void, onErrore?: (codice: string) => void) => void
  fermaAscolto: () => void
  parla: (testo: string) => void
  setParlaAttivo: (attivo: boolean) => void
}

export function useVoce(): ControlliVoce {
  const [inAscolto, setInAscolto] = useState(false)
  const recRef = useRef<SpeechRecognition | null>(null)
  const parlaAttivoRef = useRef(true)

  const supportata =
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const parla = useCallback((testo: string) => {
    if (!parlaAttivoRef.current) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(testo)
      u.lang = 'it-IT'
      u.rate = 1.02
      const voce = window.speechSynthesis.getVoices().find((v) => /it(-|_)?IT/i.test(v.lang))
      if (voce) u.voice = voce
      window.speechSynthesis.speak(u)
    } catch {
      /* la sintesi vocale può non essere disponibile: si prosegue in silenzio */
    }
  }, [])

  const fermaAscolto = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const avviaAscolto = useCallback(
    (onTesto: (testo: string) => void, onErrore?: (codice: string) => void) => {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!Ctor) {
        onErrore?.('non-supportato')
        return
      }
      // Se l'assistente sta parlando, interrompiamo per non "sentirsi addosso".
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()

      const rec = new Ctor()
      rec.lang = 'it-IT'
      rec.continuous = false
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.onstart = () => setInAscolto(true)
      rec.onresult = (e) => onTesto(e.results[0][0].transcript)
      rec.onerror = (e) => onErrore?.(e.error)
      rec.onend = () => {
        setInAscolto(false)
        recRef.current = null
      }
      recRef.current = rec
      try {
        rec.start()
      } catch {
        onErrore?.('avvio-fallito')
      }
    },
    []
  )

  const setParlaAttivo = useCallback((attivo: boolean) => {
    parlaAttivoRef.current = attivo
  }, [])

  return { supportata, inAscolto, avviaAscolto, fermaAscolto, parla, setParlaAttivo }
}
