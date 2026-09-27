import { useState } from 'react'
import { ArrowUp, ArrowDown, Trash2, Plus, Camera, X, Loader2 } from 'lucide-react'
import type { LinguaMenu } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { ridimensionaImmagine } from '@/lib/immagini'
import { euroCent } from '@/lib/formatters'
import { cn } from '@/lib/cn'

const campo = 'h-8 rounded-md border border-calce-200 bg-white px-2 text-sm text-profondo focus-visible:focus-ring'

/** Testo che diventa un campo al click: Invio/uscita salva, Esc annulla. */
function Modificabile({ valore, mostra, onSalva, className, titolo }: {
  valore: string; mostra?: React.ReactNode; onSalva: (v: string) => void; className?: string; titolo: string
}) {
  const [testo, setTesto] = useState<string>()
  if (testo === undefined) {
    return <button type="button" onClick={() => setTesto(valore)} title={titolo} className={cn('rounded text-left hover:bg-calce/70 hover:text-cabina', className)}>{mostra ?? (valore || '—')}</button>
  }
  const salva = () => { const v = testo.trim(); if (v && v !== valore) onSalva(v); setTesto(undefined) }
  return (
    <input autoFocus value={testo} onChange={(e) => setTesto(e.target.value)} onBlur={salva}
      onKeyDown={(e) => { if (e.key === 'Enter') salva(); if (e.key === 'Escape') setTesto(undefined) }}
      className={cn(campo, 'w-full', className)} />
  )
}

const prezzoDa = (v: string) => { const n = Number(v.replace(',', '.').replace('€', '').trim()); return n > 0 ? Math.round(n * 100) / 100 : null }

