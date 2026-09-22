/**
 * Panoramica — home "ridotta" del pacchetto Ristorante & Web.
 * Mostra i KPI e le liste solo dei moduli inclusi (Ristorante + Sito), senza
 * aggregare i centri della suite completa (quello è il Cruscotto completo).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Users, UtensilsCrossed, BookOpen, Inbox } from 'lucide-react'
import type { PrenotazioneRistorante, ServizioRistoranteGiorno } from '@/data/types'
import { getPrenotazioniRistorante, getServiziRistorante } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { euro, numero } from '@/lib/formatters'

export default function Panoramica() {
  const { menu, richiesteRistorante, prenotazioniOnline } = useDemoData()
  const [servizi, setServizi] = useState<ServizioRistoranteGiorno[]>([])
  const [prenotazioni, setPrenotazioni] = useState<PrenotazioneRistorante[]>([])
  const [caricato, setCaricato] = useState(false)

  useEffect(() => {
    Promise.all([getServiziRistorante(), getPrenotazioniRistorante()]).then(([s, p]) => {
      setServizi(s)
      setPrenotazioni(p)
      setCaricato(true)
    })
  }, [])

  const oggi = config.stagione.oggi

  const kpi = useMemo(() => {
    const s = servizi.filter((x) => x.data === oggi)
    const coperti = s.reduce((a, x) => a + x.coperti, 0)
    const incasso = s.reduce((a, x) => a + x.incasso, 0)
    return { coperti, incasso }
  }, [servizi, oggi])

  const daConfermareSito =
    richiesteRistorante.filter((r) => r.stato === 'da_confermare').length +
    prenotazioniOnline.filter((p) => p.stato === 'da_confermare').length

  const prenOggi = prenotazioni.filter((p) => p.data === oggi)

  if (!caricato) {
    return (
      <div className="grid h-64 place-items-center text-profondo/50">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPI dei moduli attivi */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icona={Users} etichetta="Coperti oggi" valore={numero(kpi.coperti)} />
        <Kpi icona={UtensilsCrossed} etichetta="Incasso ristorante oggi" valore={euro(kpi.incasso)} />
        <Kpi icona={BookOpen} etichetta="Piatti a menù" valore={numero(menu.length)} />
        <Kpi icona={Inbox} etichetta="Dal sito da confermare" valore={numero(daConfermareSito)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ristorante: prenotazioni di oggi */}
        <Card>
          <CardHeader
            titolo="Ristorante · oggi"
            sottotitolo={`${prenOggi.length} prenotazioni`}
            azione={<Link to="/ristorante" className="text-sm font-medium text-cabina hover:underline">Apri</Link>}
          />
          <CardBody className="pt-1">
            <ul className="divide-y divide-calce-200">
              {prenOggi.length === 0 && (
                <li className="py-6 text-center text-sm text-profondo/45">Nessuna prenotazione per oggi.</li>
              )}
              {prenOggi.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-profondo">{p.nome}</p>
                    <p className="text-xs capitalize text-profondo/50">{p.turno}</p>
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

function Kpi({ icona: Icona, etichetta, valore }: { icona: typeof Users; etichetta: string; valore: string }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
          <Icona className="h-3.5 w-3.5 text-cabina" /> {etichetta}
        </p>
        <p className="num mt-0.5 text-2xl font-bold text-profondo">{valore}</p>
      </CardBody>
    </Card>
  )
}
