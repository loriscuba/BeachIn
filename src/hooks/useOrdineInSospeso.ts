import { useCallback, useEffect, useRef, useState } from 'react'

/** Secondi in cui un ordine del cliente resta fermo sul suo telefono prima di arrivare a cucina o bar. */
export const SECONDI_SOSPESO = 60

interface Sospeso<T> { dati: T; scade: number }

/**
 * Ordine del cliente (ombrellone o QR del tavolo) tenuto in sospeso sul suo telefono per 60 secondi:
 * in quel tempo cucina e bar non lo vedono e il cliente può modificarlo, annullarlo o mandarlo subito.
 * Allo scadere `onInvia` lo manda davvero. Salvato nel localStorage: se la pagina si ricarica il conto alla rovescia
 * riprende (e se è già scaduto parte appena si riapre).
 */
export function useOrdineInSospeso<T>(chiave: string, onInvia: (dati: T) => void) {
  const [sosp, setSosp] = useState<Sospeso<T> | null>(() => {
    try { const v = localStorage.getItem(chiave); return v ? (JSON.parse(v) as Sospeso<T>) : null } catch { return null }
  })
  const [ora, setOra] = useState(() => Date.now())
  const inviaRef = useRef(onInvia)
  inviaRef.current = onInvia
  // evita il doppio invio dello stesso ordine (effetti ripetuti)
  const inviato = useRef<number | null>(null)

  const salva = useCallback((v: Sospeso<T> | null) => {
    setSosp(v)
    try { if (v) localStorage.setItem(chiave, JSON.stringify(v)); else localStorage.removeItem(chiave) } catch { /* solo in memoria */ }
  }, [chiave])

  useEffect(() => {
    if (!sosp) return
    const t = setInterval(() => setOra(Date.now()), 500)
    return () => clearInterval(t)
  }, [sosp])

  const invia = useCallback((v: Sospeso<T>) => {
    if (inviato.current === v.scade) return
    inviato.current = v.scade
    salva(null)
    inviaRef.current(v.dati)
  }, [salva])

  useEffect(() => { if (sosp && ora >= sosp.scade) invia(sosp) }, [ora, sosp, invia])

  return {
    sospeso: sosp?.dati ?? null,
    restanti: sosp ? Math.max(0, Math.ceil((sosp.scade - ora) / 1000)) : 0,
    metti: (dati: T) => { const n = Date.now(); setOra(n); salva({ dati, scade: n + SECONDI_SOSPESO * 1000 }) },
    /** Toglie l'ordine dal sospeso e lo restituisce (per rimetterlo nel carrello). */
    riprendi: () => { const d = sosp?.dati ?? null; salva(null); return d },
    annulla: () => salva(null),
    inviaSubito: () => { if (sosp) invia(sosp) },
  }
}
