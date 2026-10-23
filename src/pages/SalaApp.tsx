/**
 * App di sala (rotta pubblica `/salaapp`, telefono e tablet): le comande del ristorante fuori dal gestionale.
 * Si entra con l'utente dello staff; servono il modulo `sala` attivo e il permesso. Tre schede in basso:
 * Cameriere, Cucina e Tablet self (stessi componenti della pagina Comande sala, dati condivisi).
 */
import { useEffect, useState } from 'react'
import { ChefHat, ConciergeBell, LogOut, Tablet } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { useSessione } from '@/context/SessioneContext'
import { useModuli } from '@/context/ModuliContext'
import { LoginGestore } from '@/components/LoginGestore'
import PulsanteInstalla from '@/components/PulsanteInstalla'
import { config } from '@/data/config'
import { impostaManifest } from '@/lib/notifichePush'
import { sbloccaAudio } from '@/lib/suoni'
import { supabaseAttivo } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import Cameriere from './sala/Cameriere'
import Cucina from './sala/Cucina'
import AvvioSelf, { leggiSelf, type StatoSelf } from './sala/AvvioSelf'
import TabletSelf from './sala/TabletSelf'

type Scheda = 'cameriere' | 'cucina' | 'self'
const CHIAVE_SCHEDA = 'salaapp.scheda.v1'
const leggiScheda = (): Scheda => {
  try { const v = localStorage.getItem(CHIAVE_SCHEDA); return v === 'cucina' || v === 'self' ? v : 'cameriere' } catch { return 'cameriere' }
}

export default function SalaApp() {
  const { profilo, esci, puo } = useSessione()
  const { moduloAttivo } = useModuli()
  useEffect(() => { impostaManifest('sala.webmanifest', 'sala-icon-192.png', 'BeachIn Sala') }, [])
  const ammesso = moduloAttivo('sala') && puo('sala', 1)
  return (
    <div className="min-h-screen bg-calce text-profondo">
      <header className="sticky top-0 z-20 bg-[#0E2A22] px-4 py-3 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="font-display text-xl font-semibold leading-none">BeachIn Sala</p>
            <p className="text-[11px] text-white/60">{config.nome} · {supabaseAttivo ? 'dati condivisi (Supabase)' : 'modalità demo locale'}</p>
          </div>
          {profilo && <button onClick={() => void esci()} className="grid h-9 w-9 place-content-center rounded-full hover:bg-white/10" aria-label="Esci"><LogOut className="h-4 w-4" /></button>}
        </div>
      </header>
      {!profilo ? (
        <main className="px-4 py-4"><PulsanteInstalla nome="BeachIn Sala" icona="sala-icon-192.png" perche="per prendere le comande e seguire la cucina" /><LoginGestore onEntra={sbloccaAudio} /></main>
      ) : !ammesso ? (
        <main className="mx-auto max-w-md px-4 py-10 text-center text-sm text-profondo/70">
          {moduloAttivo('sala') ? 'Il tuo ruolo non ha accesso alle comande del ristorante.' : 'Il modulo Comande ristorante non è attivo (Impostazioni → Moduli e piano).'}
        </main>
      ) : <Area />}
    </div>
  )
}

function Area() {
  const { comandeSala } = useDemoData()
  const [scheda, setScheda] = useState<Scheda>(leggiScheda)
  const [self, setSelf] = useState<StatoSelf | null>(leggiSelf)
  const vai = (s: Scheda) => { setScheda(s); try { localStorage.setItem(CHIAVE_SCHEDA, s) } catch { /* */ } window.scrollTo(0, 0) }
  const daFare = comandeSala.filter((c) => c.stato === 'inviata').length

  if (self) return <TabletSelf stato={self} onEsci={() => setSelf(null)} />

  const voci: { id: Scheda; etichetta: string; icona: typeof ChefHat; badge?: number }[] = [
    { id: 'cameriere', etichetta: 'Cameriere', icona: ConciergeBell },
    { id: 'cucina', etichetta: 'Cucina', icona: ChefHat, badge: daFare },
    { id: 'self', etichetta: 'Tablet self', icona: Tablet },
  ]
  return (
    <>
      {/* spazio in fondo per la barra delle schede (e la barra comanda del cameriere sopra) */}
      <main className={cn('mx-auto max-w-6xl px-3 py-3 sm:px-4', scheda === 'cameriere' ? 'pb-40 lg:pb-24' : 'pb-24')}>
        {scheda === 'cameriere' && <Cameriere app />}
        {scheda === 'cucina' && <Cucina />}
        {scheda === 'self' && <AvvioSelf onAvvia={setSelf} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-calce-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-3">
          {voci.map((v) => (
            <button key={v.id} type="button" onClick={() => vai(v.id)}
              className={cn('relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', scheda === v.id ? 'text-[#0E2A22]' : 'text-profondo/45')}>
              <v.icona className="h-5 w-5" />
              {v.etichetta}
              {!!v.badge && <span className="absolute right-[calc(50%-1.6rem)] top-1 grid h-4 min-w-4 place-content-center rounded-full bg-boa px-1 text-[10px] text-white">{v.badge}</span>}
              {scheda === v.id && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-[#D9B66A]" />}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
