/**
 * Panoramica — home "ridotta" del pacchetto Ristorante & Web.
 * Mostra i KPI e le liste solo dei moduli inclusi (Ristorante + Sito), senza
 * aggregare i centri della suite completa (quello è il Cruscotto completo).
 */
import { Link } from 'react-router-dom'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Users, Inbox, Globe, Sun } from 'lucide-react'
import type { StatoPrenotazione } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { config } from '@/data/config'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { numero, dataEstesa } from '@/lib/formatters'
import { statoSito } from '@/data/seed/sito'

const ordineStato: Record<StatoPrenotazione, number> = { in_attesa: 0, confermata: 0, arrivata: 1, annullata: 2 }

export default function Panoramica() {
  // Prenotazioni vere (le stesse di Ristorante → Prenotazioni, sincronizzate), non i dati di esempio fissi
  const { magazzino, eventi, richiesteRistorante, prenotazioniOnline, prenotazioniRistorante } = useDemoData()
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

  // Sito: visite di ieri contro la media dei 7 giorni prima
  const visite = statoSito.visite
  const ieri = visite.at(-1)?.visite ?? 0
  const media7 = Math.round(visite.slice(-8, -1).reduce((s, d) => s + d.visite, 0) / Math.max(1, visite.slice(-8, -1).length))
  const deltaVisite = media7 ? Math.round(((ieri - media7) / media7) * 100) : 0

  // Stagione: giorni alla chiusura
  const giorniAllaFine = differenceInCalendarDays(parseISO(config.stagione.fine), parseISO(oggi))

  // Eventi: il prossimo in calendario (countdown)
  const prossimo = [...eventi].filter((e) => e.data >= oggi).sort((a, b) => a.data.localeCompare(b.data))[0]
  const ultimo = [...eventi].filter((e) => e.data < oggi).sort((a, b) => b.data.localeCompare(a.data))[0]
  const traGiorni = prossimo ? differenceInCalendarDays(parseISO(prossimo.data), parseISO(oggi)) : 0

  // Magazzino: articoli sotto la scorta minima
  const sottoScorta = magazzino.filter((a) => a.quantita < a.scortaMinima).sort((a, b) => a.quantita / a.scortaMinima - b.quantita / b.scortaMinima)

  return (
    <div className="space-y-4">
      {/* KPI dei moduli attivi */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icona={Users} etichetta="Coperti oggi" valore={numero(kpi.pranzo + kpi.cena)} sotto={`${kpi.pranzo} pranzo · ${kpi.cena} cena`} />
        <Kpi icona={Inbox} etichetta="Dal sito da confermare" valore={numero(daConfermareSito)} />
        <Kpi icona={Globe} etichetta="Visite sito ieri" valore={numero(ieri)} sotto={`${deltaVisite >= 0 ? '+' : ''}${deltaVisite}% sulla media 7 gg`} />
        <Kpi icona={Sun} etichetta="Stagione" valore={giorniAllaFine > 0 ? `${giorniAllaFine} gg` : 'Ultimo giorno'} sotto={giorniAllaFine > 0 ? `alla chiusura (${dataEstesa(config.stagione.fine)})` : 'buona chiusura!'} />
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

        {/* Eventi: countdown al prossimo */}
        <Card>
          <CardHeader
            titolo="Prossimo evento"
            azione={moduloAttivo('eventi') ? <Link to="/eventi" className="text-sm font-medium text-cabina hover:underline">Apri</Link> : undefined}
          />
          <CardBody className="pt-1">
            {prossimo ? (
              <div className="flex items-center gap-4">
                <div className="shrink-0 rounded-xl bg-tenda/20 px-4 py-2 text-center">
                  <p className="num text-3xl font-bold leading-none text-profondo">{traGiorni}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-profondo/55">{traGiorni === 0 ? 'oggi!' : traGiorni === 1 ? 'giorno' : 'giorni'}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-profondo">{prossimo.nome}</p>
                  <p className="text-xs text-profondo/55">{dataEstesa(prossimo.data)}{prossimo.partecipanti ? ` · ${prossimo.partecipanti} iscritti` : ''}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-profondo/60">{prossimo.descrizione}</p>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-profondo/45">
                Nessun evento in programma.
                {ultimo && <><br />Ultimo: {ultimo.nome}, {differenceInCalendarDays(parseISO(oggi), parseISO(ultimo.data))} giorni fa.</>}
              </p>
            )}
          </CardBody>
        </Card>

        {/* Magazzino: sotto scorta */}
        <Card>
          <CardHeader
            titolo="Magazzino · da riordinare"
            sottotitolo={`${sottoScorta.length} articoli sotto scorta`}
            azione={<Link to="/ristorante?tab=magazzino" className="text-sm font-medium text-cabina hover:underline">Apri</Link>}
          />
          <CardBody className="pt-1">
            <ul className="divide-y divide-calce-200">
              {sottoScorta.length === 0 && (
                <li className="py-6 text-center text-sm text-profondo/45">Scorte a posto.</li>
              )}
              {sottoScorta.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-profondo">{a.nome}</p>
                    <p className="text-xs text-profondo/50">{a.fornitore ?? 'Fornitore non indicato'}</p>
                  </div>
                  <span className="num shrink-0 text-sm text-boa">{numero(a.quantita)} / {numero(a.scortaMinima)} {a.unita}</span>
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
