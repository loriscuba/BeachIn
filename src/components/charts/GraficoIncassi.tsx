import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { GiornoStagione } from '@/data/types'
import { coloriCentro, etichetteCentro, ordineCentriRicavo } from '@/lib/graficoColori'
import { euro, euroK, giornoMese } from '@/lib/formatters'

interface Props {
  giorni: GiornoStagione[]
}

const chiaviCentro = {
  spiaggia: 'incassoSpiaggia',
  ristorante: 'incassoRistorante',
  noleggi: 'incassoNoleggi',
  bar: 'incassoBar',
} as const

export function GraficoIncassi({ giorni }: Props) {
  const dati = giorni.map((g) => ({
    data: g.data,
    etichetta: giornoMese(g.data),
    incassoSpiaggia: g.incassoSpiaggia,
    incassoRistorante: g.incassoRistorante,
    incassoNoleggi: g.incassoNoleggi,
    incassoBar: g.incassoBar,
    totale: g.incassoSpiaggia + g.incassoRistorante + g.incassoNoleggi + g.incassoBar,
  }))

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dati} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="#DCE4E6" strokeDasharray="0" />
            <XAxis
              dataKey="etichetta"
              tick={{ fontSize: 11, fill: '#0F3B4C99' }}
              tickLine={false}
              axisLine={{ stroke: '#DCE4E6' }}
              interval={4}
              minTickGap={8}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#0F3B4C99' }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v) => euroK(v as number)}
            />
            <Tooltip
              cursor={{ fill: '#0F3B4C0D' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const riga = payload[0].payload as (typeof dati)[number]
                return (
                  <div className="rounded-lg border border-calce-200 bg-white px-3 py-2 shadow-pop">
                    <p className="mb-1 text-xs font-semibold text-profondo">{label}</p>
                    {ordineCentriRicavo.map((c) => (
                      <div key={c} className="flex items-center justify-between gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-profondo/70">
                          <span className="h-2 w-2 rounded-full" style={{ background: coloriCentro[c] }} />
                          {etichetteCentro[c]}
                        </span>
                        <span className="num font-medium text-profondo">
                          {euro(riga[chiaviCentro[c]])}
                        </span>
                      </div>
                    ))}
                    <div className="mt-1 flex items-center justify-between gap-4 border-t border-calce-200 pt-1 text-xs">
                      <span className="font-semibold text-profondo">Totale</span>
                      <span className="num font-bold text-profondo">{euro(riga.totale)}</span>
                    </div>
                  </div>
                )
              }}
            />
            {ordineCentriRicavo.map((c, i) => (
              <Bar
                key={c}
                dataKey={chiaviCentro[c]}
                stackId="incassi"
                fill={coloriCentro[c]}
                stroke="#FBFCFC"
                strokeWidth={0.5}
                radius={i === ordineCentriRicavo.length - 1 ? [3, 3, 0, 0] : undefined}
                maxBarSize={26}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda (sempre presente per ≥2 serie) */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {ordineCentriRicavo.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5 text-xs text-profondo/70">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: coloriCentro[c] }} />
            {etichetteCentro[c]}
          </span>
        ))}
      </div>
    </div>
  )
}
