import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Caricamento } from '@/components/ui/Caricamento'
import { ModuloGate } from '@/components/ModuloGate'
import { lazyRiprova } from '@/lib/lazyRiprova'
import type { ModuloId } from '@/config/moduli'

// Su hosting statico (es. anteprima pubblicata) si usa il routing via hash,
// impostando VITE_ROUTER=hash in fase di build. L'app reale resta su history.
const creaRouter =
  import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter

// Pagine caricate on-demand: la home resta leggera, i grafici (Recharts)
// arrivano solo quando servono.
const Panoramica = lazyRiprova(() => import('@/pages/Panoramica'))
const Cruscotto = lazyRiprova(() => import('@/pages/Cruscotto'))
const Arenile = lazyRiprova(() => import('@/pages/Arenile'))
const Clienti = lazyRiprova(() => import('@/pages/Clienti'))
const Comande = lazyRiprova(() => import('@/pages/Comande'))
const Tariffe = lazyRiprova(() => import('@/pages/Tariffe'))
const Bar = lazyRiprova(() => import('@/pages/Bar'))
const Ristorante = lazyRiprova(() => import('@/pages/Ristorante'))
const MenuPubblico = lazyRiprova(() => import('@/pages/MenuPubblico'))
const ComandApp = lazyRiprova(() => import('@/pages/ComandApp'))
const AdminApp = lazyRiprova(() => import('@/pages/AdminApp'))
const Costi = lazyRiprova(() => import('@/pages/Costi'))
const ContoEconomico = lazyRiprova(() => import('@/pages/ContoEconomico'))
const Personale = lazyRiprova(() => import('@/pages/Personale'))
const Eventi = lazyRiprova(() => import('@/pages/Eventi'))
const Sito = lazyRiprova(() => import('@/pages/Sito'))
const SitoAnteprima = lazyRiprova(() => import('@/pages/SitoAnteprima'))
const Impostazioni = lazyRiprova(() => import('@/pages/Impostazioni'))
const NonTrovata = lazyRiprova(() => import('@/pages/NonTrovata'))

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
      // L'assistente vocale ora vive dentro Ristorante → Menu
      { path: 'assistente-vocale', element: <Navigate to="/ristorante?tab=menu" replace /> },
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
  // Menu pubblico multilingua (QR sui tavoli)
  { path: '/menu', element: s(<MenuPubblico />) },
  // ComandApp: app del bagnante per ordinare dall'ombrellone
  { path: '/comandapp', element: s(<ComandApp />) },
  // App del gestore: prenotazioni ristorante da confermare + menu a voce
  { path: '/adminapp', element: s(<AdminApp />) },
])
