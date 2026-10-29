import { X, RotateCw, CircleCheck, TriangleAlert, OctagonX } from 'lucide-react'
import type { RichiestaRistorante, Turno } from '@/data/types'
import { PiantaTavoli } from '@/pages/ristorante/ScegliTavolo'
import { nomeZona } from '@/lib/zoneTavoli'
import { disponibilitaTurno, sistemazionePer } from '@/lib/disponibilita'
import { useDemoData } from '@/context/DemoDataContext'
import { cn } from '@/lib/cn'

const dataIt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

/** Scelta del tavolo a schermo intero: in orizzontale la pianta della sala, in verticale l'elenco con il consigliato. */
export function SceltaTavolo({ titolo, data, turno, coperti, correnteId, etichettaSenza, onScegli, onChiudi }: {
  titolo: string
  data: string
  turno: Turno
  coperti: number
  correnteId?: string
  /** Bottone per procedere senza tavolo (es. "Conferma senza tavolo", "Togli il tavolo"). */
  etichettaSenza?: string
  onScegli: (tavoloId?: string) => void
  onChiudi: () => void
}) {
  const { tavoliDelGiorno, prenotazioniRistorante } = useDemoData()
  const tavoli = tavoliDelGiorno(data)
  const occupanti = new Map<string, string>()
  for (const p of prenotazioniRistorante) {
    if (p.data === data && p.turno === turno && p.tavoloId && p.stato !== 'annullata') occupanti.set(p.tavoloId, p.nome)
  }
  if (correnteId) occupanti.delete(correnteId)
  const consigliato = disponibilitaTurno(tavoli, prenotazioniRistorante, data, turno, coperti).tavoloAdatto
  const consigliatoId = consigliato?.id !== correnteId ? consigliato?.id : undefined
  // elenco: consigliato, poi liberi adatti (dal più piccolo), poi troppo piccoli, infine occupati
  const peso = (id: string, posti: number) => (id === consigliatoId ? 0 : occupanti.has(id) ? 3 : posti < coperti ? 2 : 1)
  const elenco = [...tavoli].sort((a, b) => peso(a.id, a.posti) - peso(b.id, b.posti) || a.posti - b.posti || a.numero - b.numero)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-calce">
      <div className="flex shrink-0 items-center gap-2 bg-profondo px-3 py-2 text-white">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{titolo} <span className="font-normal capitalize text-white/60">· {dataIt(data)} {turno}</span></p>
        {etichettaSenza && <button onClick={() => onScegli(undefined)} className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold">{etichettaSenza}</button>}
        <button onClick={onChiudi} className="grid h-8 w-8 shrink-0 place-content-center rounded-full hover:bg-white/10" aria-label="Chiudi"><X className="h-5 w-5" /></button>
      </div>

      {/* verticale: invito a girare + elenco */}
      <div className="flex-1 overflow-y-auto p-3 landscape:hidden">
        <p className="flex items-center gap-2 rounded-xl bg-cabina/10 px-3 py-2.5 text-sm text-profondo"><RotateCw className="h-5 w-5 shrink-0 text-cabina" /> Gira il telefono in orizzontale per scegliere sulla pianta della sala.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {elenco.map((t) => {
            const chi = occupanti.get(t.id)
            return (
              <button
                key={t.id}
                disabled={!!chi}
                onClick={() => onScegli(t.id)}
                className={cn('rounded-xl border-2 bg-white p-2 text-left',
                  chi ? 'border-calce-200 bg-calce-200 text-profondo/40'
                    : t.id === correnteId ? 'border-profondo bg-profondo text-white'
                      : t.posti < coperti ? 'border-tenda text-profondo/60' : 'border-cabina',
                  t.id === consigliatoId && 'ring-4 ring-acqua')}
              >
                <span className="block text-lg font-bold leading-none">T{t.numero}</span>
                <span className="mt-1 block truncate text-[11px] opacity-80">{chi ?? `${t.posti} posti`}</span>
                <span className="block truncate text-[10px] opacity-60">{t.id === consigliatoId ? 'consigliato' : nomeZona(t.zona).replace('Ristorante ', '')}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* orizzontale: pianta a tutto schermo */}
      <div className="hidden min-h-0 flex-1 p-2 landscape:block">
        <PiantaTavoli className="h-full w-full" coperti={coperti} tavoli={tavoli} occupanti={occupanti} correnteId={correnteId} consigliatoId={consigliatoId} onScegli={(id) => onScegli(id)} />
      </div>
    </div>
  )
}


/** Controllo immediato sotto la richiesta: il giorno è aperto? quanti tavoli liberi ci sono? ce n'è uno adatto? */
export function Disponibilita({ r }: { r: RichiestaRistorante }) {
  const { tavoliDelGiorno, prenotazioniRistorante, giorniChiusi } = useDemoData()
  const chiuso = giorniChiusi.find((g) => g.data === r.data)
  if (chiuso) {
    return (
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-boa/10 px-3 py-2.5 text-sm font-medium text-boa">
        <OctagonX className="mt-0.5 h-4 w-4 shrink-0" /> Quel giorno il ristorante è segnato come chiuso{chiuso.nota ? ` (${chiuso.nota})` : ''}.
      </p>
    )
  }
  const d = disponibilitaTurno(tavoliDelGiorno(r.data), prenotazioniRistorante, r.data, r.turno, r.coperti)
  const unione = d.tavoloAdatto ? undefined : sistemazionePer(d.liberi, r.coperti)
  const esito = d.pieno
    ? { tono: 'bg-boa/10 text-boa', Icona: OctagonX, testo: `Tutto pieno a ${r.turno}` }
    : d.tavoloAdatto
      ? { tono: 'bg-acqua/15 text-profondo', Icona: CircleCheck, testo: `C'è posto: tavolo ${d.tavoloAdatto.numero} da ${d.tavoloAdatto.posti} posti libero` }
      : unione
        ? { tono: 'bg-tenda/20 text-[#7A5A12]', Icona: TriangleAlert, testo: `Nessun tavolo da ${r.coperti}: unire i tavoli ${unione.tavoli.map((t) => `${t.numero} (${t.posti})`).join(' + ')}` }
        : { tono: 'bg-tenda/20 text-[#7A5A12]', Icona: TriangleAlert, testo: `Nessun tavolo libero da ${r.coperti} posti: serve unire tavoli` }
  return (
    <div className={cn('mt-3 rounded-xl px-3 py-2.5 text-sm', esito.tono)}>
      <p className="flex items-start gap-2 font-semibold"><esito.Icona className="mt-0.5 h-4 w-4 shrink-0" /> {esito.testo}</p>
      <p className="mt-1 pl-6 text-xs text-profondo/65">
        <span className="capitalize">{r.turno}</span> {dataIt(r.data)}: <b className="num">{d.tavoliLiberi}</b> tavoli liberi su {d.tavoliTotali} · <b className="num">{d.postiLiberi}</b> posti liberi su {d.postiTotali}
        {d.senzaTavolo > 0 && <> · {d.senzaTavolo} {d.senzaTavolo === 1 ? 'prenotazione' : 'prenotazioni'} ancora senza tavolo</>}
      </p>
    </div>
  )
}

