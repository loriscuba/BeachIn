/**
 * Pagina di upsell mostrata quando un modulo non è incluso nel piano del
 * cliente. È a tutti gli effetti uno strumento di vendita: spiega il valore del
 * modulo e invita ad attivarlo. In demo, il pulsante "Attiva ora" lo accende
 * dal vivo — perfetto per mostrarlo al cliente.
 */
import { Link } from 'react-router-dom'
import { Lock, Check, Sparkles, Mail } from 'lucide-react'
import { MODULI, type ModuloId } from '@/config/moduli'
import { useModuli } from '@/context/ModuliContext'
import { config } from '@/data/config'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function ModuloBloccato({ id }: { id: ModuloId }) {
  const info = MODULI[id]
  const { attiva } = useModuli()

  const oggetto = encodeURIComponent(`Attivazione modulo ${info.nome} — ${config.nome}`)
  const corpo = encodeURIComponent(
    `Buongiorno,\nvorrei attivare il modulo "${info.nome}" per ${config.nome}.\nGrazie.`
  )

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardBody className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-content-center rounded-card bg-tenda/20 text-tenda">
              <Lock className="h-6 w-6" />
            </span>
            <div>
              <div className="mb-0.5">
                <Badge tono="tenda">Modulo non incluso</Badge>
              </div>
              <h2 className="text-xl font-bold text-profondo">{info.nome}</h2>
            </div>
          </div>

          <p className="mt-4 text-sm text-profondo/70">{info.sottotitolo}</p>

          {info.vantaggi.length > 0 && (
            <ul className="mt-4 space-y-2">
              {info.vantaggi.map((v) => (
                <li key={v} className="flex items-start gap-2 text-sm text-profondo">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-acqua" />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`mailto:${config.email}?subject=${oggetto}&body=${corpo}`}>
              <Button variante="primario">
                <Mail className="h-4 w-4" /> Richiedi attivazione
              </Button>
            </a>
            <Button variante="secondario" onClick={() => attiva(id)}>
              <Sparkles className="h-4 w-4" /> Attiva ora (demo)
            </Button>
            <Link to="/">
              <Button variante="fantasma">Torna alla panoramica</Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-profondo/45">
            «Attiva ora» accende il modulo in questa sessione dimostrativa. In produzione
            l’attivazione è legata al piano del cliente.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
