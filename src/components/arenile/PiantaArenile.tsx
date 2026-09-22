import { Umbrella, Coffee, UtensilsCrossed, LifeBuoy, DoorOpen } from 'lucide-react'
import type { FilaId, Postazione as TPostazione } from '@/data/types'
import { config } from '@/data/config'
import { Postazione } from './Postazione'

interface PiantaProps {
  postazioni: TPostazione[]
  selezionataId?: string
  isAttenuata: (p: TPostazione) => boolean
  onSelect: (id: string) => void
}

// Colonna della griglia per il numero postazione (con 2 passerelle a col 9 e 17)
function colDi(n: number): number {
  if (n <= 7) return 1 + n
  if (n <= 14) return 2 + n
  return 3 + n
}

const gridColumns =
  '30px repeat(7, minmax(1.9rem, 2.3rem)) 14px repeat(7, minmax(1.9rem, 2.3rem)) 14px repeat(6, minmax(1.9rem, 2.3rem))'

const legnoPasserella =
  'repeating-linear-gradient(0deg, #C79A62 0 7px, #BB8B52 7px 8px)'

export function PiantaArenile({ postazioni, selezionataId, isAttenuata, onSelect }: PiantaProps) {
  const file = config.arenile.file as readonly FilaId[]
  const perFila = new Map<FilaId, TPostazione[]>()
  for (const p of postazioni) {
    const arr = perFila.get(p.fila) ?? []
    arr.push(p)
    perFila.set(p.fila, arr)
  }

  return (
    <div className="overflow-x-auto rounded-card border border-calce-200 bg-[#EDE2CC] shadow-card">
      <div className="min-w-[760px]">
        {/* Mare + battigia */}
        <div className="relative h-20 bg-gradient-to-b from-[#2E7D9A] via-[#4E97B2] to-[#7FB7A8]">
          <div className="absolute inset-x-0 top-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">
            Mar Tirreno
          </div>
          {/* Torrette di salvataggio agli angoli fronte mare */}
          <Torretta className="left-4" />
          <Torretta className="right-4" />
          {/* battigia */}
          <div className="absolute inset-x-0 bottom-0 h-3 bg-[#D9C8A0]" />
        </div>

        <div className="flex">
          {/* Cabine su un lato */}
          <div className="flex w-14 flex-col items-center gap-1 border-r border-[#D9C39A] bg-[#E6D6B2] py-3">
            <span className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-profondo/50">
              Cabine
            </span>
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="h-3.5 w-8 rounded-[3px] border border-[#C9A978]"
                style={{ background: i % 2 ? '#7FB7A8' : '#2E7D9A' }}
              />
            ))}
            <span className="mt-1 text-[10px] text-profondo/40">+28</span>
          </div>

          {/* Griglia postazioni con passerelle */}
          <div className="flex-1 overflow-hidden px-3 py-3">
            <div
              className="grid items-center gap-y-1.5"
              style={{ gridTemplateColumns: gridColumns }}
            >
              {/* passerelle verticali continue */}
              <div
                className="rounded-sm"
                style={{ gridColumn: 9, gridRow: `1 / ${file.length + 1}`, background: legnoPasserella }}
              />
              <div
                className="rounded-sm"
                style={{ gridColumn: 17, gridRow: `1 / ${file.length + 1}`, background: legnoPasserella }}
              />

              {file.map((fila, f) => {
                const post = (perFila.get(fila) ?? []).sort((a, b) => a.numero - b.numero)
                return (
                  <RigaFila key={fila} fila={fila} riga={f + 1}>
                    {post.map((p) => (
                      <div
                        key={p.id}
                        style={{ gridColumn: colDi(p.numero), gridRow: f + 1 }}
                        className="grid place-items-center"
                      >
                        <Postazione
                          postazione={p}
                          selezionata={p.id === selezionataId}
                          attenuata={isAttenuata(p)}
                          onClick={onSelect}
                        />
                      </div>
                    ))}
                  </RigaFila>
                )
              })}
            </div>
          </div>
        </div>

        {/* Servizi + strada */}
        <div className="flex items-stretch gap-2 border-t border-[#D9C39A] bg-[#E6D6B2] px-3 py-2.5">
          <Blocco icona={Coffee} testo="Bar" />
          <Blocco icona={UtensilsCrossed} testo="Ristorante" />
          <div className="flex-1" />
          <Blocco icona={DoorOpen} testo="Ingresso" chiaro />
        </div>
        <div className="flex items-center justify-center gap-2 bg-[#5B6266] py-1 text-[10px] font-medium uppercase tracking-[0.3em] text-white/70">
          <span className="h-px w-8 bg-white/40" /> Lungomare <span className="h-px w-8 bg-white/40" />
        </div>
      </div>
    </div>
  )
}

function RigaFila({ fila, riga, children }: { fila: FilaId; riga: number; children: React.ReactNode }) {
  return (
    <>
      <div
        style={{ gridColumn: 1, gridRow: riga }}
        className="grid h-9 place-items-center text-xs font-bold text-profondo/45"
      >
        {fila}
      </div>
      {children}
    </>
  )
}

function Torretta({ className }: { className?: string }) {
  return (
    <div className={`absolute top-3 ${className} flex flex-col items-center`}>
      <div className="grid h-6 w-6 place-items-center rounded-md bg-[#E4572E] shadow">
        <LifeBuoy className="h-4 w-4 text-white" />
      </div>
      <span className="mt-0.5 text-[9px] font-medium text-white/80">salvataggio</span>
    </div>
  )
}

function Blocco({
  icona: Icona,
  testo,
  chiaro,
}: {
  icona: typeof Umbrella
  testo: string
  chiaro?: boolean
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
        chiaro ? 'bg-white text-profondo' : 'bg-profondo text-white'
      }`}
    >
      <Icona className="h-4 w-4" />
      {testo}
    </div>
  )
}
