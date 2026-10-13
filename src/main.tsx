// Deve restare il primo import: converte "#/percorso" prima che il router legga l'indirizzo.
import './lib/hashInPercorso'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { DemoDataProvider } from './context/DemoDataContext'
import { ModuliProvider } from './context/ModuliContext'
import { caricaImpostazioni, sottoscriviImpostazioni } from './lib/impostazioni'
import './styles/index.css'

// Le pagine leggono `config` direttamente: quando cambiano le impostazioni (salvataggio o Realtime) rimonto il router.
function Router() {
  const [versione, setVersione] = React.useState(0)
  React.useEffect(() => sottoscriviImpostazioni(() => setVersione((v) => v + 1)), [])
  return <RouterProvider key={versione} router={router} />
}

void caricaImpostazioni().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ModuliProvider>
        <DemoDataProvider>
          <Router />
        </DemoDataProvider>
      </ModuliProvider>
    </React.StrictMode>
  )
})
