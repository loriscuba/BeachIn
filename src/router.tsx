import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { createBrowserRouter, createHashRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Caricamento } from '@/components/ui/Caricamento'
import { ModuloGate } from '@/components/ModuloGate'
import type { ModuloId } from '@/config/moduli'

// Su hosting statico (es. anteprima pubblicata) si usa il routing via hash,
// impostando VITE_ROUTER=hash in fase di build. L'app reale resta su history.
const creaRouter =
  import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter

// Pagine caricate on-demand: la home resta leggera, i grafici (Recharts)
// arrivano solo quando servono.
const Panoramica = lazy(() => import('@/pages/Panoramica'))
const Cruscotto = lazy(() => import('@/pages/Cruscotto'))
const Arenile = lazy(() => import('@/pages/Arenile'))
const Clienti = lazy(() => import('@/pages/Clienti'))
const Comande = lazy(() => import('@/pages/Comande'))
const Tariffe = lazy(() => import('@/pages/Tariffe'))
const Bar = lazy(() => import('@/pages/Bar'))
const Ristorante = lazy(() => import('@/pages/Ristorante'))
const AssistenteVocale = lazy(() => import('@/pages/AssistenteVocale'))
const Costi = lazy(() => import('@/pages/Costi'))
const ContoEconomico = lazy(() => import('@/pages/ContoEconomico'))
const Personale = lazy(() => import('@/pages/Personale'))
const Eventi = lazy(() => import('@/pages/Eventi'))
const Sito = lazy(() => import('@/pages/Sito'))
const SitoAnteprima = lazy(() => import('@/pages/SitoAnteprima'))
const Impostazioni = lazy(() => import('@/pages/Impostazioni'))
const NonTrovata = lazy(() => import('@/pages/NonTrovata'))

const s = (el: ReactNode): ReactNode => <Suspense fallback={<Caricamento />}>{el}</Suspense>
// Rotta protetta da modulo: se non attivo mostra l'upsell.
const g = (id: ModuloId, el: ReactNode): ReactNode => s(<ModuloGate id={id}>{el}</ModuloGate>)

export const router = creaRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: s(<Panoramica />) },
      { path: 'cruscotto', element: g('cruscotto', <Cruscotto />) },
      { path: 'arenile', element: g('arenile', <Arenile />) },
      { path: 'clienti', element: g('clienti', <Clienti />) },
      { path: 'comande', element: g('comande', <Comande />) },
      { path: 'tariffe', element: g('tariffe', <Tariffe />) },
      { path: 'bar', element: g('bar', <Bar />) },
      { path: 'ristorante', element: g('ristorante', <Ristorante />) },
      { path: 'assistente-vocale', element: g('assistente-vocale', <AssistenteVocale />) },
      { path: 'costi', element: g('costi', <Costi />) },
      { path: 'conto-economico', element: g('conto-economico', <ContoEconomico />) },
      { path: 'personale', element: g('personale', <Personale />) },
      { path: 'eventi', element: g('eventi', <Eventi />) },
      { path: 'sito', element: g('sito', <Sito />) },
      { path: 'impostazioni', element: s(<Impostazioni />) },
      { path: '*', element: s(<NonTrovata />) },
    ],
  },
  // Vetrina pubblica, fuori dallo shell gestionale
  { path: '/sito/anteprima', element: s(<SitoAnteprima />) },
])
