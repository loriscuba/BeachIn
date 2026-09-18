import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { bluGrafico } from '@/lib/graficoColori'
import { percento } from '@/lib/formatters'

export interface FilaOccupazione {
  fila: string
  occupazione: number // frazione
  vendute: number
  totali: number
}

export function OccupazionePerFila({ dati }: { dati: FilaOccupazione[] }) {
  const perc = dati.map((d) => ({ ...d, pct: Math.round(d.occupazione * 100) }))
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={perc} margin={{ top: 16, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#DCE4E6" />
          <XAxis
            dataKey="fila"
            tick={{ fontSize: 12, fill: '#0F3B4C99', fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: '#DCE4E6' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#0F3B4C99' }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ fill: '#0F3B4C0D' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const r = payload[0].payload as (typeof perc)[number]
              return (
                <div className="rounded-lg border border-calce-200 bg-white px-3 py-2 shadow-pop">
                  <p className="text-xs font-semibold text-profondo">Fila {r.fila}</p>
                  <p className="num text-xs text-profondo/70">
                    {percento(r.occupazione)} · {r.vendute}/{r.totali} vendute
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {perc.map((_, i) => (
              <Cell key={i} fill={bluGrafico} />
            ))}
            <LabelList
              dataKey="pct"
              position="top"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: 11, fill: '#0F3B4C', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
