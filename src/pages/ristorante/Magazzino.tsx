import { useState } from 'react'
import { AlertTriangle, Minus, Plus, Trash2, Package } from 'lucide-react'
import type { ArticoloMagazzino, CategoriaMagazzino } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { euro, euroCent } from '@/lib/formatters'
import { cn } from '@/lib/cn'

const categorie: Record<CategoriaMagazzino, string> = {
  pesce: 'Pesce', carne: 'Carne', verdura: 'Frutta e verdura', latticini: 'Latticini', secco: 'Dispensa', bevande: 'Bevande', altro: 'Altro',
}
const passo = (a: ArticoloMagazzino) => (a.unita === 'pz' ? 1 : 0.5)
const fmt = (a: ArticoloMagazzino, v: number) => `${v.toLocaleString('it-IT')} ${a.unita}`

/** Sottosezione Magazzino: scorte della cucina, carico/scarico e articoli sotto scorta. */
export function Magazzino() {
  const { magazzino, movimentaArticolo, aggiungiArticolo, rimuoviArticolo } = useDemoData()
  const [filtro, setFiltro] = useState<CategoriaMagazzino | 'tutte' | 'sotto'>('tutte')
  const sotto = magazzino.filter((a) => a.quantita < a.scortaMinima)
  const valore = magazzino.reduce((s, a) => s + a.quantita * a.costoUnitario, 0)
  const lista = magazzino.filter((a) => (filtro === 'tutte' ? true : filtro === 'sotto' ? a.quantita < a.scortaMinima : a.categoria === filtro))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card><CardBody><p className="text-xs text-profondo/55">Articoli</p><p className="num text-2xl font-bold text-profondo">{magazzino.length}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs text-profondo/55">Valore in magazzino</p><p className="num text-2xl font-bold text-profondo">{euro(valore)}</p></CardBody></Card>
        <Card className={cn(sotto.length && 'ring-1 ring-boa/40')}><CardBody><p className="flex items-center gap-1 text-xs text-profondo/55"><AlertTriangle className="h-3.5 w-3.5 text-boa" /> Da riordinare</p><p className="num text-2xl font-bold text-boa">{sotto.length}</p></CardBody></Card>
      </div>

      <Card>
        <CardHeader
          titolo={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-cabina" /> Scorte cucina</span>}
          sottotitolo="+ carico merce · − scarico/consumo"
          azione={
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="h-9 rounded-lg border border-calce-200 bg-white px-2 text-sm">
              <option value="tutte">Tutte le categorie</option>
              <option value="sotto">Solo sotto scorta</option>
              {Object.entries(categorie).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          }
        />
        <CardBody className="overflow-x-auto px-2 pt-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-calce-200 text-left text-[11px] uppercase tracking-wide text-profondo/45">
              <th className="px-2 py-2">Articolo</th><th className="px-2">Categoria</th><th className="px-2 text-right">Scorta</th><th className="px-2 text-right">Minimo</th><th className="px-2 text-right">Costo</th><th className="px-2 text-center">Movimenta</th><th />
            </tr></thead>
            <tbody>
              {lista.map((a) => {
                const basso = a.quantita < a.scortaMinima
                return (
                  <tr key={a.id} className="border-b border-calce-200/70 last:border-0">
                    <td className="px-2 py-2"><p className="font-medium text-profondo">{a.nome}</p>{a.fornitore && <p className="text-xs text-profondo/45">{a.fornitore}</p>}</td>
                    <td className="px-2 text-profondo/60">{categorie[a.categoria]}</td>
                    <td className="num px-2 text-right font-semibold">{basso ? <Badge tono="boa">{fmt(a, a.quantita)}</Badge> : fmt(a, a.quantita)}</td>
                    <td className="num px-2 text-right text-profondo/55">{fmt(a, a.scortaMinima)}</td>
                    <td className="num px-2 text-right text-profondo/55">{euroCent(a.costoUnitario)}/{a.unita}</td>
                    <td className="px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => movimentaArticolo(a.id, -passo(a))} className="grid h-7 w-7 place-items-center rounded-md border border-calce-200 hover:bg-calce/60" aria-label="Scarico"><Minus className="h-3.5 w-3.5" /></button>
                        <button onClick={() => movimentaArticolo(a.id, passo(a))} className="grid h-7 w-7 place-items-center rounded-md border border-calce-200 hover:bg-calce/60" aria-label="Carico"><Plus className="h-3.5 w-3.5" /></button>
                        {basso && <button onClick={() => movimentaArticolo(a.id, a.scortaMinima * 2 - a.quantita)} className="ml-1 rounded-md bg-profondo px-2 py-1 text-xs font-semibold text-white">Riordina</button>}
                      </div>
                    </td>
                    <td className="px-2 text-right"><button onClick={() => rimuoviArticolo(a.id)} className="text-profondo/30 hover:text-boa" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <NuovoArticolo onCrea={aggiungiArticolo} />
        </CardBody>
      </Card>
    </div>
  )
}

function NuovoArticolo({ onCrea }: { onCrea: (a: Omit<ArticoloMagazzino, 'id'>) => void }) {
  const vuoto = { nome: '', categoria: 'pesce' as CategoriaMagazzino, unita: 'kg' as ArticoloMagazzino['unita'], quantita: '', scortaMinima: '', costoUnitario: '' }
  const [f, setF] = useState(vuoto)
  const inp = 'h-9 rounded-lg border border-calce-200 bg-white px-2 text-sm'
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2 border-t border-calce-200 pt-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!f.nome.trim()) return
        onCrea({ nome: f.nome.trim(), categoria: f.categoria, unita: f.unita, quantita: Number(f.quantita) || 0, scortaMinima: Number(f.scortaMinima) || 0, costoUnitario: Number(f.costoUnitario) || 0 })
        setF(vuoto)
      }}
    >
      <input className={cn(inp, 'min-w-40 flex-1')} placeholder="Nuovo articolo" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <select className={inp} value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value as CategoriaMagazzino })}>{Object.entries(categorie).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select className={inp} value={f.unita} onChange={(e) => setF({ ...f, unita: e.target.value as ArticoloMagazzino['unita'] })}><option value="kg">kg</option><option value="l">l</option><option value="pz">pz</option></select>
      <input className={cn(inp, 'w-20')} type="number" step="any" placeholder="Qtà" value={f.quantita} onChange={(e) => setF({ ...f, quantita: e.target.value })} />
      <input className={cn(inp, 'w-20')} type="number" step="any" placeholder="Min." value={f.scortaMinima} onChange={(e) => setF({ ...f, scortaMinima: e.target.value })} />
      <input className={cn(inp, 'w-24')} type="number" step="any" placeholder="€/unità" value={f.costoUnitario} onChange={(e) => setF({ ...f, costoUnitario: e.target.value })} />
      <Button type="submit" variante="primario"><Plus className="h-4 w-4" /> Aggiungi</Button>
    </form>
  )
}
