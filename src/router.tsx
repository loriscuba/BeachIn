import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

import Cruscotto from '@/pages/Cruscotto'
import Arenile from '@/pages/Arenile'
import Clienti from '@/pages/Clienti'
import Tariffe from '@/pages/Tariffe'
import Bar from '@/pages/Bar'
import Ristorante from '@/pages/Ristorante'
import Costi from '@/pages/Costi'
import ContoEconomico from '@/pages/ContoEconomico'
import Personale from '@/pages/Personale'
import Eventi from '@/pages/Eventi'
import Sito from '@/pages/Sito'
import SitoAnteprima from '@/pages/SitoAnteprima'
import Impostazioni from '@/pages/Impostazioni'
import NonTrovata from '@/pages/NonTrovata'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Cruscotto /> },
      { path: 'arenile', element: <Arenile /> },
      { path: 'clienti', element: <Clienti /> },
      { path: 'tariffe', element: <Tariffe /> },
      { path: 'bar', element: <Bar /> },
      { path: 'ristorante', element: <Ristorante /> },
      { path: 'costi', element: <Costi /> },
      { path: 'conto-economico', element: <ContoEconomico /> },
      { path: 'personale', element: <Personale /> },
      { path: 'eventi', element: <Eventi /> },
      { path: 'sito', element: <Sito /> },
      { path: 'impostazioni', element: <Impostazioni /> },
      { path: '*', element: <NonTrovata /> },
    ],
  },
  // Vetrina pubblica, fuori dallo shell gestionale
  { path: '/sito/anteprima', element: <SitoAnteprima /> },
])
