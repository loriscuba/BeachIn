/**
 * ModuloGate — protegge una rotta in base al piano del cliente e ai permessi dell'utente.
 * - Modulo non attivo → pagina di upsell (`ModuloBloccato`), così i link diretti non danno 404 ma propongono la vendita.
 * - Nessun permesso sulla sezione → `AccessoNegato`.
 * - Solo lettura → la pagina è avvolta in `SolaLettura` (le scritture le rifiuta comunque il database, RLS).
 */
import type { ReactNode } from 'react'
import { useModuli } from '@/context/ModuliContext'
import { useSessione } from '@/context/SessioneContext'
import type { ModuloId } from '@/config/moduli'
import { sezioneDi } from '@/lib/permessi'
import ModuloBloccato from '@/pages/ModuloBloccato'
import { AccessoNegato } from '@/components/AccessoNegato'
import { SolaLettura } from '@/components/SolaLettura'

export function ModuloGate({ id, children }: { id: ModuloId; children: ReactNode }) {
  const { moduloAttivo } = useModuli()
  const { livello } = useSessione()
  if (!moduloAttivo(id)) return <ModuloBloccato id={id} />
  const l = livello(sezioneDi(id))
  if (l === 0) return <AccessoNegato />
  return l === 1 ? <SolaLettura>{children}</SolaLettura> : <>{children}</>
}
