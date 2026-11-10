import type { Dipendente } from '@/data/types'
import { Drawer } from '@/components/ui/Drawer'
import { Badge } from '@/components/ui/Badge'
import { nomeMese } from '@/lib/bustaPaga'
import { etichetteContratto, etichetteRuolo } from '@/lib/etichette'
import { euro, numero, data as fmtData } from '@/lib/formatters'

/** Dettaglio del dipendente: anagrafica, contratto e buste paga importate. */
export function SchedaDipendente({ dipendente: d, onChiudi }: { dipendente: Dipendente | null; onChiudi: () => void }) {
  const buste = d?.bustePaga ?? []
  return (
    <Drawer aperto={!!d} onChiudi={onChiudi} titolo={d ? `${d.nome} ${d.cognome}` : ''} sottotitolo={d ? etichetteRuolo[d.ruolo] : ''}>
      {d && (
        <div className="space-y-5 text-sm">
          <Sezione titolo="Anagrafica">
            <Riga e="Codice fiscale" v={d.codiceFiscale} />
            <Riga e="Nascita" v={d.dataNascita && fmtData(d.dataNascita)} />
            <Riga e="Residenza" v={d.comuneResidenza} />
            <Riga e="Matricola" v={d.matricola} />
            <Riga e="IBAN" v={d.iban} />
          </Sezione>
          <Sezione titolo="Contratto">
            <Riga e="Tipo" v={etichetteContratto[d.tipoContratto]} />
            <Riga e="CCNL" v={d.ccnl} />
            <Riga e="Qualifica" v={d.qualifica} />
            <Riga e="Inquadramento" v={d.inquadramento} />
            <Riga e="Periodo" v={`${fmtData(d.periodoDal)} – ${fmtData(d.periodoAl)}`} />
            <Riga e="Ore settimanali" v={`${d.oreContrattoSettimana} di contratto · ${d.oreLavorateSettimana} lavorate`} />
            <Riga e="Costo orario lordo" v={euro(d.costoOrarioLordo)} />
            <Riga e="Costo aziendale / mese" v={euro(d.costoAziendaleMensile)} />
          </Sezione>
          <Sezione titolo={`Buste paga (${buste.length})`}>
            {buste.length === 0 && <p className="text-profondo/50">Nessuna busta paga importata.</p>}
            {buste.map((b) => (
              <div key={b.periodo} className="rounded-xl border border-calce-200 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="font-semibold text-profondo">{nomeMese(b.periodo)}</p>
                  {b.netto != null && <Badge tono="mare">Netto {euro(b.netto)}</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-profondo/70">
                  {b.totaleLordo != null && <span>Lordo <b className="num text-profondo">{euro(b.totaleLordo)}</b></span>}
                  {b.totaleTrattenute != null && <span>Trattenute <b className="num text-profondo">{euro(b.totaleTrattenute)}</b></span>}
                  {b.giorniLavorati != null && <span>Giorni lavorati <b className="num text-profondo">{numero(b.giorniLavorati)}</b></span>}
                  {b.oreStraordinario != null && <span>Straordinari <b className="num text-profondo">{numero(b.oreStraordinario)} h</b></span>}
                  {b.tfrMese != null && <span>TFR mese <b className="num text-profondo">{euro(b.tfrMese)}</b></span>}
                  {b.ferieResidue != null && <span>Ferie residue <b className="num text-profondo">{numero(b.ferieResidue)} gg</b></span>}
                </div>
                <p className="mt-1.5 truncate text-[11px] text-profondo/40">{b.file} · importata il {fmtData(b.importataIl.slice(0, 10))}</p>
              </div>
            ))}
          </Sezione>
        </div>
      )}
    </Drawer>
  )
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{titolo}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Riga({ e, v }: { e: string; v?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-profondo/55">{e}</span>
      <span className="truncate text-right font-medium text-profondo">{v || '—'}</span>
    </div>
  )
}
