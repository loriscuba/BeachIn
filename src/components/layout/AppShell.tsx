import { AnteprimaWhatsApp } from '@/components/AnteprimaWhatsApp'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BarraRapida } from './BarraRapida'
import { MenuGriglia } from './MenuGriglia'
import { useSchedeRapide } from '@/hooks/useNavStaff'
import { attivaCacheApp, impostaManifest } from '@/lib/notifichePush'
import { precaricaPagine } from '@/lib/precarica'
import { Topbar } from './Topbar'
import { DemoPlayer } from '@/components/demo/DemoPlayer'
import { navigazione } from '@/config/navigazione'
import { config } from '@/data/config'
import { useTema } from '@/hooks/useTema'
import { accento } from '@/config/accenti'
import { LoginGestore } from '@/components/LoginGestore'
import { useSessione } from '@/context/SessioneContext'
import { Caricamento } from '@/components/ui/Caricamento'
import PulsanteInstalla from '@/components/PulsanteInstalla'

/** Sottotitoli per pagina mostrati nella topbar. */
const sottotitoli: Record<string, string> = {
  '/': `Stagione ${config.stagione.anno} · panoramica dei moduli attivi`,
  '/cruscotto': `Stagione ${config.stagione.anno} · KPI di tutta la struttura`,
  '/assistente-vocale': 'Modifica il menù del ristorante a voce',
  '/arenile': `${config.arenile.postazioniTotali} postazioni · ${config.arenile.file.length} file`,
  '/clienti': 'Anagrafiche, storico e saldi',
  '/comande': 'Ordini al bar dagli ombrelloni',
  '/sala': 'Comande dal tavolo alla cucina',
  '/tariffe': 'Listini per periodo, fila e tipologia',
  '/bar': 'Vendite, listino e conti aperti',
  '/ristorante': 'Prenotazioni, coperti e menù',
  '/costi': 'Tutte le voci di spesa dello stabilimento',
  '/conto-economico': 'Ricavi e costi per centro',
  '/personale': 'Organico, turni e costo del lavoro',
  '/eventi': 'Calendario e conto degli eventi',
  '/sito': 'Gestione del sito e prenotazioni online',
  '/impostazioni': 'Anagrafica, arenile, utenti e ruoli',
  '/prenotazioni': 'Richieste dal sito, tavoli di oggi, menu a voce',
}

/** Pagine dell'app staff che non sono voci del menu laterale. */
const altrePagine: Record<string, string> = { '/prenotazioni': 'Prenotazioni' }

const CHIAVE_MENU = 'beachin.menu.v1'

/**
 * App staff unica (gestionale, prenotazioni, sala, cucina, bar), accessibile dopo l'accesso dello staff.
 * Si adatta al dispositivo: telefono con barra in basso, tablet con colonna stretta, PC con il menu completo.
 * Le schede rapide dipendono dal ruolo (`useSchedeRapide`).
 */
export function AppShell() {
  const { profilo, caricamento, esci } = useSessione()
  // una sola app da installare (manifest unico) e apertura istantanea con la cache del service worker
  useEffect(() => { impostaManifest('staff.webmanifest', 'admin-icon-192.png', 'BeachIn'); attivaCacheApp() }, [])
  if (caricamento) return <Caricamento />
  if (!profilo) {
    return (
      <div className="grid min-h-screen place-items-center bg-calce px-4">
        <div className="w-full max-w-md">
          <p className="text-center font-display text-3xl font-semibold text-profondo">BeachIn</p>
          <p className="text-center text-sm text-profondo/60">{config.nome} · app dello staff</p>
          <LoginGestore />
        </div>
      </div>
    )
  }
  return <Gestionale onEsci={() => { void esci() }} />
}

function Gestionale({ onEsci }: { onEsci: () => void }) {
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
  const [tema] = useTema()
  const schede = useSchedeRapide()
  const [griglia, setGriglia] = useState(false)
  // a riposo il telefono scarica in anticipo le pagine delle schede del ruolo: il primo tocco è immediato
  useEffect(() => precaricaPagine(schede.map((s) => s.percorso)), [schede.map((s) => s.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps

  const voce = navigazione.find((v) =>
    v.percorso === '/' ? pathname === '/' : pathname.startsWith(v.percorso)
  )
  // pagine raggiungibili solo da un sottomenu (es. Comande sotto Bar)
  const figlio = voce ? undefined : navigazione.flatMap((v) => v.figli ?? []).find((f) => f.percorso === pathname)
  const titolo = voce?.etichetta ?? figlio?.etichetta ?? altrePagine[pathname] ?? 'BeachIn'
  const coloreArea = accento(figlio?.percorso ?? voce?.percorso)
  const sottotitolo = sottotitoli[voce?.percorso ?? figlio?.percorso ?? ''] ?? undefined

  // chi non gestisce (cameriere, cucina, bar) non ha la Home con i numeri: apre la sua prima scheda
  if (pathname === '/' && schede.length > 0 && schede[0].id !== 'home') return <Navigate to={schede[0].percorso} replace />

  return (
    <div className="shell-bg flex h-[100dvh] overflow-hidden" data-tema={tema} style={{ ['--accento' as string]: coloreArea }}>
      <Sidebar aperta={menuAperto} onChiudi={() => impostaMenu(false)} />
      {/* telefono: "Altro" apre la griglia di pulsanti; tablet: "Menu" apre il pannello laterale */}
      <BarraRapida onAltro={() => (window.matchMedia('(min-width: 768px)').matches ? impostaMenu(true) : setGriglia(true))} />
      <MenuGriglia aperto={griglia} onChiudi={() => setGriglia(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          titolo={titolo}
          icona={voce?.icona}
          sottotitolo={sottotitolo}
          onApriMenu={() => impostaMenu(!menuAperto)}
          onEsci={onEsci}
        />
        <main className="flex-1 overflow-y-auto">
          <div key={pathname} className="bi-pagina mx-auto max-w-[1400px] px-3 pb-[calc(1.25rem+var(--barra-basso))] pt-4 sm:px-4 md:py-5 lg:px-6 lg:py-6">
            {schede[0] && pathname === schede[0].percorso.split('?')[0] && <PulsanteInstalla nome="BeachIn" icona="admin-icon-192.png" perche="per aprire l'app dello staff con un tocco" />}
            <Outlet />
          </div>
        </main>
      </div>

      <DemoPlayer />
      <AnteprimaWhatsApp />
    </div>
  )
}
