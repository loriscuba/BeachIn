/**
 * Avvio della modalità self: si sceglie il tavolo, il menu (uno solo: Ristorante, Bar o Lavagnetta) e un PIN di 4 cifre,
 * poi il tablet resta bloccato
 * sul menu del cliente (anche ricaricando la pagina) finché il personale non lo sblocca col PIN.
 */
import { useMemo, useState } from 'react'
import { Lock, Tablet } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { config } from '@/data/config'
import { cn } from '@/lib/cn'

/** Menu del tablet: uno solo per tablet. Lavagnetta = proposte del giorno, ogni voce va in cucina o al bar. */
export type MenuSelf = 'ristorante' | 'bar' | 'lavagnetta'
export const MENU_SELF: { id: MenuSelf; nome: string; testo: string }[] = [
  { id: 'ristorante', nome: 'Ristorante', testo: 'Il menu del Ristorante, va in cucina' },
  { id: 'bar', nome: 'Bar', testo: 'Il listino del Bar, va al bar' },
  { id: 'lavagnetta', nome: 'Lavagnetta', testo: 'Le proposte del giorno (cucina o bar per voce)' },
]
/** `menu` assente (tablet avviati prima) = Ristorante. */
export interface StatoSelf { tavolo: number; pin: string; menu?: MenuSelf }
const CHIAVE = 'beachin.self.v1'

export function leggiSelf(): StatoSelf | null {
  try { const v = JSON.parse(localStorage.getItem(CHIAVE) ?? 'null'); return v?.tavolo ? v as StatoSelf : null } catch { return null }
}
export function salvaSelf(v: StatoSelf | null) {
  try { if (v) localStorage.setItem(CHIAVE, JSON.stringify(v)); else localStorage.removeItem(CHIAVE) } catch { /* storage non disponibile */ }
}

export default function AvvioSelf({ onAvvia }: { onAvvia: (v: StatoSelf) => void }) {
  const { tavoliDelGiorno } = useDemoData()
  const tavoli = useMemo(() => [...tavoliDelGiorno(config.oggi)].sort((a, b) => a.numero - b.numero), [tavoliDelGiorno])
  const [tavolo, setTavolo] = useState<number | null>(null)
  const [pin, setPin] = useState('')
  const conBar = useModuli().moduloAttivo('bar-tavolo')
  const menu = MENU_SELF.filter((m) => m.id !== 'bar' || conBar)
  const [scelto, setScelto] = useState<MenuSelf>('ristorante')
  const ok = tavolo != null && /^\d{4}$/.test(pin)

  const avvia = () => {
    if (!ok) return
    const v = { tavolo: tavolo!, pin, menu: scelto }
    salvaSelf(v)
    document.documentElement.requestFullscreen?.().catch(() => { /* non supportato (es. iPhone) */ })
    onAvvia(v)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader
        titolo={<span className="inline-flex items-center gap-2"><Tablet className="h-4 w-4 text-cabina" /> Tablet self al tavolo</span>}
        sottotitolo="Il cliente sfoglia il menu con foto e descrizioni e ordina da solo: la comanda arriva in cucina o al bar."
      />
      <CardBody className="space-y-4 pt-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-profondo/60">1. Tavolo dove lasci il tablet</p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
            {tavoli.map((t) => (
              <button key={t.id} type="button" onClick={() => setTavolo(t.numero)}
                className={cn('num h-11 rounded-xl border text-base font-bold', tavolo === t.numero ? 'border-cabina bg-cabina text-white' : 'border-calce-200 text-profondo hover:border-cabina')}>
                {t.numero}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-profondo/60">2. Menu del tablet</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {menu.map((m) => (
              <button key={m.id} type="button" onClick={() => setScelto(m.id)}
                className={cn('rounded-xl border p-3 text-left', scelto === m.id ? 'border-cabina bg-cabina/10' : 'border-calce-200 hover:border-cabina')}>
                <span className="block font-semibold text-profondo">{m.nome}</span>
                <span className="block text-xs text-profondo/55">{m.testo}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-profondo/60">3. PIN di 4 cifre per sbloccare il tablet (lo sa solo il personale)</span>
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" placeholder="••••"
            className="num h-11 w-32 rounded-lg border border-calce-200 bg-white px-3 text-center text-lg tracking-[0.5em] text-profondo focus-visible:focus-ring" />
        </label>
        <Button variante="primario" dimensione="lg" disabled={!ok} onClick={avvia}><Lock className="h-4 w-4" /> Avvia il menu self</Button>
        <p className="text-xs text-profondo/55">Il tablet resta sul menu anche se si ricarica la pagina. Per uscire: lucchetto in alto a destra e PIN.</p>
      </CardBody>
    </Card>
  )
}
