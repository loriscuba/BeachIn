import { useMemo, useState } from 'react'
import { Plus, Receipt, Lock, Activity, AlertTriangle, FileUp, FileText } from 'lucide-react'
import type { CentroCosto, Ricorrenza, StatoPagamento, TipoCosto, VoceCosto } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Tabella, type Colonna } from '@/components/ui/Tabella'
import { euro, percento, data as fmtData } from '@/lib/formatters'
import { etichetteCentro } from '@/lib/graficoColori'
import { etichetteRicorrenza, etichetteStatoPagamento } from '@/lib/etichette'
import { cn } from '@/lib/cn'
import { useFunzioni } from '@/hooks/useFunzioni'
import { ImportaFattura } from '@/pages/costi/ImportaFattura'

const mesi: Record<string, string> = {
  '01': 'Gennaio', '02': 'Febbraio', '03': 'Marzo', '04': 'Aprile', '05': 'Maggio', '06': 'Giugno',
  '07': 'Luglio', '08': 'Agosto', '09': 'Settembre', '10': 'Ottobre', '11': 'Novembre', '12': 'Dicembre',
}
const centri: CentroCosto[] = ['spiaggia', 'bar', 'ristorante', 'noleggi', 'eventi', 'struttura']
const tonoStato: Record<StatoPagamento, 'acqua' | 'tenda' | 'boa'> = { pagato: 'acqua', da_pagare: 'tenda', scaduto: 'boa' }

