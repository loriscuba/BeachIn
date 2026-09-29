import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { DemoPlayer } from '@/components/demo/DemoPlayer'
import { navigazione } from '@/config/navigazione'
import { config } from '@/data/config'

/** Sottotitoli per pagina mostrati nella topbar. */
const sottotitoli: Record<string, string> = {
  '/': `Stagione ${config.stagione.anno} · panoramica dei moduli attivi`,
  '/cruscotto': `Stagione ${config.stagione.anno} · KPI di tutta la struttura`,
  '/assistente-vocale': 'Modifica il menù del ristorante a voce',
  '/arenile': `${config.arenile.postazioniTotali} postazioni · ${config.arenile.file.length} file`,
  '/clienti': 'Anagrafiche, storico e saldi',
  '/comande': 'Ordini al bar dagli ombrelloni',
  '/tariffe': 'Listini per periodo, fila e tipologia',
  '/bar': 'Vendite, listino e conti aperti',
  '/ristorante': 'Prenotazioni, coperti e menù',
  '/costi': 'Tutte le voci di spesa dello stabilimento',
  '/conto-economico': 'Ricavi e costi per centro',
  '/personale': 'Organico, turni e costo del lavoro',
  '/eventi': 'Calendario e conto degli eventi',
  '/sito': 'Gestione del sito e prenotazioni online',
  '/impostazioni': 'Anagrafica, arenile, utenti e ruoli',
}

const CHIAVE_MENU = 'beachin.menu.v1'

export function AppShell() {
  // Menu laterale a scomparsa: su telefono parte chiuso; su desktop si ricorda la scelta.
  const [menuAperto, setMenuAperto] = useState(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return false
    try { return localStorage.getItem(CHIAVE_MENU) !== 'chiuso' } catch { return true }
  })
  const impostaMenu = (aperto: boolean) => {
    setMenuAperto(aperto)
    if (window.matchMedia('(min-width: 1024px)').matches) {
      try { localStorage.setItem(CHIAVE_MENU, aperto ? 'aperto' : 'chiuso') } catch { /* storage non disponibile */ }
    }
  }
  const { pathname } = useLocation()

  const voce = navigazione.find((v) =>
    v.percorso === '/' ? pathname === '/' : pathname.startsWith(v.percorso)
  )
  const titolo = voce?.etichetta ?? 'BeachIn'
  const sottotitolo = sottotitoli[voce?.percorso ?? ''] ?? undefined

  return (
    <div className="flex h-screen overflow-hidden bg-calce">
      <Sidebar aperta={menuAperto} onChiudi={() => impostaMenu(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          titolo={titolo}
          sottotitolo={sottotitolo}
          onApriMenu={() => impostaMenu(!menuAperto)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <DemoPlayer />
    </div>
  )
}
