import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Cliente, StatoPostazione, TipologiaPostazione } from '@/data/types'
import { getClienti } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { contatoriArenile } from '@/lib/calcoli'
import { stiliStato, etichetteTipologia } from '@/lib/arenile'
import { percento } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { Select } from '@/components/ui/Select'
import { PiantaArenile } from '@/components/arenile/PiantaArenile'
import { PannelloPostazione } from '@/components/arenile/PannelloPostazione'

type FiltroStato = StatoPostazione | 'tutte'
type FiltroTipologia = TipologiaPostazione | 'tutte'

const statiOrdine: StatoPostazione[] = ['libera', 'occupata', 'prenotata', 'stagionale', 'fuori_servizio']

export default function Arenile() {
  const { postazioni, clientiAggiunti } = useDemoData()
  const [clientiApi, setClientiApi] = useState<Cliente[]>([])
  const [selezionataId, setSelezionataId] = useState<string | undefined>()
  const [filtroStato, setFiltroStato] = useState<FiltroStato>('tutte')
  const [filtroTip, setFiltroTip] = useState<FiltroTipologia>('tutte')
  const [ricerca, setRicerca] = useState('')

  useEffect(() => {
    getClienti().then(setClientiApi)
  }, [])

  // I clienti creati in demo sono subito assegnabili
  const clienti = useMemo(() => [...clientiAggiunti, ...clientiApi], [clientiAggiunti, clientiApi])
  const contatori = useMemo(() => contatoriArenile(postazioni), [postazioni])
  const clientiMap = useMemo(() => new Map(clienti.map((c) => [c.id, c])), [clienti])

  const filtriAttivi = filtroStato !== 'tutte' || filtroTip !== 'tutte' || ricerca.trim() !== ''

  const isAttenuata = (p: (typeof postazioni)[number]) => {
    if (!filtriAttivi) return false
    if (filtroStato !== 'tutte' && p.stato !== filtroStato) return true
    if (filtroTip !== 'tutte' && p.tipologia !== filtroTip) return true
    if (ricerca.trim()) {
      const q = ricerca.trim().toLowerCase()
      const c = p.clienteId ? clientiMap.get(p.clienteId) : undefined
      const nome = c ? `${c.nome} ${c.cognome}`.toLowerCase() : ''
      if (!nome.includes(q) && !p.id.toLowerCase().includes(q)) return true
    }
    return false
  }

  return (
    <div className="space-y-4">
      {/* Contatori sempre visibili */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Contatore etichetta="Occupazione" valore={percento(contatori.occupazione)} accento="#0F3B4C" grande />
        {statiOrdine.map((s) => (
          <Contatore
            key={s}
            etichetta={stiliStato[s].label}
            valore={String(contatoriPer(contatori, s))}
            accento={stiliStato[s].colore}
            onClick={() => setFiltroStato((v) => (v === s ? 'tutte' : s))}
            attivo={filtroStato === s}
          />
        ))}
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-profondo/40" />
          <input
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca cliente o postazione…"
            className="h-9 w-full rounded-lg border border-calce-200 bg-white pl-9 pr-8 text-sm text-profondo focus-visible:focus-ring"
          />
          {ricerca && (
            <button
              onClick={() => setRicerca('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-profondo/40 hover:text-profondo"
              aria-label="Pulisci"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="w-44">
          <Select
            value={filtroTip}
            onChange={(e) => setFiltroTip(e.target.value as FiltroTipologia)}
            opzioni={[
              { valore: 'tutte', etichetta: 'Tutte le tipologie' },
              ...Object.entries(etichetteTipologia).map(([v, l]) => ({ valore: v, etichetta: l })),
            ]}
          />
        </div>
        {filtriAttivi && (
          <button
            onClick={() => {
              setFiltroStato('tutte')
              setFiltroTip('tutte')
              setRicerca('')
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-cabina hover:underline"
          >
            <X className="h-4 w-4" /> Azzera filtri
          </button>
        )}
      </div>

      {/* Pianta */}
      <PiantaArenile
        postazioni={postazioni}
        selezionataId={selezionataId}
        isAttenuata={isAttenuata}
        onSelect={setSelezionataId}
      />

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-profondo/60">
        {statiOrdine.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: stiliStato[s].colore }} />
            {stiliStato[s].label}
          </span>
        ))}
      </div>

      <PannelloPostazione
        postazioneId={selezionataId}
        clienti={clienti}
        onChiudi={() => setSelezionataId(undefined)}
      />
    </div>
  )
}

function contatoriPer(
  c: ReturnType<typeof contatoriArenile>,
  s: StatoPostazione
): number {
  switch (s) {
    case 'libera': return c.libere
    case 'occupata': return c.occupate
    case 'prenotata': return c.prenotate
    case 'stagionale': return c.stagionali
    case 'fuori_servizio': return c.fuoriServizio
  }
}

function Contatore({
  etichetta,
  valore,
  accento,
  grande,
  onClick,
  attivo,
}: {
  etichetta: string
  valore: string
  accento: string
  grande?: boolean
  onClick?: () => void
  attivo?: boolean
}) {
  const Cmp = onClick ? 'button' : 'div'
  return (
    <Cmp
      onClick={onClick}
      className={cn(
        'rounded-card border bg-white px-3 py-2.5 text-left shadow-card transition-colors',
        onClick && 'hover:border-calce-300',
        attivo ? 'border-profondo ring-1 ring-profondo' : 'border-calce-200'
      )}
    >
      <div className="flex items-center gap-1.5">
        {!grande && <span className="h-2.5 w-2.5 rounded-full" style={{ background: accento }} />}
        <span className="text-[11px] font-medium uppercase tracking-wide text-profondo/50">
          {etichetta}
        </span>
      </div>
      <p
        className="num mt-0.5 font-bold text-profondo"
        style={{ fontSize: grande ? '1.6rem' : '1.35rem', color: grande ? accento : undefined }}
      >
        {valore}
      </p>
    </Cmp>
  )
}
