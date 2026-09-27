import { lazy, type ComponentType } from 'react'

const CHIAVE = 'beachin.ricaricato-dopo-deploy'

/**
 * Come React.lazy, ma se il file della pagina non esiste più (nuovo deploy mentre la pagina era aperta
 * o index.html in cache) ricarica una volta la pagina per prendere la versione nuova.
 */
export function lazyRiprova<T extends ComponentType<unknown>>(carica: () => Promise<{ default: T }>) {
  return lazy(() =>
    carica()
      .then((m) => { try { sessionStorage.removeItem(CHIAVE) } catch { /* */ } return m })
      .catch((e) => {
        let giaRicaricato = false
        try { giaRicaricato = sessionStorage.getItem(CHIAVE) === '1'; sessionStorage.setItem(CHIAVE, '1') } catch { /* */ }
        if (!giaRicaricato) {
          window.location.reload()
          return new Promise<{ default: T }>(() => undefined) // resta in attesa mentre ricarica
        }
        throw e
      })
  )
}
