import { useMemo, useState } from 'react'
import {
  User, CalendarRange, Tag, Coffee, Wrench, ArrowLeftRight, LogOut, CheckCircle2, UserPlus,
} from 'lucide-react'
import type { Cliente } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { euro, euroCent, data as fmtData } from '@/lib/formatters'
import { etichetteTipologia, stiliStato } from '@/lib/arenile'

interface Props {
  postazioneId?: string
  clienti: Cliente[]
  onChiudi: () => void
}

type Modo = 'vista' | 'assegna' | 'sposta'

export function PannelloPostazione({ postazioneId, clienti, onChiudi }: Props) {
  const { postazioni, conti, assegnaPostazione, liberaPostazione, spostaPostazione, segnaFuoriServizio, incassaConto } =
    useDemoData()
  const [modo, setModo] = useState<Modo>('vista')

  const p = postazioni.find((x) => x.id === postazioneId)
  const clientiMap = useMemo(() => new Map(clienti.map((c) => [c.id, c])), [clienti])
  const cliente = p?.clienteId ? clientiMap.get(p.clienteId) : undefined
  const conto = conti.find((c) => c.postazioneId === p?.id && c.aperto)
  const totaleConto = conto ? conto.righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0) : 0

  // reset modalità alla chiusura/cambio postazione
  const chiudi = () => {
    setModo('vista')
    onChiudi()
  }

  const stile = p ? stiliStato[p.stato] : undefined

  return (
    <Drawer
      aperto={!!p}
      onChiudi={chiudi}
      intestazione={
        p && stile ? (
          <div className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold shadow"
              style={{ background: stile.colore, color: stile.testo }}
            >
              {p.numero}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-profondo">Postazione {p.id}</h2>
                <Badge
                  tono={
                    p.stato === 'occupata' ? 'boa' : p.stato === 'stagionale' ? 'stagionale'
                      : p.stato === 'prenotata' ? 'tenda' : p.stato === 'libera' ? 'acqua' : 'spento'
                  }
                  puntino
                >
                  {stile.label}
                </Badge>
              </div>
              <p className="text-xs text-profondo/55">
                Fila {p.fila} · {etichetteTipologia[p.tipologia]}
              </p>
            </div>
          </div>
        ) : undefined
      }
    >
      {!p ? null : modo === 'assegna' ? (
        <FormAssegna
          clienti={clienti}
          tariffaDefault={p.tariffaApplicata ?? 0}
          onAnnulla={() => setModo('vista')}
          onConferma={(opz) => {
            assegnaPostazione(p.id, opz)
            setModo('vista')
          }}
        />
      ) : modo === 'sposta' ? (
        <FormSposta
          libere={postazioni.filter((x) => x.stato === 'libera')}
          onAnnulla={() => setModo('vista')}
          onConferma={(destId) => {
            spostaPostazione(p.id, destId)
            chiudi()
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Cliente */}
          <Sezione icona={User} titolo="Cliente">
            {cliente ? (
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-profondo">
                  {cliente.nome} {cliente.cognome}
                </p>
                <p className="text-xs text-profondo/60 capitalize">
                  {cliente.tipologia} · {cliente.componenti} pers.
                  {cliente.conBambini ? ' · con bambini' : ''}
                </p>
                <p className="num text-xs text-profondo/60">{cliente.telefono}</p>
                {cliente.saldoAperto > 0 && (
                  <p className="text-xs font-medium text-boa">
                    Saldo aperto {euro(cliente.saldoAperto)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-profondo/50">Nessun cliente assegnato.</p>
            )}
          </Sezione>

          {/* Periodo + tariffa */}
          <div className="grid grid-cols-2 gap-3">
            <Sezione icona={CalendarRange} titolo="Periodo">
              {p.periodoDal ? (
                <p className="num text-sm text-profondo">
                  {fmtData(p.periodoDal)}
                  {p.periodoAl && p.periodoAl !== p.periodoDal ? ` – ${fmtData(p.periodoAl)}` : ''}
                </p>
              ) : (
                <p className="text-sm text-profondo/50">—</p>
              )}
            </Sezione>
            <Sezione icona={Tag} titolo="Tariffa">
              <p className="num text-sm font-semibold text-profondo">
                {p.tariffaApplicata ? euro(p.tariffaApplicata) : '—'}
                {p.stato === 'stagionale' ? (
                  <span className="text-xs font-normal text-profondo/50"> /stag.</span>
                ) : p.stato === 'occupata' ? (
                  <span className="text-xs font-normal text-profondo/50"> /giorno</span>
                ) : null}
              </p>
            </Sezione>
          </div>

          {/* Nota fuori servizio */}
          {p.stato === 'fuori_servizio' && p.note && (
            <div className="flex items-start gap-2 rounded-lg bg-calce-200 px-3 py-2 text-sm text-profondo/70">
              <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
              {p.note}
            </div>
          )}

          {/* Conto bar */}
          <Sezione icona={Coffee} titolo="Conto bar">
            {conto ? (
              <div className="rounded-lg border border-calce-200 bg-white">
                <ul className="divide-y divide-calce-200">
                  {conto.righe.map((r, i) => (
                    <li key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                      <span className="text-profondo/80">
                        <span className="num text-profondo/50">{r.quantita}×</span> {r.nome}
                      </span>
                      <span className="num text-profondo">{euroCent(r.quantita * r.prezzoUnitario)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-calce-200 px-3 py-2">
                  <span className="text-sm font-semibold text-profondo">Totale</span>
                  <span className="num text-sm font-bold text-profondo">{euroCent(totaleConto)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-profondo/50">Nessun conto aperto.</p>
            )}
          </Sezione>
        </div>
      )}

      {/* Azioni (piè) */}
      {p && modo === 'vista' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {p.stato === 'libera' || p.stato === 'fuori_servizio' ? (
            <Button variante="primario" onClick={() => setModo('assegna')} className="col-span-2">
              <UserPlus className="h-4 w-4" /> Assegna postazione
            </Button>
          ) : (
            <>
              {conto && (
                <Button
                  variante="primario"
                  className="col-span-2"
                  onClick={() => incassaConto(conto.id)}
                >
                  <CheckCircle2 className="h-4 w-4" /> Incassa conto {euro(totaleConto)}
                </Button>
              )}
              <Button variante="secondario" onClick={() => setModo('sposta')}>
                <ArrowLeftRight className="h-4 w-4" /> Sposta
              </Button>
              <Button variante="secondario" onClick={() => liberaPostazione(p.id)}>
                <LogOut className="h-4 w-4" /> Libera
              </Button>
            </>
          )}
          {p.stato !== 'fuori_servizio' && (
            <Button
              variante="fantasma"
              className="col-span-2 text-boa"
              onClick={() => segnaFuoriServizio(p.id, 'Segnalata fuori servizio dalla reception')}
            >
              <Wrench className="h-4 w-4" /> Segna fuori servizio
            </Button>
          )}
        </div>
      )}
    </Drawer>
  )
}

function Sezione({
  icona: Icona,
  titolo,
  children,
}: {
  icona: typeof User
  titolo: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">
        <Icona className="h-3.5 w-3.5" /> {titolo}
      </p>
      {children}
    </div>
  )
}

function FormAssegna({
  clienti,
  tariffaDefault,
  onAnnulla,
  onConferma,
}: {
  clienti: Cliente[]
  tariffaDefault: number
  onAnnulla: () => void
  onConferma: (opz: { clienteId?: string; periodoDal: string; periodoAl: string; tariffaApplicata: number }) => void
}) {
  const oggi: string = config.stagione.oggi
  const [clienteId, setClienteId] = useState('')
  const [dal, setDal] = useState<string>(oggi)
  const [al, setAl] = useState<string>(oggi)
  const [tariffa, setTariffa] = useState(String(tariffaDefault))

  const opzioniClienti = [
    { valore: '', etichetta: '— Cliente di passaggio —' },
    ...clienti
      .filter((c) => !c.postazioneId)
      .slice(0, 120)
      .map((c) => ({ valore: c.id, etichetta: `${c.cognome} ${c.nome} (${c.tipologia})` })),
  ]

  return (
    <div className="space-y-3">
      <Campo label="Cliente">
        <Select opzioni={opzioniClienti} value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Dal">
          <input type="date" value={dal} onChange={(e) => setDal(e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Al">
          <input type="date" value={al} onChange={(e) => setAl(e.target.value)} className={inputCls} />
        </Campo>
      </div>
      <Campo label="Tariffa applicata (€)">
        <input
          type="number"
          value={tariffa}
          onChange={(e) => setTariffa(e.target.value)}
          className={`${inputCls} num`}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variante="secondario" onClick={onAnnulla}>
          Annulla
        </Button>
        <Button
          variante="primario"
          onClick={() =>
            onConferma({
              clienteId: clienteId || undefined,
              periodoDal: dal,
              periodoAl: al,
              tariffaApplicata: Number(tariffa) || 0,
            })
          }
        >
          Conferma
        </Button>
      </div>
    </div>
  )
}

function FormSposta({
  libere,
  onAnnulla,
  onConferma,
}: {
  libere: { id: string; fila: string; numero: number }[]
  onAnnulla: () => void
  onConferma: (destId: string) => void
}) {
  const [dest, setDest] = useState(libere[0]?.id ?? '')
  return (
    <div className="space-y-3">
      <p className="text-sm text-profondo/60">Scegli una postazione libera dove spostare cliente e conto.</p>
      <Campo label="Destinazione">
        <Select
          opzioni={libere.map((l) => ({ valore: l.id, etichetta: `${l.id} (fila ${l.fila})` }))}
          value={dest}
          onChange={(e) => setDest(e.target.value)}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variante="secondario" onClick={onAnnulla}>
          Annulla
        </Button>
        <Button variante="primario" onClick={() => dest && onConferma(dest)} disabled={!dest}>
          Sposta qui
        </Button>
      </div>
    </div>
  )
}

const inputCls =
  'h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring'

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-profondo/60">{label}</span>
      {children}
    </label>
  )
}
