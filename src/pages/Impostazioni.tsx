import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSessione } from '@/context/SessioneContext'
import { AccessoNegato } from '@/components/AccessoNegato'
import { SolaLettura } from '@/components/SolaLettura'
import UtentiRuoli from '@/pages/impostazioni/UtentiRuoli'
import { Settings2, Save, Umbrella, CalendarRange, ShieldCheck, Boxes, Lock, Check, ChevronDown } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useModuli } from '@/context/ModuliContext'
import { MODULI, PIANI, funzioniDi, type InfoModulo } from '@/config/moduli'
import { config, STATI_POSTAZIONE } from '@/data/config'
import { data } from '@/lib/formatters'
import { GRUPPI, valoriCorrenti, salvaImpostazioni, type Valori, type Campo } from '@/lib/impostazioni'
import { supabaseAttivo } from '@/lib/supabase'
import { cn } from '@/lib/cn'

function Riga({ etichetta, valore }: { etichetta: string; valore: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-calce-200 last:border-0">
      <span className="text-sm text-profondo/60">{etichetta}</span>
      <span className="num text-sm font-medium text-profondo text-right">{valore}</span>
    </div>
  )
}

/** Valore mostrato nel campo (percentuali in %, es. 0.22 → "22"). */
const inCampo = (c: Campo, v: string | number) => (c.tipo === 'percento' ? String(Math.round(Number(v) * 10000) / 100) : String(v ?? ''))
const daCampo = (c: Campo, t: string): string | number => {
  if (c.tipo === 'numero') return Number(t.replace(',', '.'))
  if (c.tipo === 'percento') return Number(t.replace(',', '.')) / 100
  return t.trim()
}

