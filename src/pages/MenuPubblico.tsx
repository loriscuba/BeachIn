/**
 * Menu pubblico (aperto dal QR sul tavolo): 5 lingue, legge il menu dal vivo dal context.
 * Rotta `/menu?tavolo=N&lang=en`, fuori dallo shell gestionale.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CategoriaPiatto, LinguaMenu } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { LINGUE, categorieLingue, nomeIn, uiLingue } from '@/lib/menuLingue'
import { logoLido } from '@/assets/sito'
import { config } from '@/data/config'
import { euroCent } from '@/lib/formatters'
import { cn } from '@/lib/cn'

const ORDINE: CategoriaPiatto[] = ['antipasti', 'primi', 'secondi', 'contorni', 'pizze', 'dolci', 'bevande']

function linguaIniziale(param: string | null): LinguaMenu {
  const ok = (l?: string | null): l is LinguaMenu => !!l && LINGUE.some((x) => x.id === l)
  if (ok(param)) return param
  const nav = navigator.language?.slice(0, 2)
  return ok(nav) ? nav : 'it'
}

export default function MenuPubblico() {
  const { menu } = useDemoData()
  const [q, setQ] = useSearchParams()
  const [lingua, setLingua] = useState<LinguaMenu>(() => linguaIniziale(q.get('lang')))
  const tavolo = q.get('tavolo')
  const cambia = (l: LinguaMenu) => { setLingua(l); q.set('lang', l); setQ(q, { replace: true }) }

  return (
    <div className="min-h-screen bg-[#FBF8F2] text-profondo">
      <header className="bg-profondo px-5 pb-6 pt-5 text-center text-white">
        <img src={logoLido} alt={config.nome} className="mx-auto h-20 w-auto brightness-0 invert" />
        <h1 className="mt-3 font-display text-3xl font-semibold">{uiLingue.menu[lingua]}</h1>
        {tavolo && <p className="mt-1 inline-block rounded-full bg-white/15 px-3 py-0.5 text-sm">{uiLingue.tavolo[lingua]} {tavolo}</p>}
        <div className="mt-4 flex justify-center gap-1.5">
          {LINGUE.map((l) => (
            <button key={l.id} onClick={() => cambia(l.id)} title={l.nome} aria-label={l.nome}
              className={cn('rounded-full px-2.5 py-1 text-xl transition', lingua === l.id ? 'bg-white/25 ring-2 ring-tenda' : 'opacity-60 hover:opacity-100')}>{l.bandiera}</button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        {ORDINE.map((c) => {
          const piatti = menu.filter((p) => p.categoria === c)
          if (!piatti.length) return null
          return (
            <section key={c} className="mb-8">
              <h2 className="mb-3 border-b-2 border-tenda pb-1 font-display text-2xl font-semibold">{categorieLingue[c][lingua]}</h2>
              <ul className="space-y-3">
                {piatti.map((p) => (
                  <li key={p.id} className="flex items-baseline gap-3">
                    <span className="text-[15px] leading-snug">{nomeIn(p, lingua)}</span>
                    <span className="mb-1 flex-1 border-b border-dotted border-profondo/25" />
                    <span className="num shrink-0 font-semibold">{p.prezzo ? euroCent(p.prezzo) : '—'}</span>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
        <footer className="space-y-1 border-t border-calce-200 pt-4 text-center text-xs text-profondo/55">
          <p>{uiLingue.allergeni[lingua]}</p>
          <p>{uiLingue.prezzi[lingua]} · {uiLingue.aggiornato[lingua]}</p>
          <p className="pt-2 font-semibold text-profondo/70">{config.nome} · {config.indirizzo} {config.localita} · {config.telefono}</p>
        </footer>
      </main>
    </div>
  )
}