/** Menu diviso per sezioni, tutto modificabile: sezioni (nome, ordine, aggiungi/elimina), piatti (nome, prezzo, sezione, foto), traduzioni. */
export function EditorMenu({ lingua }: { lingua: Exclude<LinguaMenu, 'it'> }) {
  const {
    menu, sezioniMenu, aggiungiPiatto, rimuoviPiatto, rinominaPiatto, modificaPiatto, impostaTraduzione,
    aggiungiSezione, rinominaSezione, rimuoviSezione, spostaSezione,
  } = useDemoData()
  const [nuovi, setNuovi] = useState<Record<string, { nome: string; prezzo: string }>>({})
  const [nuovaSez, setNuovaSez] = useState('')

  const caricaFoto = async (id: string, file?: File) => {
    if (file) modificaPiatto(id, { foto: await ridimensionaImmagine(file, 480, 0.8) })
  }
  const aggiungi = (sez: string) => {
    const n = nuovi[sez]
    if (!n?.nome.trim()) return
    aggiungiPiatto(n.nome, prezzoDa(n.prezzo), sez)
    setNuovi((m) => ({ ...m, [sez]: { nome: '', prezzo: '' } }))
  }

  return (
    <div className="space-y-5">
      {sezioniMenu.map((s, i) => {
        const piatti = menu.filter((p) => p.categoria === s.id)
        const n = nuovi[s.id] ?? { nome: '', prezzo: '' }
        return (
          <section key={s.id}>
            <div className="mb-1 flex items-center gap-1 border-b-2 border-tenda pb-1">
              <Modificabile valore={s.nome} onSalva={(v) => rinominaSezione(s.id, v)} titolo="Rinomina sezione" className="flex-1 font-display text-lg font-semibold text-profondo" />
              <span className="text-xs text-profondo/45">{piatti.length}</span>
              <button type="button" disabled={i === 0} onClick={() => spostaSezione(s.id, -1)} className="grid h-7 w-7 place-content-center rounded text-profondo/50 hover:bg-calce disabled:opacity-25" aria-label="Sposta su"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" disabled={i === sezioniMenu.length - 1} onClick={() => spostaSezione(s.id, 1)} className="grid h-7 w-7 place-content-center rounded text-profondo/50 hover:bg-calce disabled:opacity-25" aria-label="Sposta giù"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => { if (!piatti.length || confirm(`Eliminare la sezione «${s.nome}» e i suoi ${piatti.length} piatti?`)) rimuoviSezione(s.id) }} className="grid h-7 w-7 place-content-center rounded text-boa/70 hover:bg-boa/10" aria-label="Elimina sezione" title="Elimina sezione"><Trash2 className="h-4 w-4" /></button>
            </div>
            <ul className="divide-y divide-calce-200 text-sm">
              {piatti.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-1.5">
                  <label className="group relative grid h-11 w-11 shrink-0 cursor-pointer place-content-center overflow-hidden rounded-lg border border-dashed border-calce-300 bg-calce/40 text-profondo/40 hover:border-cabina" title={p.foto ? 'Cambia foto' : 'Carica foto'}>
                    {p.foto ? <img src={p.foto} alt="" className="h-full w-full object-cover" /> : <Camera className="h-4 w-4" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { caricaFoto(p.id, e.target.files?.[0]); e.target.value = '' }} />
                    {p.foto && (
                      <button type="button" onClick={(e) => { e.preventDefault(); modificaPiatto(p.id, { foto: undefined }) }} className="absolute right-0 top-0 hidden h-4 w-4 place-content-center rounded-bl bg-boa text-white group-hover:grid" aria-label="Togli foto"><X className="h-3 w-3" /></button>
                    )}
                  </label>
                  <div className="min-w-0 flex-1">
                    <Modificabile valore={p.nome} onSalva={(v) => rinominaPiatto(p.id, v)} titolo="Rinomina piatto" className="block w-full truncate font-medium text-profondo" />
                    <Modificabile
                      valore={p.traduzioni?.[lingua] ?? ''}
                      mostra={p.traduzioni?.[lingua] ?? (p.traduzioni ? <span className="inline-flex items-center gap-1 text-tenda"><Loader2 className="h-3 w-3 animate-spin" /> in traduzione</span> : '—')}
                      onSalva={(v) => impostaTraduzione(p.id, lingua, v)} titolo="Correggi traduzione"
                      className="block w-full truncate text-xs text-profondo/55"
                    />
                  </div>
                  <select value={p.categoria} onChange={(e) => modificaPiatto(p.id, { categoria: e.target.value })} className={cn(campo, 'hidden w-28 px-1 text-xs sm:block')} title="Sposta in un'altra sezione">
                    {sezioniMenu.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </select>
                  <Modificabile valore={String(p.prezzo || '')} mostra={p.prezzo ? euroCent(p.prezzo) : '—'} onSalva={(v) => { const x = prezzoDa(v); if (x) modificaPiatto(p.id, { prezzo: x }) }} titolo="Modifica prezzo" className="num w-20 shrink-0 text-right font-semibold text-profondo" />
                  <button type="button" onClick={() => rimuoviPiatto(p.id)} className="grid h-7 w-7 shrink-0 place-content-center rounded text-profondo/35 hover:bg-boa/10 hover:text-boa" aria-label="Elimina piatto" title="Elimina piatto"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
            <form className="mt-1.5 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); aggiungi(s.id) }}>
              <input value={n.nome} onChange={(e) => setNuovi((m) => ({ ...m, [s.id]: { ...n, nome: e.target.value } }))} placeholder={`Nuovo piatto in ${s.nome}`} className={cn(campo, 'min-w-0 flex-1')} />
              <input value={n.prezzo} onChange={(e) => setNuovi((m) => ({ ...m, [s.id]: { ...n, prezzo: e.target.value } }))} placeholder="€" inputMode="decimal" className={cn(campo, 'num w-16 text-right')} />
              <button className="grid h-8 w-8 place-content-center rounded-md bg-cabina text-white hover:bg-profondo" aria-label="Aggiungi piatto"><Plus className="h-4 w-4" /></button>
            </form>
          </section>
        )
      })}
      <form className="flex gap-1.5 rounded-lg border border-dashed border-calce-300 p-2" onSubmit={(e) => { e.preventDefault(); if (nuovaSez.trim()) { aggiungiSezione(nuovaSez); setNuovaSez('') } }}>
        <input value={nuovaSez} onChange={(e) => setNuovaSez(e.target.value)} placeholder="Nuova sezione (es. Contorni, Vini, Menu bimbi…)" className={cn(campo, 'min-w-0 flex-1')} />
        <button className="inline-flex h-8 items-center gap-1 rounded-md bg-profondo px-3 text-sm text-white"><Plus className="h-4 w-4" /> Sezione</button>
      </form>
    </div>
  )
}
