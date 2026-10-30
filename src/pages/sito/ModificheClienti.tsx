/**
 * Sito → Modifiche clienti: fino a quando chi ha prenotato dal sito può modificare o annullare dal link della mail
 * (impostazioni `prenotazioniCliente.*`, lette anche dal DB) e le ultime modifiche fatte dai clienti.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Save, Ticket, UtensilsCrossed } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { config } from '@/data/config'
import { salvaImpostazioni, valoriCorrenti } from '@/lib/impostazioni'
import { data as fmtData } from '@/lib/formatters'

const quando = (ts: number) => new Date(ts).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function ModificheClienti() {
  const { richiesteRistorante, richiesteEventi } = useDemoData()
  const [ore, setOre] = useState({ tavolo: String(config.prenotazioniCliente.oreTavolo), evento: String(config.prenotazioniCliente.oreEvento) })
  const [stato, setStato] = useState<string>()

  const salva = async () => {
    const t = Number(ore.tavolo), e = Number(ore.evento)
    if (!(t >= 0) || !(e >= 0)) { setStato('Scrivi un numero di ore (0 o più).'); return }
    setStato('Salvataggio…')
    const errore = await salvaImpostazioni({ ...valoriCorrenti(), 'prenotazioniCliente.oreTavolo': t, 'prenotazioniCliente.oreEvento': e })
    setStato(errore ? `Errore: ${errore}` : 'Salvato')
  }

  const modifiche = useMemo(() => [
    ...richiesteRistorante.filter((r) => r.azioneCliente && r.azioneTs).map((r) => ({
      id: r.id, evento: false, nome: r.nome, azione: r.azioneCliente!, ts: r.azioneTs!,
      testo: `Tavolo · ${r.coperti} persone · ${r.turno === 'pranzo' ? 'pranzo' : 'cena'}${r.ora ? ` alle ${r.ora}` : ''} del ${fmtData(r.data)}`,
    })),
    ...richiesteEventi.filter((r) => r.azioneCliente && r.azioneTs).map((r) => ({
      id: r.id, evento: true, nome: r.nome, azione: r.azioneCliente!, ts: r.azioneTs!,
      testo: `${r.eventoNome} · ${r.persone} persone · ${fmtData(r.eventoData)}`,
    })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 40), [richiesteRistorante, richiesteEventi])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card>
        <CardHeader titolo="Fino a quando possono cambiare" sottotitolo="Nella mail di ricevuta e di conferma il cliente trova «Modifica o annulla»" />
        <CardBody className="space-y-3 pt-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-profondo/60">Tavolo: fino a quante ore prima dell’orario</span>
            <input type="number" min={0} step={1} inputMode="numeric" value={ore.tavolo} onChange={(e) => setOre((o) => ({ ...o, tavolo: e.target.value }))}
              className="h-11 w-full rounded-xl border border-calce-200 bg-white px-3 text-base text-profondo" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-profondo/60">Evento: fino a quante ore prima del giorno dell’evento</span>
            <input type="number" min={0} step={1} inputMode="numeric" value={ore.evento} onChange={(e) => setOre((o) => ({ ...o, evento: e.target.value }))}
              className="h-11 w-full rounded-xl border border-calce-200 bg-white px-3 text-base text-profondo" />
          </label>
          <p className="text-xs text-profondo/55">
            Dopo il limite la pagina mostra solo il vostro telefono. Le prenotazioni già confermate restano confermate anche se il cliente le modifica: se cambia giorno o turno il tavolo va riassegnato.
          </p>
          <div className="flex items-center gap-3">
            <Button variante="primario" dimensione="sm" onClick={() => void salva()}><Save className="h-4 w-4" /> Salva</Button>
            {stato && <span className="text-sm text-profondo/60">{stato}</span>}
          </div>
          <p className="text-xs text-profondo/50">
            Per togliere il pulsante dalle mail spegni la funzionalità «Modifica e annulla dal sito» in{' '}
            <Link to="/impostazioni?tab=moduli" className="font-medium text-cabina hover:underline">Impostazioni → Moduli e funzionalità</Link>.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader titolo="Ultime modifiche dei clienti" sottotitolo="Annullamenti e cambi fatti dal link della mail" />
        <CardBody className="pt-1">
          {modifiche.length === 0 ? <p className="py-6 text-center text-sm text-profondo/50">Ancora nessuna modifica dai clienti.</p> : (
            <ul className="divide-y divide-calce-200">
              {modifiche.map((m) => (
                <li key={`${m.id}-${m.ts}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-profondo">
                      {m.evento ? <Ticket className="h-4 w-4 text-cabina" /> : <UtensilsCrossed className="h-4 w-4 text-cabina" />} {m.nome}
                    </p>
                    <p className="num text-xs text-profondo/55">{m.testo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num text-xs text-profondo/50">{quando(m.ts)}</span>
                    <Badge tono={m.azione === 'annulla' ? 'rosso' : 'giallo'} puntino>{m.azione === 'annulla' ? 'Annullata' : 'Modificata'}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
