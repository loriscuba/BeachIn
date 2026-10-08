import { useState } from 'react'
import { Settings2, Save, Umbrella, CalendarRange, Users2, ShieldCheck, RotateCcw, FlaskConical, Boxes, Lock, Check } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { MODULI, PIANI, type InfoModulo } from '@/config/moduli'
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

const ruoli = [
  { nome: 'Titolare', permessi: 'Accesso completo a tutti i moduli', tono: 'mare' as const },
  { nome: 'Cassa / Reception', permessi: 'Arenile, clienti, incassi, prenotazioni', tono: 'stagionale' as const },
  { nome: 'Bagnino', permessi: 'Arenile in sola lettura, stati postazioni', tono: 'acqua' as const },
  { nome: 'Ristorazione', permessi: 'Bar, ristorante, magazzino', tono: 'tenda' as const },
]

export default function Impostazioni() {
  const { reset } = useDemoData()
  const { moduloAttivo, toggle, applicaPiano, pianoCorrente } = useModuli()
  const moduliVendibili = (Object.values(MODULI) as InfoModulo[]).filter((m) => !m.core)

  return (
    <div className="space-y-4">
      {/* Moduli e piano commerciale */}
      <Card>
        <CardHeader
          titolo={
            <span className="inline-flex items-center gap-2">
              <Boxes className="h-4 w-4 text-cabina" /> Moduli e piano
            </span>
          }
          sottotitolo="BeachIn si vende a moduli: attiva ciò che serve al cliente, il resto è upsell."
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

          {/* Elenco moduli con attivazione dal vivo */}
          <ul className="divide-y divide-calce-200">
            {moduliVendibili.map((m) => {
              const attivo = moduloAttivo(m.id)
              return (
                <li key={m.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-profondo">{m.nome}</p>
                    <p className="truncate text-xs text-profondo/55">{m.sottotitolo}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                      attivo
                        ? 'bg-acqua/25 text-profondo hover:bg-acqua/40'
                        : 'bg-calce-200 text-profondo/60 hover:bg-calce-300'
                    )}
                    aria-pressed={attivo}
                  >
                    {attivo ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {attivo ? 'Attivo' : 'Bloccato'}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-profondo/45">
            In produzione i moduli attivi arrivano dal piano del cliente (dal database). Qui puoi
            attivarli/disattivarli dal vivo per la demo.
          </p>
        </CardBody>
      </Card>

      <ParametriModificabili />

      {/* Dati dimostrativi */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-tenda" />
            <div>
              <p className="text-sm font-semibold text-profondo">Dati dimostrativi</p>
              <p className="text-xs text-profondo/55">
                Le modifiche fatte in demo (assegnazioni, incassi, costi, prenotazioni) restano in memoria. Ripristina per ripartire da capo.
              </p>
            </div>
          </div>
          <Button variante="secondario" dimensione="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Ripristina dati demo
          </Button>
        </CardBody>
      </Card>

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

      {/* Utenti e ruoli */}
      <Card>
        <CardHeader
          titolo={
            <span className="inline-flex items-center gap-2">
              <Users2 className="h-4 w-4 text-cabina" /> Utenti e ruoli
            </span>
          }
          sottotitolo="Permessi dimostrativi, non ancora applicati"
        />
        <CardBody className="pt-1">
          {ruoli.map((r) => (
            <div
              key={r.nome}
              className="flex items-center justify-between gap-4 border-b border-calce-200 py-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-profondo">{r.nome}</p>
                <p className="text-xs text-profondo/55">{r.permessi}</p>
              </div>
              <Badge tono={r.tono}>Ruolo</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