function ParametriModificabili() {
  const iniziali = () => {
    const v = valoriCorrenti()
    return Object.fromEntries(GRUPPI.flatMap((g) => g.campi.map((c) => [c.chiave, inCampo(c, v[c.chiave])])))
  }
  const [testi, setTesti] = useState<Record<string, string>>(iniziali)
  const [base] = useState(iniziali)
  const [stato, setStato] = useState<{ tipo: 'ok' | 'errore'; msg: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const modificato = Object.keys(testi).some((k) => testi[k] !== base[k])

  const salva = async () => {
    const valori: Valori = {}
    for (const g of GRUPPI) for (const c of g.campi) {
      const v = daCampo(c, testi[c.chiave] ?? '')
      if (typeof v === 'number' && !Number.isFinite(v)) { setStato({ tipo: 'errore', msg: `Valore non valido: ${c.etichetta}` }); return }
      valori[c.chiave] = v
    }
    setSalvando(true)
    const errore = await salvaImpostazioni(valori)
    setSalvando(false)
    // in caso di successo la pagina viene rimontata coi nuovi valori
    if (errore) setStato({ tipo: 'errore', msg: `Salvataggio non riuscito: ${errore}` })
  }

  return (
    <Card>
      <CardHeader
        titolo={<span className="inline-flex items-center gap-2"><Settings2 className="h-4 w-4 text-cabina" /> Parametri dello stabilimento</span>}
        sottotitolo={supabaseAttivo
          ? 'Salvati nel database: valgono subito per gestionale, sito e app clienti.'
          : 'Modalità demo locale (senza database): le modifiche valgono fino al ricaricamento.'}
        azione={
          <Button dimensione="sm" onClick={salva} disabled={!modificato || salvando}>
            <Save className="h-4 w-4" /> {salvando ? 'Salvo…' : 'Salva'}
          </Button>
        }
      />
      <CardBody className="space-y-5 pt-1">
        {stato && <p className={cn('text-sm', stato.tipo === 'errore' ? 'text-boa' : 'text-cabina')}>{stato.msg}</p>}
        {GRUPPI.map((g) => (
          <fieldset key={g.id}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-profondo/50">{g.titolo}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.campi.map((c) => (
                <label key={c.chiave} className="block">
                  <span className="text-xs text-profondo/60">{c.etichetta}{c.tipo === 'percento' && ' (%)'}</span>
                  <input
                    type={c.tipo === 'ora' ? 'time' : 'text'}
                    inputMode={c.tipo === 'numero' || c.tipo === 'percento' ? 'decimal' : undefined}
                    value={testi[c.chiave] ?? ''}
                    onChange={(e) => { setStato(null); setTesti((t) => ({ ...t, [c.chiave]: e.target.value })) }}
                    className="mt-0.5 w-full rounded-lg border border-calce-300 bg-white px-3 py-1.5 text-sm text-profondo focus:border-cabina focus:outline-none"
                  />
                  {c.aiuto && <span className="mt-0.5 block text-[11px] text-profondo/45">{c.aiuto}</span>}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </CardBody>
    </Card>
  )
}

/** Impostazioni: scheda Generali (permesso "impostazioni") e Utenti e ruoli (permesso "utenti"). */
export default function Impostazioni() {
  const { livello } = useSessione()
  const [params] = useSearchParams()
  const lGen = livello('impostazioni')
  const lUt = livello('utenti')
  const tab = params.get('tab') ?? (lGen > 0 ? 'generali' : 'utenti')
  if (tab === 'utenti') return lUt > 0 ? <UtentiRuoli /> : <AccessoNegato />
  if (lGen === 0) return <AccessoNegato />
  const pagina = tab === 'moduli' ? <ModuliFunzionalita /> : <Generali />
  return lGen === 1 ? <SolaLettura>{pagina}</SolaLettura> : pagina
}

/**
 * Moduli e funzionalità del cliente: piani rapidi, moduli on/off e, aprendo un modulo, le sue funzionalità
 * (le schede della pagina) on/off. Vale per tutti gli utenti; i permessi per ruolo si danno in Utenti e ruoli.
 */
function ModuliFunzionalita() {
  const { moduloAttivo, toggle, applicaPiano, pianoCorrente, funzioneAttiva, toggleFunzione } = useModuli()
  const moduliVendibili = (Object.values(MODULI) as InfoModulo[]).filter((m) => !m.core)
  const [aperto, setAperto] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Moduli e piano commerciale */}
      <Card>
        <CardHeader
          titolo={
            <span className="inline-flex items-center gap-2">
              <Boxes className="h-4 w-4 text-cabina" /> Moduli e funzionalità
            </span>
          }
          sottotitolo="BeachIn si vende a moduli: attiva ciò che serve al cliente, fino alle singole funzionalità. Il resto è upsell."
        />
        <CardBody className="space-y-4 pt-1">
          {/* Piani rapidi */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-profondo/50">Piani</span>
            {Object.values(PIANI).map((p) => (
              <Button
                key={p.id}
                variante={pianoCorrente === p.id ? 'primario' : 'secondario'}
                dimensione="sm"
                onClick={() => applicaPiano(p.id)}
                title={p.descrizione}
              >
                {p.nome}
              </Button>
            ))}
            {pianoCorrente === null && <Badge tono="tenda">Piano personalizzato</Badge>}
          </div>

          {/* Elenco moduli con attivazione dal vivo; aprendo un modulo, le sue funzionalità */}
          <ul className="divide-y divide-calce-200">
            {moduliVendibili.map((m) => {
              const attivo = moduloAttivo(m.id)
              const funzioni = funzioniDi(m.id)
              const accese = funzioni.filter((x) => funzioneAttiva(x.id)).length
              const espanso = aperto === m.id && funzioni.length > 0
              return (
                <li key={m.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      data-naviga
                      disabled={!funzioni.length}
                      onClick={() => setAperto(espanso ? null : m.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      aria-expanded={espanso}
                    >
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-profondo/40 transition-transform', espanso && 'rotate-180', !funzioni.length && 'invisible')} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-profondo">
                          {m.nome}
                          {attivo && funzioni.length > 0 && (
                            <span className={cn('ml-2 text-xs font-normal', accese < funzioni.length ? 'text-[#7A5A12]' : 'text-profondo/45')}>
                              {accese}/{funzioni.length} funzionalità
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-profondo/55">{m.sottotitolo}</span>
                      </span>
                    </button>
                    <Interruttore attivo={attivo} onClick={() => toggle(m.id)} si="Attivo" no="Bloccato" />
                  </div>
                  {espanso && (
                    <ul className="mt-2 ml-6 space-y-1 border-l border-calce-200 pl-3">
                      {funzioni.map((x) => (
                        <li key={x.id} className="flex items-center justify-between gap-3 py-1">
                          <span className={cn('text-sm', attivo ? 'text-profondo' : 'text-profondo/40')}>{x.nome}</span>
                          <Interruttore attivo={funzioneAttiva(x.id)} disabilitato={!attivo} onClick={() => toggleFunzione(x.id)} si="Attiva" no="Spenta" piccolo />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-profondo/45">
            Moduli e funzionalità valgono per tutto lo stabilimento{supabaseAttivo ? ' e si salvano nel database (tutti i dispositivi si aggiornano subito)' : ''}.
            Apri un modulo per accendere o spegnere le singole funzionalità. Cosa può fare ogni ruolo si decide in Utenti e ruoli.
          </p>
        </CardBody>
      </Card>

    </div>
  )
}

function Interruttore({ attivo, onClick, si, no, disabilitato, piccolo }: { attivo: boolean; onClick: () => void; si: string; no: string; disabilitato?: boolean; piccolo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabilitato}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition-colors disabled:opacity-40',
        piccolo ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        attivo ? 'bg-acqua/25 text-profondo hover:bg-acqua/40' : 'bg-calce-200 text-profondo/60 hover:bg-calce-300'
      )}
      aria-pressed={attivo}
    >
      {attivo ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      {attivo ? si : no}
    </button>
  )
}

function Generali() {
  return (
    <div className="space-y-4">
      <ParametriModificabili />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Arenile */}
        <Card>
          <CardHeader
            titolo={
              <span className="inline-flex items-center gap-2">
                <Umbrella className="h-4 w-4 text-cabina" /> Configurazione arenile
              </span>
            }
            sottotitolo="Struttura fissa: da qui dipendono pianta e dati generati"
          />
          <CardBody className="pt-1">
            <Riga etichetta="File" valore={`${config.arenile.file.length} (${config.arenile.file[0]}–${config.arenile.file.at(-1)})`} />
            <Riga etichetta="Postazioni per fila" valore={config.arenile.postazioniPerFila} />
            <Riga etichetta="Postazioni totali" valore={config.arenile.postazioniTotali} />
            <Riga etichetta="Gazebo (prima fila)" valore={config.arenile.gazeboPrimaFila} />
            <Riga etichetta="Cabine" valore={config.arenile.cabine} />
            <Riga etichetta="Armadietti / docce / torrette" valore={`${config.arenile.armadietti} / ${config.arenile.docce} / ${config.arenile.torrette}`} />
          </CardBody>
        </Card>

        {/* Stagione */}
        <Card>
          <CardHeader
            titolo={
              <span className="inline-flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-cabina" /> Stagione
              </span>
            }
          />
          <CardBody className="pt-1">
            <Riga etichetta="Anno" valore={config.stagione.anno} />
            <Riga etichetta="Apertura" valore={data(config.stagione.inizio)} />
            <Riga etichetta="Chiusura" valore={data(config.stagione.fine)} />
            <Riga etichetta="Data demo (oggi)" valore={data(config.stagione.oggi)} />
            <Riga etichetta="Orario" valore={`${config.orari.apertura}–${config.orari.chiusura}`} />
          </CardBody>
        </Card>

      </div>

      {/* Stati postazione */}
      <Card>
        <CardHeader
          titolo={
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cabina" /> Legenda stati postazione
            </span>
          }
          sottotitolo="Colori usati nella pianta dell’arenile"
        />
        <CardBody className="flex flex-wrap gap-2">
          {Object.entries(STATI_POSTAZIONE).map(([chiave, etichetta]) => (
            <span
              key={chiave}
              className="inline-flex items-center gap-2 rounded-full border border-calce-200 bg-white px-3 py-1.5 text-sm"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: `var(--stato-${chiave})` }}
              />
              {etichetta}
            </span>
          ))}
        </CardBody>
      </Card>

    </div>
  )
}