export default function Costi() {
  const { costi, aggiungiCosto } = useDemoData()
  const { ok } = useFunzioni()
  const puoImportare = ok('costi.fatture', 2)
  const [modaleAperta, setModale] = useState(false)
  const [importa, setImporta] = useState(false)
  const [esito, setEsito] = useState<string | null>(null)
  const [dettaglio, setDettaglio] = useState<VoceCosto | null>(null)
  const [fCategoria, setFCategoria] = useState('tutte')
  const [fCentro, setFCentro] = useState<CentroCosto | 'tutti'>('tutti')
  const [fStato, setFStato] = useState<StatoPagamento | 'tutti'>('tutti')
  const [fMese, setFMese] = useState('tutti')

  const mesiPresenti = useMemo(() => Object.keys(mesi).filter((m) => costi.some((c) => c.data.slice(5, 7) === m)), [costi])
  const categorie = useMemo(() => Array.from(new Set(costi.map((c) => c.categoria))).sort(), [costi])

  const sintesi = useMemo(() => {
    const totale = costi.reduce((s, c) => s + c.imponibile, 0)
    const fissi = costi.filter((c) => c.tipo === 'fisso').reduce((s, c) => s + c.imponibile, 0)
    const daPagare = costi.filter((c) => c.statoPagamento !== 'pagato')
    const perCategoria = Object.entries(
      costi.reduce<Record<string, number>>((acc, c) => {
        acc[c.categoria] = (acc[c.categoria] ?? 0) + c.imponibile
        return acc
      }, {})
    )
      .map(([categoria, valore]) => ({ categoria, valore }))
      .sort((a, b) => b.valore - a.valore)
    return {
      totale, fissi, variabili: totale - fissi,
      daPagareN: daPagare.length,
      daPagareTot: daPagare.reduce((s, c) => s + c.imponibile * (1 + c.iva), 0),
      perCategoria,
      annoScorso: Math.round(totale * 0.94),
    }
  }, [costi])

  const filtrati = useMemo(
    () =>
      costi.filter((c) => {
        if (fCategoria !== 'tutte' && c.categoria !== fCategoria) return false
        if (fCentro !== 'tutti' && c.centroCosto !== fCentro) return false
        if (fStato !== 'tutti' && c.statoPagamento !== fStato) return false
        if (fMese !== 'tutti' && c.data.slice(5, 7) !== fMese) return false
        return true
      }),
    [costi, fCategoria, fCentro, fStato, fMese]
  )

  const scadenzePerMese = useMemo(() => {
    const nonPagati = costi.filter((c) => c.statoPagamento !== 'pagato' && c.scadenza)
    const gruppi: Record<string, { n: number; tot: number }> = {}
    for (const c of nonPagati) {
      const m = c.scadenza!.slice(5, 7)
      gruppi[m] = { n: (gruppi[m]?.n ?? 0) + 1, tot: (gruppi[m]?.tot ?? 0) + c.imponibile * (1 + c.iva) }
    }
    return Object.entries(gruppi).sort(([a], [b]) => a.localeCompare(b))
  }, [costi])

  const colonne: Colonna<VoceCosto>[] = [
    { chiave: 'data', intestazione: 'Data', nascondiMobile: true, cella: (c) => <span className="num text-profondo/60">{fmtData(c.data)}</span> },
    {
      chiave: 'voce', intestazione: 'Voce',
      cella: (c) => (
        <div>
          <p className="font-medium text-profondo">{c.sottocategoria}</p>
          <p className="text-xs text-profondo/50">
            {c.categoria} · {c.fornitore}
            {c.fattura && <span className="ml-1 inline-flex items-center gap-0.5 text-cabina"><FileText className="inline h-3 w-3" />Fatt. {c.fattura.numero}</span>}
          </p>
        </div>
      ),
    },
    { chiave: 'centro', intestazione: 'Centro', nascondiMobile: true, cella: (c) => <span className="text-profondo/60">{etichetteCentro[c.centroCosto]}</span> },
    {
      chiave: 'tipo', intestazione: 'Tipo', nascondiMobile: true,
      cella: (c) => <Badge tono={c.tipo === 'fisso' ? 'mare' : 'neutro'}>{c.tipo === 'fisso' ? 'Fisso' : 'Variabile'}</Badge>,
    },
    { chiave: 'importo', intestazione: 'Totale', allineaDx: true, cella: (c) => <span className="num font-semibold text-profondo">{euro(c.imponibile * (1 + c.iva))}</span> },
    {
      chiave: 'stato', intestazione: 'Stato', allineaDx: true,
      cella: (c) => <Badge tono={tonoStato[c.statoPagamento]}>{etichetteStatoPagamento[c.statoPagamento]}</Badge>,
    },
  ]

  const maxCat = Math.max(1, ...sintesi.perCategoria.map((c) => c.valore))

  return (
    <div className="space-y-4">
      {/* Sintesi */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icona={Receipt} etichetta="Totale costi stagione" valore={euro(sintesi.totale)} sotto={`${costi.length} voci`} />
        <Kpi icona={Lock} etichetta="Costi fissi" valore={euro(sintesi.fissi)} sotto={percento(sintesi.fissi / sintesi.totale)} />
        <Kpi icona={Activity} etichetta="Costi variabili" valore={euro(sintesi.variabili)} sotto={percento(sintesi.variabili / sintesi.totale)} />
        <Kpi icona={AlertTriangle} etichetta="Da pagare / scaduto" valore={euro(sintesi.daPagareTot)} sotto={`${sintesi.daPagareN} voci`} accento />
      </div>

      {/* Incidenza per categoria + scadenze */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader titolo="Incidenza per categoria" sottotitolo="Copre tutte le voci dello stabilimento" />
          <CardBody className="grid gap-x-6 gap-y-2 pt-2 sm:grid-cols-2">
            {sintesi.perCategoria.map((c) => (
              <div key={c.categoria}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate font-medium text-profondo">{c.categoria}</span>
                  <span className="num shrink-0 text-profondo/70">{euro(c.valore)} · {percento(c.valore / sintesi.totale)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-calce-200">
                  <div className="h-full rounded-full bg-cabina" style={{ width: `${(c.valore / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader titolo="Calendario scadenze" sottotitolo="Da pagare per mese" />
          <CardBody className="space-y-2 pt-2">
            {scadenzePerMese.map(([m, g]) => (
              <div key={m} className="flex items-center justify-between rounded-lg border border-calce-200 bg-white px-3 py-2">
                <span className="text-sm font-medium text-profondo">{mesi[m] ?? m}</span>
                <span className="text-right">
                  <span className="num block text-sm font-semibold text-profondo">{euro(g.tot)}</span>
                  <span className="text-xs text-profondo/50">{g.n} voci</span>
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-calce-200 pt-2 text-xs">
              <span className="text-profondo/55">Anno scorso (stagione)</span>
              <span className="num font-medium text-profondo/70">{euro(sintesi.annoScorso)}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtri + elenco */}
      <Card>
        <CardHeader
          titolo="Elenco costi"
          sottotitolo={`${filtrati.length} voci`}
          azione={
            <div className="flex flex-wrap justify-end gap-2">
              {puoImportare && (
                <Button variante="secondario" dimensione="sm" onClick={() => setImporta(true)}>
                  <FileUp className="h-4 w-4" /> Importa fattura
                </Button>
              )}
              <Button variante="primario" dimensione="sm" onClick={() => setModale(true)}>
                <Plus className="h-4 w-4" /> Aggiungi costo
              </Button>
            </div>
          }
        />
        <CardBody className="space-y-3">
          {esito && (
            <button type="button" onClick={() => setEsito(null)} className="w-full rounded-xl bg-acqua/15 px-3 py-2 text-left text-sm text-profondo">
              {esito}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}
              opzioni={[{ valore: 'tutte', etichetta: 'Tutte le categorie' }, ...categorie.map((c) => ({ valore: c, etichetta: c }))]} />
            <Select value={fCentro} onChange={(e) => setFCentro(e.target.value as CentroCosto | 'tutti')}
              opzioni={[{ valore: 'tutti', etichetta: 'Tutti i centri' }, ...centri.map((c) => ({ valore: c, etichetta: etichetteCentro[c] }))]} />
            <Select value={fStato} onChange={(e) => setFStato(e.target.value as StatoPagamento | 'tutti')}
              opzioni={[{ valore: 'tutti', etichetta: 'Tutti gli stati' }, ...Object.entries(etichetteStatoPagamento).map(([v, l]) => ({ valore: v, etichetta: l }))]} />
            <Select value={fMese} onChange={(e) => setFMese(e.target.value)}
              opzioni={[{ valore: 'tutti', etichetta: 'Tutti i mesi' }, ...mesiPresenti.map((v) => ({ valore: v, etichetta: mesi[v] }))]} />
          </div>
          <Tabella colonne={colonne} righe={filtrati} chiaveRiga={(c) => c.id} denso onRigaClick={(c) => c.fattura && setDettaglio(c)} />
        </CardBody>
      </Card>

      <ImportaFattura
        aperto={importa}
        onChiudi={() => setImporta(false)}
        onImportata={(n) => { setEsito(`Fattura importata: ${n === 1 ? '1 voce di costo aggiunta' : `${n} voci di costo aggiunte`}.`); setFCategoria('tutte'); setFMese('tutti') }}
      />
      <DettaglioFattura voce={dettaglio} onChiudi={() => setDettaglio(null)} />

      <NuovoCosto
        aperto={modaleAperta}
        onChiudi={() => setModale(false)}
        onSalva={(v) => { aggiungiCosto(v); setModale(false) }}
      />
    </div>
  )
}

function NuovoCosto({ aperto, onChiudi, onSalva }: { aperto: boolean; onChiudi: () => void; onSalva: (v: VoceCosto) => void }) {
  const [f, setF] = useState({
    categoria: '', sottocategoria: '', fornitore: '', imponibile: '',
    iva: '0.22', centro: 'struttura' as CentroCosto, ricorrenza: 'una_tantum' as Ricorrenza,
    tipo: 'variabile' as TipoCosto, data: '2026-07-15', scadenza: '2026-07-31',
    stato: 'da_pagare' as StatoPagamento, metodo: 'bonifico',
  })
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const valido = f.categoria && f.sottocategoria && Number(f.imponibile) > 0

  const salva = () => {
    onSalva({
      id: `K-NEW-${Date.now()}`,
      categoria: f.categoria, sottocategoria: f.sottocategoria, fornitore: f.fornitore || '—',
      imponibile: Number(f.imponibile), iva: Number(f.iva),
      ricorrenza: f.ricorrenza, tipo: f.tipo, centroCosto: f.centro,
      data: f.data, scadenza: f.scadenza, statoPagamento: f.stato, metodo: f.metodo as VoceCosto['metodo'],
    })
    setF((p) => ({ ...p, categoria: '', sottocategoria: '', fornitore: '', imponibile: '' }))
  }

  return (
    <Modal
      aperto={aperto}
      onChiudi={onChiudi}
      titolo="Nuovo costo"
      piede={
        <div className="flex justify-end gap-2">
          <Button variante="secondario" onClick={onChiudi}>Annulla</Button>
          <Button variante="primario" onClick={salva} disabled={!valido}>Salva costo</Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Categoria" span2><input className={ic} value={f.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="es. Utenze" /></Campo>
        <Campo label="Sottocategoria" span2><input className={ic} value={f.sottocategoria} onChange={(e) => set('sottocategoria', e.target.value)} placeholder="es. Energia elettrica" /></Campo>
        <Campo label="Fornitore" span2><input className={ic} value={f.fornitore} onChange={(e) => set('fornitore', e.target.value)} /></Campo>
        <Campo label="Imponibile (€)"><input type="number" className={`${ic} num`} value={f.imponibile} onChange={(e) => set('imponibile', e.target.value)} /></Campo>
        <Campo label="IVA">
          <Select value={f.iva} onChange={(e) => set('iva', e.target.value)}
            opzioni={[{ valore: '0', etichetta: 'Esente' }, { valore: '0.04', etichetta: '4%' }, { valore: '0.1', etichetta: '10%' }, { valore: '0.22', etichetta: '22%' }]} />
        </Campo>
        <Campo label="Centro di costo">
          <Select value={f.centro} onChange={(e) => set('centro', e.target.value)}
            opzioni={centri.map((c) => ({ valore: c, etichetta: etichetteCentro[c] }))} />
        </Campo>
        <Campo label="Tipo">
          <Select value={f.tipo} onChange={(e) => set('tipo', e.target.value)}
            opzioni={[{ valore: 'fisso', etichetta: 'Fisso' }, { valore: 'variabile', etichetta: 'Variabile' }]} />
        </Campo>
        <Campo label="Ricorrenza">
          <Select value={f.ricorrenza} onChange={(e) => set('ricorrenza', e.target.value)}
            opzioni={Object.entries(etichetteRicorrenza).map(([v, l]) => ({ valore: v, etichetta: l }))} />
        </Campo>
        <Campo label="Stato">
          <Select value={f.stato} onChange={(e) => set('stato', e.target.value)}
            opzioni={Object.entries(etichetteStatoPagamento).map(([v, l]) => ({ valore: v, etichetta: l }))} />
        </Campo>
        <Campo label="Data"><input type="date" className={ic} value={f.data} onChange={(e) => set('data', e.target.value)} /></Campo>
        <Campo label="Scadenza"><input type="date" className={ic} value={f.scadenza} onChange={(e) => set('scadenza', e.target.value)} /></Campo>
      </div>
    </Modal>
  )
}

function DettaglioFattura({ voce, onChiudi }: { voce: VoceCosto | null; onChiudi: () => void }) {
  const f = voce?.fattura
  return (
    <Modal aperto={!!f} onChiudi={onChiudi} titolo={f ? `Fattura ${f.numero}` : ''} larghezza="max-w-2xl">
      {voce && f && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-2xl bg-calce/60 p-3 text-sm">
            <p className="col-span-2 font-semibold text-profondo">{voce.fornitore}{f.partitaIva ? <span className="font-normal text-profondo/55"> · P.IVA {f.partitaIva}</span> : null}</p>
            <p className="text-profondo/70">Data {fmtData(f.data)}{voce.scadenza ? ` · scade ${fmtData(voce.scadenza)}` : ''}</p>
            <p className="text-right text-profondo/70">{f.totaleDocumento != null ? `Totale fattura ${euro(f.totaleDocumento)}` : ''}</p>
            <p className="col-span-2 text-profondo">
              Questa voce: <b>{voce.categoria} › {voce.sottocategoria}</b> · {etichetteCentro[voce.centroCosto]} · {euro(voce.imponibile)} + IVA {Math.round(voce.iva * 100)}%
            </p>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {f.righe.map((r, i) => (
                <tr key={i} className="border-b border-calce-200/70 last:border-0">
                  <td className="py-1 pr-2 text-profondo">{r.descrizione}<span className="num block text-profondo/45">{[r.codice, r.quantita != null && `${r.quantita} ${r.um ?? ''}`.trim(), r.prezzo != null && `× ${euro(r.prezzo)}`, r.sconto ? `−${r.sconto}%` : ''].filter(Boolean).join(' · ')}</span></td>
                  <td className="num py-1 text-right font-medium text-profondo">{euro(r.importo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-profondo/45">Importata da {f.file}</p>
        </div>
      )}
    </Modal>
  )
}

const ic = 'h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring'

function Campo({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn('block', span2 && 'col-span-2')}>
      <span className="mb-1 block text-xs font-medium text-profondo/60">{label}</span>
      {children}
    </label>
  )
}

function Kpi({ icona: Icona, etichetta, valore, sotto, accento }: { icona: typeof Receipt; etichetta: string; valore: string; sotto?: string; accento?: boolean }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
          <Icona className="h-3.5 w-3.5 text-cabina" /> {etichetta}
        </p>
        <p className={cn('num mt-0.5 text-2xl font-bold', accento ? 'text-boa' : 'text-profondo')}>{valore}</p>
        {sotto && <p className="num text-xs text-profondo/50">{sotto}</p>}
      </CardBody>
    </Card>
  )
}
