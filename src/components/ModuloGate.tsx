/**
 * ModuloGate — protegge una rotta in base al piano del cliente e ai permessi dell'utente.
 * - Modulo non attivo → pagina di upsell (`ModuloBloccato`), così i link diretti non danno 404 ma propongono la vendita.
 * - Nessun permesso sulla sezione → `AccessoNegato`.
 * - Solo lettura → la pagina è avvolta in `SolaLettura` (le scritture le rifiuta comunque il database, RLS).
 * - `oppure`: moduli alternativi che aprono la stessa pagina (es. Sala per chi ha solo la Coda bar); vale il livello più alto.
 */
import type { ReactNode } from 'react'
import { useModuli } from '@/context/ModuliContext'
import { useSessione } from '@/context/SessioneContext'
import type { ModuloId } from '@/config/moduli'
import { sezioneDi } from '@/lib/permessi'
import ModuloBloccato from '@/pages/ModuloBloccato'
import { AccessoNegato } from '@/components/AccessoNegato'
import { SolaLettura } from '@/components/SolaLettura'

export function ModuloGate({ id, oppure = [], children }: { id: ModuloId; oppure?: ModuloId[]; children: ReactNode }) {
  const { moduloAttivo } = useModuli()
  const { livello } = useSessione()
  const altri = oppure.filter((m) => moduloAttivo(m))
  if (!moduloAttivo(id) && !altri.length) return <ModuloBloccato id={id} />
  const l = Math.max(...[...(moduloAttivo(id) ? [id] : []), ...altri].map((m) => livello(sezioneDi(m))))
  if (l === 0) return <AccessoNegato />
  return l === 1 ? <SolaLettura>{children}</SolaLettura> : <>{children}</>
}
