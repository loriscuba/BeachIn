import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { euro, euroK } from '@/lib/formatters'

export interface MeseCE {
  mese: string
  label: string
  ricavi: number
  costi: number
  margine: number
}

export function GraficoMensile({ dati }: { dati: MeseCE[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dati} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="#DCE4E6" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#0F3B4C99' }} tickLine={false} axisLine={{ stroke: '#DCE4E6' }} />
          <YAxis tick={{ fontSize: 11, fill: '#0F3B4C99' }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => euroK(v as number)} />
          <Tooltip
            cursor={{ fill: '#0F3B4C0D' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const r = payload[0].payload as MeseCE
              return (
                <div className="rounded-lg border border-calce-200 bg-white px-3 py-2 shadow-pop">
                  <p className="mb-1 text-xs font-semibold text-profondo">{label}</p>
                  <Riga colore="#0F7BA6" nome="Ricavi" v={r.ricavi} />
                  <Riga colore="#C0392B" nome="Costi" v={r.costi} />
                  <div className="mt-1 flex items-center justify-between gap-4 border-t border-calce-200 pt-1 text-xs">
                    <span className="font-semibold text-profondo">Margine</span>
                    <span className={`num font-bold ${r.margine >= 0 ? 'text-profondo' : 'text-boa'}`}>{euro(r.margine)}</span>
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="ricavi" fill="#0F7BA6" radius={[3, 3, 0, 0]} maxBarSize={34} />
          <Bar dataKey="costi" fill="#C0392B" radius={[3, 3, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Riga({ colore, nome, v }: { colore: string; nome: string; v: number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5 text-profondo/70">
        <span className="h-2 w-2 rounded-full" style={{ background: colore }} /> {nome}
      </span>
      <span className="num font-medium text-profondo">{euro(v)}</span>
    </div>
  )
}
