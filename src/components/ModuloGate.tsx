/**
 * ModuloGate — protegge una rotta in base al piano del cliente.
 * Se il modulo è attivo mostra la pagina; altrimenti la pagina di upsell
 * (`ModuloBloccato`), così i link diretti non danno 404 ma propongono la
 * vendita.
 */
import type { ReactNode } from 'react'
import { useModuli } from '@/context/ModuliContext'
import type { ModuloId } from '@/config/moduli'
import ModuloBloccato from '@/pages/ModuloBloccato'

export function ModuloGate({ id, children }: { id: ModuloId; children: ReactNode }) {
  const { moduloAttivo } = useModuli()
  return moduloAttivo(id) ? <>{children}</> : <ModuloBloccato id={id} />
}
