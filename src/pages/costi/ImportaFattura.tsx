import { useMemo, useRef, useState } from 'react'
import { FileUp, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { CentroCosto, MetodoPagamento, VoceCosto } from '@/data/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useDemoData } from '@/context/DemoDataContext'
import { CATEGORIE_IMPORT, categoriaPer, leggiFattura, type DatiFattura, type RigaLetta } from '@/lib/fatturaFornitore'
import { etichetteCentro } from '@/lib/graficoColori'
import { euro, numero } from '@/lib/formatters'

const r2 = (n: number) => Math.round(n * 100) / 100
const chiaveCat = (categoria: string, sottocategoria: string) => `${categoria} › ${sottocategoria}`
const centri: CentroCosto[] = ['spiaggia', 'bar', 'ristorante', 'noleggi', 'eventi', 'struttura']

interface RigaModulo extends RigaLetta { cat: string; centro: CentroCosto }

/**
 * Importa una fattura fornitore (PDF o XML della fattura elettronica): anteprima con le righe e la categoria proposta
 * per ognuna (modificabile), poi una voce di costo per ogni categoria/centro/aliquota con le sue righe dentro.
 */
export function ImportaFattura({ aperto, onChiudi, onImportata }: { aperto: boolean; onChiudi: () => void; onImportata: (n: number) => void }) {
  const { costi, aggiungiCosti } = useDemoData()
  const inputRef = useRef<HTMLInputElement>(null)
  const [stato, setStato] = useState<'scegli' | 'lettura' | 'anteprima'>('scegli')
  const [errore, setErrore] = useState<string | null>(null)
  const [file, setFile] = useState('')
  const [dati, setDati] = useState<DatiFattura | null>(null)
  const [testa, setTesta] = useState({ fornitore: '', partitaIva: '', numero: '', data: '', scadenza: '', metodo: 'bonifico' as MetodoPagamento, pagata: false })
  const [righe, setRighe] = useState<RigaModulo[]>([])

  // categorie: quelle già usate nei costi + quelle che l'importazione sa proporre
  const opzioniCat = useMemo(() => {
    const s = new Set([...CATEGORIE_IMPORT.map((c) => chiaveCat(c.categoria, c.sottocategoria)), ...costi.map((c) => chiaveCat(c.categoria, c.sottocategoria))])
    return [...s].sort((a, b) => a.localeCompare(b, 'it')).map((v) => ({ valore: v, etichetta: v }))
  }, [costi])

  const giaImportata = useMemo(() => {
    const n = testa.numero.trim().toLowerCase()
    if (!n) return undefined
    return costi.find((c) => c.fattura && c.fattura.numero.toLowerCase() === n &&
      (c.fattura.partitaIva && testa.partitaIva ? c.fattura.partitaIva === testa.partitaIva.trim() : c.fornitore.toLowerCase() === testa.fornitore.trim().toLowerCase()))
  }, [costi, testa])

  // voci che verranno create: una per categoria + centro + aliquota
  const gruppi = useMemo(() => {
    const m = new Map<string, { cat: string; centro: CentroCosto; iva: number; righe: RigaModulo[]; imponibile: number }>()
    for (const r of righe) {
      const k = `${r.cat}|${r.centro}|${r.iva}`
      const g = m.get(k) ?? { cat: r.cat, centro: r.centro, iva: r.iva, righe: [], imponibile: 0 }
      g.righe.push(r); g.imponibile = r2(g.imponibile + r.importo)
      m.set(k, g)
    }
    return [...m.values()].sort((a, b) => b.imponibile - a.imponibile)
  }, [righe])

  const imponibile = r2(righe.reduce((s, r) => s + r.importo, 0))
  const totaleRighe = r2(righe.reduce((s, r) => s + r.importo * (1 + r.iva), 0))
  const quadra = dati?.totale == null || Math.abs(dati.totale - totaleRighe) < 0.05

  const chiudi = () => {
    setStato('scegli'); setErrore(null); setDati(null); setFile(''); setRighe([])
    onChiudi()
  }

  const leggi = async (f?: File) => {
    if (!f) return
    setErrore(null)
    if (!/\.(pdf|xml)$/i.test(f.name)) { setErrore('Scegli un file PDF o l\'XML della fattura elettronica.'); return }
    setStato('lettura'); setFile(f.name)
    try {
      const d = await leggiFattura(f)
      if (!d.righe.length) {
        setStato('scegli')
        setErrore('Non trovo le righe della fattura in questo file (serve un PDF con il testo, non una foto o una scansione).')
        return
      }
      setDati(d)
      setTesta({
        fornitore: d.fornitore ?? '', partitaIva: d.partitaIva ?? '', numero: d.numero ?? '',
        data: d.data ?? new Date().toISOString().slice(0, 10), scadenza: d.scadenza ?? d.data ?? '',
        metodo: d.metodo ?? 'bonifico', pagata: false,
      })
      setRighe(d.righe.map((r) => {
        const c = categoriaPer(r.descrizione)
        return { ...r, cat: chiaveCat(c.categoria, c.sottocategoria), centro: c.centro }
      }))
      setStato('anteprima')
    } catch (e) {
      console.error('[fattura]', e)
      setStato('scegli')
      setErrore('Non sono riuscito a leggere il file. Riprova o prova con un altro file.')
    }
  }

  const cambiaRiga = (i: number, p: Partial<RigaModulo>) => setRighe((prev) => prev.map((r, j) => (j === i ? { ...r, ...p } : r)))

  const importa = () => {
    const base = Date.now()
    const importataIl = new Date().toISOString()
    const voci: VoceCosto[] = gruppi.map((g, i) => {
      const [categoria, ...sotto] = g.cat.split(' › ')
      return {
        id: `K-F-${base}-${i + 1}`,
        categoria, sottocategoria: sotto.join(' › ') || categoria, fornitore: testa.fornitore.trim() || '—',
        imponibile: g.imponibile, iva: g.iva, ricorrenza: 'una_tantum', tipo: 'variabile', centroCosto: g.centro,
        data: testa.data, ...(testa.scadenza ? { scadenza: testa.scadenza } : {}),
        statoPagamento: testa.pagata ? 'pagato' : testa.scadenza && testa.scadenza < importataIl.slice(0, 10) ? 'scaduto' : 'da_pagare',
        metodo: testa.metodo,
        fattura: {
          numero: testa.numero.trim(), data: testa.data, ...(testa.partitaIva.trim() ? { partitaIva: testa.partitaIva.trim() } : {}),
          file, importataIl, ...(dati?.totale != null ? { totaleDocumento: dati.totale } : {}),
          // senza undefined: il JSON salvato resta pulito
          righe: g.righe.map(({ cat: _c, centro: _ce, ...r }) => JSON.parse(JSON.stringify(r))),
        },
      }
    })
    aggiungiCosti(voci)
    onImportata(voci.length)
    chiudi()
  }

  const valido = !!testa.numero.trim() && !!testa.data && righe.length > 0 && !giaImportata

  return (
    <Modal
      aperto={aperto}
      onChiudi={chiudi}
      titolo="Importa fattura"
      larghezza="max-w-3xl"
      piede={stato === 'anteprima' ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variante="secondario" onClick={() => { setStato('scegli'); setDati(null) }}>Altro file</Button>
          <Button onClick={importa} disabled={!valido}>Salva {gruppi.length === 1 ? '1 voce' : `${gruppi.length} voci`} di costo</Button>
        </div>
      ) : undefined}
    >
      {stato !== 'anteprima' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void leggi(e.dataTransfer.files[0]) }}
            disabled={stato === 'lettura'}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-cabina/30 bg-cabina/5 px-4 py-10 text-center text-profondo transition hover:border-cabina/60"
          >
            {stato === 'lettura' ? <Loader2 className="h-8 w-8 animate-spin text-cabina" /> : <FileUp className="h-8 w-8 text-cabina" />}
            <span className="font-semibold">{stato === 'lettura' ? `Leggo ${file}…` : 'Scegli la fattura (PDF o XML)'}</span>
            <span className="text-xs text-profondo/55">o trascinala qui. Il file viene letto su questo dispositivo e non viene caricato.</span>
          </button>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf,.xml,text/xml,application/xml" className="hidden" onChange={(e) => { void leggi(e.target.files?.[0]); e.target.value = '' }} />
          {errore && <p className="flex items-start gap-2 rounded-xl bg-boa/10 px-3 py-2 text-sm text-boa"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{errore}</p>}
          <p className="text-xs text-profondo/50">
            Letti: fornitore, partita IVA, numero, data, scadenza, pagamento e righe (quantità, prezzo, sconto, importo, IVA).
            A ogni riga viene proposta una categoria; prima di salvare puoi correggere tutto.
          </p>
        </div>
      )}

      {stato === 'anteprima' && dati && (
        <div className="space-y-4">
          {giaImportata ? (
            <p className="flex items-start gap-2 rounded-xl bg-boa/10 px-3 py-2 text-sm text-boa">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>La fattura n. <b>{testa.numero}</b> di questo fornitore è già nei costi (importata da {giaImportata.fattura?.file}).</span>
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-acqua/15 px-3 py-2 text-sm text-profondo">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cabina" />
              <span>
                Trovate <b>{righe.length} righe</b> per {euro(imponibile)} + IVA = <b>{euro(totaleRighe)}</b>.
                {dati.totale != null && (quadra ? ' Il totale corrisponde a quello della fattura.' : <> Attenzione: la fattura dice <b>{euro(dati.totale)}</b>, controlla le righe.</>)}
              </span>
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etichetta="Fornitore" span><input className={INPUT} value={testa.fornitore} onChange={(e) => setTesta({ ...testa, fornitore: e.target.value })} /></Campo>
            <Campo etichetta="Partita IVA"><input className={INPUT} value={testa.partitaIva} onChange={(e) => setTesta({ ...testa, partitaIva: e.target.value })} /></Campo>
            <Campo etichetta="Numero fattura"><input className={INPUT} value={testa.numero} onChange={(e) => setTesta({ ...testa, numero: e.target.value })} /></Campo>
            <Campo etichetta="Data"><input type="date" className={INPUT} value={testa.data} onChange={(e) => setTesta({ ...testa, data: e.target.value })} /></Campo>
            <Campo etichetta="Scadenza"><input type="date" className={INPUT} value={testa.scadenza} onChange={(e) => setTesta({ ...testa, scadenza: e.target.value })} /></Campo>
            <Campo etichetta="Pagamento">
              <Select value={testa.metodo} onChange={(e) => setTesta({ ...testa, metodo: e.target.value as MetodoPagamento })}
                opzioni={[{ valore: 'bonifico', etichetta: 'Bonifico' }, { valore: 'rid', etichetta: 'RID / SDD' }, { valore: 'carta', etichetta: 'Carta' }, { valore: 'contanti', etichetta: 'Contanti' }, { valore: 'f24', etichetta: 'F24' }]} />
            </Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-profondo">
              <input type="checkbox" className="h-4 w-4 accent-cabina" checked={testa.pagata} onChange={(e) => setTesta({ ...testa, pagata: e.target.checked })} />
              Già pagata
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-profondo/50">Righe e categorie</p>
            {righe.map((r, i) => (
              <div key={i} className="rounded-xl border border-calce-200 bg-white p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-profondo">{r.descrizione}</p>
                    <p className="num text-xs text-profondo/50">
                      {[r.codice, r.quantita != null && `${numero(r.quantita)} ${r.um ?? ''}`.trim(), r.prezzo != null && `× ${euro(r.prezzo)}`, r.sconto && `sconto ${numero(r.sconto)}%`, `IVA ${Math.round(r.iva * 100)}%`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="num shrink-0 text-sm font-semibold text-profondo">{euro(r.importo)}</span>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                  <Select value={r.cat} onChange={(e) => cambiaRiga(i, { cat: e.target.value })} opzioni={opzioniCat} />
                  <Select value={r.centro} onChange={(e) => cambiaRiga(i, { centro: e.target.value as CentroCosto })}
                    opzioni={centri.map((c) => ({ valore: c, etichetta: etichetteCentro[c] }))} />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-calce/60 p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-profondo/50">Voci di costo che verranno create</p>
            {gruppi.map((g) => (
              <div key={`${g.cat}|${g.centro}|${g.iva}`} className="flex items-center justify-between gap-3 py-0.5 text-sm">
                <span className="min-w-0 truncate text-profondo">{g.cat} <span className="text-profondo/50">· {etichetteCentro[g.centro]} · {g.righe.length} righe</span></span>
                <span className="num shrink-0 font-medium text-profondo">{euro(g.imponibile)} <span className="text-xs text-profondo/50">+ IVA</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

const INPUT = 'h-10 w-full rounded-xl border border-calce-200 bg-white px-3 text-base text-profondo outline-none focus:border-cabina sm:text-sm'

function Campo({ etichetta, span, children }: { etichetta: string; span?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${span ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-medium text-profondo/60">{etichetta}</span>
      {children}
    </label>
  )
}
