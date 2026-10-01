/**
 * Panoramica — home "ridotta" del pacchetto Ristorante & Web.
 * Mostra i KPI e le liste solo dei moduli inclusi (Ristorante + Sito), senza
 * aggregare i centri della suite completa (quello è il Cruscotto completo).
 */
import { Link } from 'react-router-dom'
import { Users, BookOpen, Inbox } from 'lucide-react'
import type { StatoPrenotazione } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { numero } from '@/lib/formatters'

const ordineStato: Record<StatoPrenotazione, number> = { in_attesa: 0, confermata: 0, arrivata: 1, annullata: 2 }

export default function Panoramica() {
  // Prenotazioni vere (le stesse di Ristorante → Prenotazioni, sincronizzate), non i dati di esempio fissi
  const { menu, richiesteRistorante, prenotazioniOnline, prenotazioniRistorante } = useDemoData()
  const { moduloAttivo } = useModuli()
  const oggi = config.stagione.oggi
  const prenOggi = prenotazioniRistorante
    .filter((p) => p.data === oggi && p.stato !== 'annullata')
    .sort((a, b) => (a.turno === b.turno ? 0 : a.turno === 'pranzo' ? -1 : 1) || ordineStato[a.stato] - ordineStato[b.stato] || (a.ora ?? '99').localeCompare(b.ora ?? '99'))
  const coperti = (t: string) => prenOggi.filter((p) => p.turno === t).reduce((s, p) => s + p.coperti, 0)
  const kpi = { pranzo: coperti('pranzo'), cena: coperti('cena') }

  const daConfermareSito =
    richiesteRistorante.filter((r) => r.stato === 'da_confermare').length +
    (moduloAttivo('arenile') ? prenotazioniOnline.filter((p) => p.stato === 'da_confermare').length : 0)

  return (
    <div className="space-y-4">
      {/* KPI dei moduli attivi */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi icona={Users} etichetta="Coperti oggi" valore={numero(kpi.pranzo + kpi.cena)} sotto={`${kpi.pranzo} pranzo · ${kpi.cena} cena`} />
        <Kpi icona={BookOpen} etichetta="Piatti a menù" valore={numero(menu.length)} />
        <Kpi icona={Inbox} etichetta="Dal sito da confermare" valore={numero(daConfermareSito)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ristorante: prenotazioni di oggi */}
        <Card>
          <CardHeader
            titolo="Ristorante · oggi"
            sottotitolo={`${prenOggi.length} prenotazioni${prenOggi.length > 8 ? ' · le prime 8' : ''}`}
            azione={<Link to="/ristorante" className="text-sm font-medium text-cabina hover:underline">Apri</Link>}
          />
          <CardBody className="pt-1">
            <ul className="divide-y divide-calce-200">
              {prenOggi.length === 0 && (
                <li className="py-6 text-center text-sm text-profondo/45">Nessuna prenotazione per oggi.</li>
              )}
              {prenOggi.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-profondo">{p.nome}</p>
                    <p className="text-xs text-profondo/50"><span className="capitalize">{p.turno}</span>{p.ora ? ` · ${p.ora}` : ''}{p.stato === 'arrivata' ? ' · arrivato' : p.stato === 'in_attesa' ? ' · in attesa' : ''}</p>
                  </div>
                  <span className="num shrink-0 text-sm text-profondo/70">{p.coperti} cop.</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* Sito: richieste da confermare */}
        <Card>
          <CardHeader
            titolo="Sito · da confermare"
            sottotitolo={`${daConfermareSito} richieste online`}
            azione={<Link to="/sito" className="text-sm font-medium text-cabina hover:underline">Apri</Link>}
          />
          <CardBody className="pt-1">
            <ul className="divide-y divide-calce-200">
              {daConfermareSito === 0 && (
                <li className="py-6 text-center text-sm text-profondo/45">Nessuna richiesta in attesa.</li>
              )}
              {richiesteRistorante
                .filter((r) => r.stato === 'da_confermare')
                .slice(0, 6)
                .map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-profondo">{r.nome}</p>
                      <p className="text-xs text-profondo/50">Tavolo · {r.coperti} coperti</p>
                    </div>
                    <Badge tono="tenda">Da confermare</Badge>
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Kpi({ icona: Icona, etichetta, valore, sotto }: { icona: typeof Users; etichetta: string; valore: string; sotto?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
          <Icona className="h-3.5 w-3.5 text-cabina" /> {etichetta}
        </p>
        <p className="num mt-0.5 text-2xl font-bold text-profondo">{valore}</p>
        {sotto && <p className="text-xs text-profondo/55">{sotto}</p>}
      </CardBody>
    </Card>
  )
}
