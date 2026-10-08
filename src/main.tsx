import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { DemoDataProvider } from './context/DemoDataContext'
import { ModuliProvider } from './context/ModuliContext'
import { caricaImpostazioni, sottoscriviImpostazioni } from './lib/impostazioni'
import './styles/index.css'

// Con BrowserRouter (Vercel) un link in stile hash (es. start_url dell'app admin "./#/adminapp") va convertito in percorso.
if (import.meta.env.VITE_ROUTER !== 'hash' && window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', `${import.meta.env.BASE_URL}${window.location.hash.slice(2)}`)
}

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
