// Deve restare il primo import: converte "#/percorso" prima che il router legga l'indirizzo.
import './lib/hashInPercorso'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { DemoDataProvider, PAGINE_CLIENTI } from './context/DemoDataContext'
import { ModuliProvider } from './context/ModuliContext'
import { SessioneProvider, useSessione } from './context/SessioneContext'
import { caricaImpostazioni, sottoscriviImpostazioni } from './lib/impostazioni'
import { avviaPresenza } from './lib/presenza'
import './styles/index.css'
import './lib/bloccoZoom'

// Le pagine leggono `config` direttamente: quando cambiano le impostazioni (salvataggio o Realtime) rimonto il router.
function Router() {
  const [versione, setVersione] = React.useState(0)
  React.useEffect(() => sottoscriviImpostazioni(() => setVersione((v) => v + 1)), [])
  return <RouterProvider key={versione} router={router} />
}

// Al login/logout dello staff i dati si rileggono col nuovo ruolo (le policy RLS cambiano cosa si vede).
// Le pagine dei clienti (QR del tavolo, menu, ComandApp, sito, invito) scaricano solo le loro tabelle: passando da una
// all'altra, o al gestionale, i dati si ricaricano (chiave del provider).
const paginaDi = ({ pathname, search }: { pathname: string; search: string }) => ({ percorso: pathname, cerca: search })
function Dati({ children }: { children: React.ReactNode }) {
  const { profilo } = useSessione()
  const [pagina, setPagina] = React.useState(() => paginaDi(router.state.location))
  React.useEffect(() => router.subscribe((st) => {
    const p = paginaDi(st.location)
    setPagina((prima) => (prima.percorso === p.percorso && prima.cerca === p.cerca ? prima : p))
  }), [])
  const gruppo = PAGINE_CLIENTI[pagina.percorso] ? `${pagina.percorso}${pagina.cerca}` : 'gestionale'
  return (
    <DemoDataProvider key={`${profilo?.id ?? 'anon'}-${gruppo}`} pagina={gruppo === 'gestionale' ? undefined : pagina}>
      {children}
    </DemoDataProvider>
  )
}

avviaPresenza()

void caricaImpostazioni().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ModuliProvider>
        <SessioneProvider>
          <Dati>
            <Router />
          </Dati>
        </SessioneProvider>
      </ModuliProvider>
    </React.StrictMode>
  )
})
