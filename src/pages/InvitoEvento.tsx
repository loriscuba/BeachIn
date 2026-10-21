/**
 * Invito all'evento (rotta pubblica `/invito?c=CODICE`, link nella mail di conferma).
 * Il cliente lo mostra all'ingresso: il QR contiene questo stesso indirizzo, l'app admin ne legge il codice.
 */
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, Users, CircleCheck } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { QrCodice } from '@/components/QrCodice'
import { logoLido } from '@/assets/sito'
import { config } from '@/data/config'
import { codiceDaTesto, oraDa, urlInvito } from '@/lib/invitiEventi'

const dataIt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

export default function InvitoEvento() {
  const [q] = useSearchParams()
  const codice = codiceDaTesto(q.get('c') ?? '')
  const { richiesteEventi } = useDemoData()
  const r = richiesteEventi.find((x) => x.codice === codice)
  const entrati = r && (r.arrivati ?? 0) >= r.persone

  return (
    <div className="min-h-screen bg-profondo px-4 py-8 text-white">
      <div className="mx-auto max-w-sm text-center">
        <img src={logoLido} alt={config.nome} className="mx-auto h-16 w-auto brightness-0 invert" />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-tenda">Il tuo invito</p>
        {r ? (
          <>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight">{r.eventoNome}</h1>
            <p className="mt-3 inline-flex items-center gap-2 text-white/80"><CalendarDays className="h-4 w-4" /> <span className="capitalize">{dataIt(r.eventoData)}</span></p>
            <p className="mt-1 text-white/80"><Users className="mr-1 inline h-4 w-4" />{r.nome} · {r.persone} {r.persone === 1 ? 'persona' : 'persone'}</p>
          </>
        ) : (
          <h1 className="mt-2 font-display text-3xl font-semibold">{config.nome}</h1>
        )}

        {codice ? (
          <div className="mt-6 rounded-3xl bg-white p-5 text-profondo shadow-xl">
            <QrCodice url={urlInvito(codice)} className="mx-auto w-64 max-w-full" />
            <p className="mt-3 font-mono text-2xl font-bold tracking-[0.3em]">{codice}</p>
            {entrati
              ? <p className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#2F6E5F]"><CircleCheck className="h-5 w-5" /> Ingresso registrato alle {oraDa(r?.arrivoTs)}</p>
              : <p className="mt-2 text-sm text-profondo/60">Mostra questo QR all’ingresso.</p>}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-white/10 p-4 text-white/80">Invito non valido: apri il link dalla mail di conferma.</p>
        )}
        {codice && !r && <p className="mt-4 text-sm text-white/60">Il QR resta valido anche se i dettagli non si caricano: mostralo comunque all’ingresso.</p>}
        <p className="mt-8 text-sm text-white/50">{config.nome} · {config.indirizzo} Savona</p>
      </div>
    </div>
  )
}
