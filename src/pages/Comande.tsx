/**
 * Comande dall'ombrellone — servizio in spiaggia.
 * A sinistra si compone l'ordine (numero ombrellone + articoli del bar) e si
 * invia; a destra, al bar, arriva la coda delle comande con lo stato
 * (nuova → presa in carico → in preparazione → pronta). Le comande arrivano anche
 * da ComandApp (`/comandapp`, app del bagnante): all'arrivo suona il campanello del centro notifiche.
 * Con il modulo Bar al tavolo la pagina non c'è più: tutto (coda, Nuova comanda, App clienti) è nel Monitor Bar (/sala?tab=bar).
 */
import { Navigate } from 'react-router-dom'
import { Umbrella, Coffee } from 'lucide-react'
import { useDemoData } from '@/context/DemoDataContext'
import { useModuli } from '@/context/ModuliContext'
import { ComandaCard } from './sala/ComandaOmbrellone'
import { FormComandaOmbrellone, CartaComandApp } from './sala/StrumentiOmbrelloni'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PulsanteSchermoIntero, SchermoIntero, useSchermoIntero } from '@/components/SchermoIntero'

export default function Comande() {
  const { comande, avanzaComanda, annullaComanda } = useDemoData()
  const unica = useModuli().moduloAttivo('bar-tavolo')
  const intero = useSchermoIntero()
  // con il Monitor Bar (modulo Bar al tavolo) questa pagina non serve più: vecchi link e scorciatoie vanno lì
  if (unica) return <Navigate to="/sala?tab=bar" replace />

  const aperte = comande.filter((c) => c.stato !== 'pronta').length

  if (intero.attivo) return (
    <SchermoIntero titolo={<>Comande al bar · <span className="num">{aperte}</span> da evadere</>} onEsci={intero.esci}>
      {!comande.length
        ? <p className="py-10 text-center text-sm text-profondo/45">Nessuna comanda.</p>
        : <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {comande.map((c) => <ComandaCard key={c.id} comanda={c} onAvanza={() => avanzaComanda(c.id)} onAnnulla={() => annullaComanda(c.id)} />)}
        </div>}
    </SchermoIntero>
  )

  return (
    <div className="space-y-4">
      <CartaComandApp />
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Nuovo ordine dall'ombrellone */}
      <Card className="flex flex-col">
        <CardHeader
          titolo={<span className="inline-flex items-center gap-2"><Umbrella className="h-4 w-4 text-cabina" /> Nuovo ordine</span>}
          sottotitolo="Numero ombrellone + articoli del bar"
        />
        <CardBody className="flex flex-1 flex-col gap-3 pt-2">
          <FormComandaOmbrellone />
        </CardBody>
      </Card>

      {/* Coda comande al bar */}
      <Card>
        <CardHeader
          titolo={<span className="inline-flex items-center gap-2"><Coffee className="h-4 w-4 text-cabina" /> Comande al bar</span>}
          sottotitolo="Ordini in arrivo dagli ombrelloni"
          azione={<div className="flex flex-wrap items-center justify-end gap-2"><Badge tono={aperte > 0 ? 'boa' : 'neutro'}>{aperte} da evadere</Badge><PulsanteSchermoIntero onClick={intero.entra} /></div>}
        />
        <CardBody className="space-y-2 pt-2">
          {comande.length === 0 && (
            <p className="py-10 text-center text-sm text-profondo/45">Nessuna comanda. Invia il primo ordine dall'ombrellone.</p>
          )}
          <div className="max-h-[30rem] space-y-2 overflow-y-auto pr-1">
            {comande.map((c) => (
              <ComandaCard key={c.id} comanda={c} onAvanza={() => avanzaComanda(c.id)} onAnnulla={() => annullaComanda(c.id)} />
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
    </div>
  )
}
