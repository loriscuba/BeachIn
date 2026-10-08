/**
 * Gestione dei contenuti dell'app clienti (/comandapp): news e lavagnetta del giorno.
 * Usata dal gestionale (Sito → App clienti) e dall'app admin (tab "App"): layout mobile-first.
 */
import { useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Pin, PinOff, Plus, Trash2, X } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { ridimensionaImmagine } from '@/lib/immagini'
import { data as fmtData, euro, euroCent } from '@/lib/formatters'
import { cn } from '@/lib/cn'

const campo = 'h-10 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm focus-visible:focus-ring'

/** Prezzo da lavagna: senza decimali se tondo. */
export const prezzoLavagna = (p: number) => (Number.isInteger(p) ? euro(p) : euroCent(p))

export function GestioneNews() {
  const { notizie, pubblicaNotizia, modificaNotizia, eliminaNotizia } = useDemoData()
  const [f, setF] = useState({ titolo: '', testo: '', foto: '' as string | undefined, fissata: false })
  const ordinate = [...notizie].sort((a, b) => Number(!!b.fissata) - Number(!!a.fissata) || b.ts - a.ts)
  const pubblica = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.titolo.trim()) return
    pubblicaNotizia({ titolo: f.titolo.trim(), testo: f.testo.trim(), foto: f.foto || undefined, fissata: f.fissata })
    setF({ titolo: '', testo: '', foto: undefined, fissata: false })
  }
  const caricaFoto = async (file?: File) => {
    if (!file) return
    try { const uri = await ridimensionaImmagine(file, 1024); setF((p) => ({ ...p, foto: uri })) } catch { alert('Immagine non valida.') }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={pubblica} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-calce-200">
        <p className="font-semibold text-profondo">Nuova news</p>
        <input value={f.titolo} onChange={(e) => setF({ ...f, titolo: e.target.value })} placeholder="Titolo (es. Stasera musica dal vivo)" className={campo} />
        <textarea value={f.testo} onChange={(e) => setF({ ...f, testo: e.target.value })} placeholder="Testo della news" rows={3} className={cn(campo, 'h-auto py-2')} />
        {f.foto && (
          <div className="relative">
            <img src={f.foto} alt="" className="h-36 w-full rounded-lg object-cover" />
            <button type="button" onClick={() => setF({ ...f, foto: undefined })} className="absolute right-2 top-2 grid h-7 w-7 place-content-center rounded-full bg-black/50 text-white" aria-label="Togli foto"><X className="h-4 w-4" /></button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-calce px-3 text-sm font-medium text-profondo/75">
            <ImagePlus className="h-4 w-4" /> Foto
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { void caricaFoto(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <label className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-calce px-3 text-sm font-medium text-profondo/75">
            <input type="checkbox" checked={f.fissata} onChange={(e) => setF({ ...f, fissata: e.target.checked })} /> In evidenza
          </label>
          <button disabled={!f.titolo.trim()} className="ml-auto h-9 rounded-lg bg-cabina px-4 text-sm font-semibold text-white disabled:opacity-40">Pubblica</button>
        </div>
      </form>

      {ordinate.length === 0 && <p className="py-4 text-center text-sm text-profondo/50">Nessuna news pubblicata.</p>}
      {ordinate.map((n) => (
        <div key={n.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-calce-200">
          {n.foto && <img src={n.foto} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-profondo">{n.fissata && <Pin className="mr-1 inline h-3.5 w-3.5 text-boa" />}{n.titolo}</p>
            <p className="text-xs text-profondo/45">{fmtData(n.data)}</p>
            {n.testo && <p className="mt-1 line-clamp-2 text-sm text-profondo/70">{n.testo}</p>}
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button onClick={() => modificaNotizia(n.id, { fissata: !n.fissata })} className="grid h-8 w-8 place-content-center rounded-lg text-profondo/50 hover:bg-calce" aria-label={n.fissata ? 'Togli evidenza' : 'Metti in evidenza'}>
              {n.fissata ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
            <button onClick={() => { if (confirm(`Eliminare la news "${n.titolo}"?`)) eliminaNotizia(n.id) }} className="grid h-8 w-8 place-content-center rounded-lg text-boa hover:bg-boa/10" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function GestioneLavagnetta() {
  const { lavagnetta, aggiungiVoceLavagnetta, modificaVoceLavagnetta, rimuoviVoceLavagnetta, spostaVoceLavagnetta } = useDemoData()
  const [f, setF] = useState({ nome: '', descrizione: '', prezzo: '' })
  const leggiPrezzo = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && Number.isFinite(n) ? n : null }
  const aggiungi = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.nome.trim()) return
    aggiungiVoceLavagnetta({ nome: f.nome.trim(), descrizione: f.descrizione.trim() || undefined, prezzo: leggiPrezzo(f.prezzo) })
    setF({ nome: '', descrizione: '', prezzo: '' })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-calce-200">
        {lavagnetta.length === 0 && <p className="py-4 text-center text-sm text-profondo/50">Lavagnetta vuota: scrivi le proposte di oggi.</p>}
        {lavagnetta.map((v, i) => (
          <div key={v.id} className="flex items-start gap-2 border-b border-calce-200 p-2 last:border-0">
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_5rem] gap-1.5">
              <input value={v.nome} onChange={(e) => modificaVoceLavagnetta(v.id, { nome: e.target.value })} className={cn(campo, 'font-medium')} aria-label="Piatto" />
              <input key={`${v.id}-${v.prezzo}`} defaultValue={v.prezzo ?? ''} inputMode="decimal" onBlur={(e) => modificaVoceLavagnetta(v.id, { prezzo: leggiPrezzo(e.target.value) })} placeholder="€" className={cn(campo, 'num text-right')} aria-label="Prezzo" />
              <input value={v.descrizione ?? ''} onChange={(e) => modificaVoceLavagnetta(v.id, { descrizione: e.target.value || undefined })} placeholder="descrizione (facoltativa)" className={cn(campo, 'col-span-2 h-9 text-xs')} aria-label="Descrizione" />
            </div>
            <div className="flex shrink-0 flex-col">
              <button onClick={() => spostaVoceLavagnetta(v.id, -1)} disabled={i === 0} className="grid h-7 w-7 place-content-center rounded text-profondo/50 hover:bg-calce disabled:opacity-25" aria-label="Su"><ArrowUp className="h-4 w-4" /></button>
              <button onClick={() => spostaVoceLavagnetta(v.id, 1)} disabled={i === lavagnetta.length - 1} className="grid h-7 w-7 place-content-center rounded text-profondo/50 hover:bg-calce disabled:opacity-25" aria-label="Giù"><ArrowDown className="h-4 w-4" /></button>
              <button onClick={() => rimuoviVoceLavagnetta(v.id)} className="grid h-7 w-7 place-content-center rounded text-boa hover:bg-boa/10" aria-label="Cancella"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={aggiungi} className="grid grid-cols-[1fr_5rem] gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-calce-200">
        <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nuovo piatto" className={campo} />
        <input value={f.prezzo} inputMode="decimal" onChange={(e) => setF({ ...f, prezzo: e.target.value })} placeholder="€" className={cn(campo, 'text-right')} />
        <input value={f.descrizione} onChange={(e) => setF({ ...f, descrizione: e.target.value })} placeholder="descrizione (facoltativa)" className={cn(campo, 'col-span-2')} />
        <button disabled={!f.nome.trim()} className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-cabina text-sm font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Scrivi sulla lavagnetta</button>
      </form>
    </div>
  )
}
