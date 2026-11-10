import { useMemo, useRef, useState } from 'react'
import { FileUp, Loader2, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react'
import type { BustaPaga, Dipendente, RuoloDipendente, TipoContratto } from '@/data/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useDemoData } from '@/context/DemoDataContext'
import { analizzaBustaPaga, leggiPdf, nomeMese, ruoloDaQualifica, type DatiBustaPaga } from '@/lib/bustaPaga'
import { etichetteContratto, etichetteRuolo } from '@/lib/etichette'
import { euro, numero, data as fmtData } from '@/lib/formatters'

const SETTIMANE_MESE = 4.33
/** Contributi a carico del lido sul lordo (stima per il costo aziendale: INPS, INAIL, fondi). */
const CONTRIBUTI_AZIENDA = 0.3
const r2 = (n: number) => Math.round(n * 100) / 100

interface Modulo {
  nome: string
  cognome: string
  codiceFiscale: string
  ruolo: RuoloDipendente
  tipoContratto: TipoContratto
  ccnl: string
}

/** Dipendente nuovo o aggiornato con i dati della busta paga (i turni e quanto non c'è nel cedolino restano). */
function componi(d: DatiBustaPaga, m: Modulo, file: string, esistente?: Dipendente): Dipendente {
  const pt = d.percentualePartTime ?? 100
  const oreMese = ((d.oreMensiliCcnl ?? 173) * pt) / 100
  const lordo = d.totaleLordo ?? d.retribuzioneFatto ?? 0
  const anno = (d.periodo ?? new Date().toISOString()).slice(0, 4)
  const busta: BustaPaga = {
    periodo: d.periodo ?? new Date().toISOString().slice(0, 7), file, importataIl: new Date().toISOString(),
    ditta: d.ditta, livello: d.livello, retribuzioneFatto: d.retribuzioneFatto, pagaBase: d.pagaBase, contingenza: d.contingenza,
    oreMensiliCcnl: d.oreMensiliCcnl, percentualePartTime: d.percentualePartTime, giorniLavorati: d.giorniLavorati,
    oreStraordinario: d.oreStraordinario, totaleLordo: d.totaleLordo, contributiDipendente: d.contributiDipendente,
    imponibileIrpef: d.imponibileIrpef, irpefNetta: d.irpefNetta, totaleTrattenute: d.totaleTrattenute, netto: d.netto,
    tfrMese: d.tfrMese, tfrMaturato: d.tfrMaturato, ferieResidue: d.ferieResidue, rolResidui: d.rolResidui, voci: d.voci,
  }
  // senza undefined: il JSON salvato resta pulito
  const pulisci = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T
  const buste = [pulisci(busta), ...(esistente?.bustePaga ?? []).filter((b) => b.periodo !== busta.periodo)]
    .sort((a, b) => b.periodo.localeCompare(a.periodo))
  const ultima = buste[0].periodo === busta.periodo
  return pulisci({
    ...esistente,
    id: esistente?.id ?? `D-${Date.now().toString(36)}`,
    nome: m.nome.trim(),
    cognome: m.cognome.trim(),
    ruolo: m.ruolo,
    tipoContratto: m.tipoContratto,
    codiceFiscale: m.codiceFiscale.trim().toUpperCase() || undefined,
    ccnl: m.ccnl.trim() || undefined,
    // dati di contratto e costo: solo se la busta è la più recente
    ...(ultima ? {
      inquadramento: d.livello ? `Livello ${d.livello}` : esistente?.inquadramento ?? '—',
      qualifica: d.qualifica ?? esistente?.qualifica,
      oreContrattoSettimana: Math.round(oreMese / SETTIMANE_MESE),
      oreLavorateSettimana: Math.round((oreMese + (d.oreStraordinario ?? 0)) / SETTIMANE_MESE),
      costoOrarioLordo: d.retribuzioneFatto && oreMese ? r2(d.retribuzioneFatto / oreMese) : esistente?.costoOrarioLordo ?? 0,
      costoAziendaleMensile: Math.round(lordo * (1 + CONTRIBUTI_AZIENDA) + (d.tfrMese ?? lordo / 13.5)),
      iban: d.iban ?? esistente?.iban,
    } : {
      inquadramento: esistente?.inquadramento ?? (d.livello ? `Livello ${d.livello}` : '—'),
      oreContrattoSettimana: esistente?.oreContrattoSettimana ?? Math.round(oreMese / SETTIMANE_MESE),
      oreLavorateSettimana: esistente?.oreLavorateSettimana ?? Math.round(oreMese / SETTIMANE_MESE),
      costoOrarioLordo: esistente?.costoOrarioLordo ?? 0,
      costoAziendaleMensile: esistente?.costoAziendaleMensile ?? 0,
    }),
    dataNascita: d.dataNascita ?? esistente?.dataNascita,
    comuneResidenza: d.comuneResidenza ?? esistente?.comuneResidenza,
    matricola: d.matricola ?? esistente?.matricola,
    periodoDal: d.dataAssunzione ?? esistente?.periodoDal ?? `${busta.periodo}-01`,
    periodoAl: d.dataCessazione ?? esistente?.periodoAl ?? (m.tipoContratto === 'tempo_indeterminato' ? `${anno}-12-31` : `${anno}-09-30`),
    turni: esistente?.turni ?? [],
    bustePaga: buste,
  })
}

export function ImportaBustaPaga({ aperto, onChiudi, onImportato }: { aperto: boolean; onChiudi: () => void; onImportato: (d: Dipendente) => void }) {
  const { dipendenti, salvaDipendente } = useDemoData()
  const inputRef = useRef<HTMLInputElement>(null)
  const [stato, setStato] = useState<'scegli' | 'lettura' | 'anteprima'>('scegli')
  const [errore, setErrore] = useState<string | null>(null)
  const [file, setFile] = useState('')
  const [dati, setDati] = useState<DatiBustaPaga | null>(null)
  const [modulo, setModulo] = useState<Modulo>({ nome: '', cognome: '', codiceFiscale: '', ruolo: 'barista', tipoContratto: 'stagionale', ccnl: '' })
  const [voci, setVoci] = useState(false)

  const esistente = useMemo(() => {
    const cf = modulo.codiceFiscale.trim().toUpperCase()
    const nc = `${modulo.cognome} ${modulo.nome}`.trim().toLowerCase()
    return dipendenti.find((x) => (cf && x.codiceFiscale === cf) || (!x.codiceFiscale && nc && `${x.cognome} ${x.nome}`.toLowerCase() === nc))
  }, [dipendenti, modulo])

  const chiudi = () => {
    setStato('scegli'); setErrore(null); setDati(null); setFile(''); setVoci(false)
    onChiudi()
  }

  const leggi = async (f?: File) => {
    if (!f) return
    setErrore(null)
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { setErrore('Scegli un file PDF.'); return }
    setStato('lettura'); setFile(f.name)
    try {
      const d = analizzaBustaPaga(await leggiPdf(f))
      if (!d.cognome && !d.codiceFiscale && d.totaleLordo == null) {
        setStato('scegli')
        setErrore('Non riconosco questo PDF come busta paga (serve un PDF con il testo, non una foto o una scansione).')
        return
      }
      const gia = dipendenti.find((x) => d.codiceFiscale && x.codiceFiscale === d.codiceFiscale)
      setDati(d)
      setModulo({
        nome: d.nome ?? gia?.nome ?? '', cognome: d.cognome ?? gia?.cognome ?? '', codiceFiscale: d.codiceFiscale ?? '',
        ruolo: ruoloDaQualifica(d.qualifica) ?? gia?.ruolo ?? 'barista',
        tipoContratto: gia?.tipoContratto ?? (d.dataCessazione ? 'tempo_determinato' : 'stagionale'), ccnl: gia?.ccnl ?? '',
      })
      setStato('anteprima')
    } catch (e) {
      console.error('[busta paga]', e)
      setStato('scegli')
      setErrore('Non sono riuscito a leggere il PDF. Riprova o prova con un altro file.')
    }
  }

  const importa = () => {
    if (!dati) return
    const d = componi(dati, modulo, file, esistente)
    salvaDipendente(d)
    onImportato(d)
    chiudi()
  }

  const valido = !!modulo.nome.trim() && !!modulo.cognome.trim()

  return (
    <Modal
      aperto={aperto}
      onChiudi={chiudi}
      titolo="Importa busta paga"
      larghezza="max-w-2xl"
      piede={stato === 'anteprima' ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variante="secondario" onClick={() => { setStato('scegli'); setDati(null) }}>Altro file</Button>
          <Button onClick={importa} disabled={!valido}>{esistente ? `Aggiorna ${esistente.nome} ${esistente.cognome}` : 'Crea dipendente'}</Button>
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
            <span className="font-semibold">{stato === 'lettura' ? `Leggo ${file}…` : 'Scegli il PDF della busta paga'}</span>
            <span className="text-xs text-profondo/55">o trascinalo qui. Il file viene letto su questo dispositivo e non viene caricato.</span>
          </button>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { void leggi(e.target.files?.[0]); e.target.value = '' }} />
          {errore && <p className="flex items-start gap-2 rounded-xl bg-boa/10 px-3 py-2 text-sm text-boa"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{errore}</p>}
          <p className="text-xs text-profondo/50">Letti: anagrafica, qualifica e livello, periodo, retribuzione, ore e straordinari, lordo, trattenute, netto, TFR, ferie e IBAN. Prima di importare puoi correggere tutto.</p>
        </div>
      )}

      {stato === 'anteprima' && dati && (
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-xl bg-acqua/15 px-3 py-2 text-sm text-profondo">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cabina" />
            <span>
              Busta paga di <b>{nomeMese(dati.periodo) || 'periodo non trovato'}</b>{dati.ditta ? ` · ${dati.ditta}` : ''}.{' '}
              {esistente ? <>Il dipendente <b>{esistente.nome} {esistente.cognome}</b> esiste già: verrà aggiornato.</> : 'Verrà creato un nuovo dipendente.'}
            </span>
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etichetta="Nome"><input className={INPUT} value={modulo.nome} onChange={(e) => setModulo({ ...modulo, nome: e.target.value })} /></Campo>
            <Campo etichetta="Cognome"><input className={INPUT} value={modulo.cognome} onChange={(e) => setModulo({ ...modulo, cognome: e.target.value })} /></Campo>
            <Campo etichetta="Codice fiscale"><input className={`${INPUT} uppercase`} value={modulo.codiceFiscale} onChange={(e) => setModulo({ ...modulo, codiceFiscale: e.target.value })} /></Campo>
            <Campo etichetta="CCNL"><input className={INPUT} placeholder="es. Turismo – Pubblici esercizi" value={modulo.ccnl} onChange={(e) => setModulo({ ...modulo, ccnl: e.target.value })} /></Campo>
            <Campo etichetta="Ruolo nell'app">
              <Select value={modulo.ruolo} onChange={(e) => setModulo({ ...modulo, ruolo: e.target.value as RuoloDipendente })}
                opzioni={Object.entries(etichetteRuolo).map(([valore, etichetta]) => ({ valore, etichetta }))} />
            </Campo>
            <Campo etichetta="Contratto">
              <Select value={modulo.tipoContratto} onChange={(e) => setModulo({ ...modulo, tipoContratto: e.target.value as TipoContratto })}
                opzioni={Object.entries(etichetteContratto).map(([valore, etichetta]) => ({ valore, etichetta }))} />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl bg-calce/60 p-3 text-sm sm:grid-cols-3">
            <Dato e="Qualifica" v={dati.qualifica} />
            <Dato e="Livello" v={dati.livello} />
            <Dato e="Assunzione" v={dati.dataAssunzione && fmtData(dati.dataAssunzione)} />
            <Dato e="Nascita" v={dati.dataNascita && `${fmtData(dati.dataNascita)}${dati.comuneResidenza ? ` · ${dati.comuneResidenza}` : ''}`} />
            <Dato e="Ore mensili CCNL" v={dati.oreMensiliCcnl != null ? `${numero(dati.oreMensiliCcnl)}${dati.percentualePartTime ? ` (part-time ${numero(dati.percentualePartTime)}%)` : ''}` : undefined} />
            <Dato e="Giorni lavorati" v={dati.giorniLavorati != null ? numero(dati.giorniLavorati) : undefined} />
            <Dato e="Straordinari (ore)" v={dati.oreStraordinario != null ? numero(dati.oreStraordinario) : undefined} />
            <Dato e="Retribuzione di fatto" v={dati.retribuzioneFatto != null ? euro(dati.retribuzioneFatto) : undefined} />
            <Dato e="Totale lordo" v={dati.totaleLordo != null ? euro(dati.totaleLordo) : undefined} />
            <Dato e="Trattenute" v={dati.totaleTrattenute != null ? euro(dati.totaleTrattenute) : undefined} />
            <Dato e="Netto in busta" v={dati.netto != null ? euro(dati.netto) : undefined} forte />
            <Dato e="TFR del mese" v={dati.tfrMese != null ? euro(dati.tfrMese) : undefined} />
            <Dato e="Ferie residue" v={dati.ferieResidue != null ? `${numero(dati.ferieResidue)} gg` : undefined} />
            <Dato e="ROL residui" v={dati.rolResidui != null ? `${numero(dati.rolResidui)} h` : undefined} />
            <Dato e="IBAN" v={dati.iban} />
          </div>

          {dati.voci.length > 0 && (
            <div>
              <button type="button" onClick={() => setVoci(!voci)} className="flex items-center gap-1 text-sm font-medium text-cabina">
                <ChevronDown className={`h-4 w-4 transition ${voci ? 'rotate-180' : ''}`} /> Voci della busta ({dati.voci.length})
              </button>
              {voci && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {dati.voci.map((x, i) => (
                        <tr key={i} className="border-b border-calce-200/70 last:border-0">
                          <td className="num py-1 pr-2 text-profondo/50">{x.codice}</td>
                          <td className="py-1 pr-2 text-profondo">{x.descrizione}</td>
                          <td className="num py-1 pr-2 text-right text-profondo/60">{x.quantita != null ? numero(x.quantita) : ''}</td>
                          <td className="num py-1 text-right font-medium text-profondo">
                            {x.competenza != null ? euro(x.competenza) : x.trattenuta != null ? `−${euro(x.trattenuta)}` : x.statistico != null ? <span className="text-profondo/50">{euro(x.statistico)}</span> : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-profondo/50">
            Il costo aziendale mensile è stimato: lordo + {Math.round(CONTRIBUTI_AZIENDA * 100)}% di contributi a carico del lido + TFR del mese.
          </p>
        </div>
      )}
    </Modal>
  )
}

const INPUT = 'h-10 w-full rounded-xl border border-calce-200 bg-white px-3 text-base text-profondo outline-none focus:border-cabina sm:text-sm'

function Campo({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-profondo/60">{etichetta}</span>
      {children}
    </label>
  )
}

function Dato({ e, v, forte }: { e: string; v?: string; forte?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-profondo/45">{e}</p>
      <p className={`truncate ${forte ? 'font-bold text-profondo' : 'text-profondo'} ${v ? '' : 'text-profondo/30'}`}>{v || '—'}</p>
    </div>
  )
}
