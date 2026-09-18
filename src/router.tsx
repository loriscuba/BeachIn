import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { createBrowserRouter, createHashRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Caricamento } from '@/components/ui/Caricamento'

// Su hosting statico (es. anteprima pubblicata) si usa il routing via hash,
// impostando VITE_ROUTER=hash in fase di build. L'app reale resta su history.
const creaRouter =
  import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter

// Pagine caricate on-demand: la home resta leggera, i grafici (Recharts)
// arrivano solo quando servono.
const Cruscotto = lazy(() => import('@/pages/Cruscotto'))
const Arenile = lazy(() => import('@/pages/Arenile'))
const Clienti = lazy(() => import('@/pages/Clienti'))
const Tariffe = lazy(() => import('@/pages/Tariffe'))
const Bar = lazy(() => import('@/pages/Bar'))
const Ristorante = lazy(() => import('@/pages/Ristorante'))
const Costi = lazy(() => import('@/pages/Costi'))
const ContoEconomico = lazy(() => import('@/pages/ContoEconomico'))
const Personale = lazy(() => import('@/pages/Personale'))
const Eventi = lazy(() => import('@/pages/Eventi'))
const Sito = lazy(() => import('@/pages/Sito'))
const SitoAnteprima = lazy(() => import('@/pages/SitoAnteprima'))
const Impostazioni = lazy(() => import('@/pages/Impostazioni'))
const NonTrovata = lazy(() => import('@/pages/NonTrovata'))

const s = (el: ReactNode): ReactNode => <Suspense fallback={<Caricamento />}>{el}</Suspense>

export const router = creaRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: s(<Cruscotto />) },
      { path: 'arenile', element: s(<Arenile />) },
      { path: 'clienti', element: s(<Clienti />) },
      { path: 'tariffe', element: s(<Tariffe />) },
      { path: 'bar', element: s(<Bar />) },
      { path: 'ristorante', element: s(<Ristorante />) },
      { path: 'costi', element: s(<Costi />) },
      { path: 'conto-economico', element: s(<ContoEconomico />) },
      { path: 'personale', element: s(<Personale />) },
      { path: 'eventi', element: s(<Eventi />) },
      { path: 'sito', element: s(<Sito />) },
      { path: 'impostazioni', element: s(<Impostazioni />) },
      { path: '*', element: s(<NonTrovata />) },
    ],
  },
  // Vetrina pubblica, fuori dallo shell gestionale
  { path: '/sito/anteprima', element: s(<SitoAnteprima />) },
])
