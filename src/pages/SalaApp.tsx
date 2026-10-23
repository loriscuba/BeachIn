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

export default function SalaApp() {
  const { profilo, esci, puo } = useSessione()
  const { moduloAttivo } = useModuli()
  useEffect(() => { impostaManifest('sala.webmanifest', 'sala-icon-192.png', 'BeachIn Sala') }, [])
  const ammesso = moduloAttivo('sala') && puo('sala', 1)
  return (
    <div className="min-h-screen overflow-x-hidden bg-calce text-profondo">
      <header className="sticky top-0 z-20 bg-[#0E2A22] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow">
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
  // a ogni apertura si sceglie la funzione (un telefono fa da cameriere, un tablet da cucina o da self)
  const [scheda, setScheda] = useState<Scheda | null>(null)
  const [self, setSelf] = useState<StatoSelf | null>(leggiSelf)
  const vai = (s: Scheda) => { setScheda(s); window.scrollTo(0, 0) }
  const daFare = comandeSala.filter((c) => c.stato === 'inviata').length

  if (self) return <TabletSelf stato={self} onEsci={() => setSelf(null)} />

  const voci: { id: Scheda; etichetta: string; icona: typeof ChefHat; badge?: number }[] = [
    { id: 'cameriere', etichetta: 'Cameriere', icona: ConciergeBell },
    { id: 'cucina', etichetta: 'Cucina', icona: ChefHat, badge: daFare },
    { id: 'self', etichetta: 'Tablet self', icona: Tablet },
  ]
  if (!scheda) return <SceltaFunzione onScegli={vai} daFare={daFare} />
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

const FUNZIONI: { id: Scheda; titolo: string; testo: string; icona: typeof ChefHat; colore: string }[] = [
  { id: 'cameriere', titolo: 'Cameriere', testo: 'Prendi le comande al tavolo e mandale in cucina', icona: ConciergeBell, colore: 'from-profondo to-cabina' },
  { id: 'cucina', titolo: 'Cucina', testo: 'Vedi le comande in arrivo e segna i piatti pronti', icona: ChefHat, colore: 'from-[#B8401F] to-boa' },
  { id: 'self', titolo: 'Tablet self', testo: 'Lascia il tablet al tavolo: il cliente ordina da solo', icona: Tablet, colore: 'from-[#0E2A22] to-[#2F5D4C]' },
]

/** Schermata d'apertura: quale funzione fa questo dispositivo. */
function SceltaFunzione({ onScegli, daFare }: { onScegli: (s: Scheda) => void; daFare: number }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-2xl font-semibold text-profondo">Cosa fai con questo dispositivo?</h1>
      <p className="mt-1 text-sm text-profondo/60">Puoi cambiare quando vuoi dalla barra in basso.</p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FUNZIONI.map((f) => (
          <button key={f.id} type="button" onClick={() => onScegli(f.id)}
            className={cn('relative flex items-center gap-4 rounded-2xl bg-gradient-to-br p-5 text-left text-white shadow-md active:scale-[0.98] sm:flex-col sm:items-start', f.colore)}>
            <span className="grid h-12 w-12 shrink-0 place-content-center rounded-xl bg-white/15"><f.icona className="h-6 w-6" /></span>
            <span className="min-w-0">
              <span className="block font-display text-xl font-semibold">{f.titolo}</span>
              <span className="block text-sm text-white/75">{f.testo}</span>
            </span>
            {f.id === 'cucina' && daFare > 0 && <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-boa">{daFare} da fare</span>}
          </button>
        ))}
      </div>
    </main>
  )
}
