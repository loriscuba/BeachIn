import { Building2, Umbrella, CalendarRange, Percent, Users2, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { config, STATI_POSTAZIONE } from '@/data/config'
import { data, percento } from '@/lib/formatters'

function Riga({ etichetta, valore }: { etichetta: string; valore: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-calce-200 last:border-0">
      <span className="text-sm text-profondo/60">{etichetta}</span>
      <span className="num text-sm font-medium text-profondo text-right">{valore}</span>
    </div>
  )
}

const ruoli = [
  { nome: 'Titolare', permessi: 'Accesso completo a tutti i moduli', tono: 'mare' as const },
  { nome: 'Cassa / Reception', permessi: 'Arenile, clienti, incassi, prenotazioni', tono: 'stagionale' as const },
  { nome: 'Bagnino', permessi: 'Arenile in sola lettura, stati postazioni', tono: 'acqua' as const },
  { nome: 'Ristorazione', permessi: 'Bar, ristorante, magazzino', tono: 'tenda' as const },
]

export default function Impostazioni() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-profondo/60">
        I parametri qui sotto sono definiti in{' '}
        <code className="rounded bg-calce-200 px-1.5 py-0.5 text-[13px] text-profondo">
          src/data/config.ts
        </code>{' '}
        e vanno corretti prima della demo. Il resto dell’app li legge da lì.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Anagrafica */}
        <Card>
          <CardHeader
            titolo={
              <span className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cabina" /> Anagrafica stabilimento
              </span>
            }
          />
          <CardBody className="pt-1">
            <Riga etichetta="Nome" valore={config.nome} />
            <Riga etichetta="Località" valore={config.localita} />
            <Riga etichetta="Indirizzo" valore={config.indirizzo} />
            <Riga etichetta="Telefono" valore={config.telefono} />
            <Riga etichetta="Email" valore={config.email} />
            <Riga etichetta="Partita IVA" valore={config.partitaIva} />
          </CardBody>
        </Card>

        {/* Arenile */}
        <Card>
          <CardHeader
            titolo={
              <span className="inline-flex items-center gap-2">
                <Umbrella className="h-4 w-4 text-cabina" /> Configurazione arenile
              </span>
            }
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

        {/* Aliquote */}
        <Card>
          <CardHeader
            titolo={
              <span className="inline-flex items-center gap-2">
                <Percent className="h-4 w-4 text-cabina" /> Aliquote IVA
              </span>
            }
          />
          <CardBody className="pt-1">
            <Riga etichetta="IVA ordinaria" valore={percento(config.aliquote.ivaOrdinaria)} />
            <Riga etichetta="IVA ridotta (somministrazione)" valore={percento(config.aliquote.ivaRidotta)} />
            <Riga etichetta="IVA super ridotta" valore={percento(config.aliquote.ivaSuperRidotta)} />
            <Riga etichetta="Imposta reg. concessione" valore={percento(config.aliquote.impostaRegionaleConcessione)} />
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
