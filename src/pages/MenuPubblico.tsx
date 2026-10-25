/**
 * Menu pubblico (aperto dal QR sul tavolo): 5 lingue, legge il menu dal vivo dal context.
 * Rotta `/menu?tavolo=N&lang=en`, fuori dallo shell gestionale.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { LinguaMenu } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { LINGUE, nomeSezioneIn, nomeIn, uiLingue } from '@/lib/menuLingue'
import { PaginaMenu, CopertinaMenu, TitoloSezione, SchedaVoce, PiedeMenu, GRIGLIA_VOCI } from '@/components/menu/MenuLido'
import { cn } from '@/lib/cn'


function linguaIniziale(param: string | null): LinguaMenu {
  const ok = (l?: string | null): l is LinguaMenu => !!l && LINGUE.some((x) => x.id === l)
  if (ok(param)) return param
  const nav = navigator.language?.slice(0, 2)
  return ok(nav) ? nav : 'it'
}

export default function MenuPubblico() {
  const { menu, sezioniMenu } = useDemoData()
  const [q, setQ] = useSearchParams()
  const [lingua, setLingua] = useState<LinguaMenu>(() => linguaIniziale(q.get('lang')))
  const tavolo = q.get('tavolo')
  const cambia = (l: LinguaMenu) => { setLingua(l); q.set('lang', l); setQ(q, { replace: true }) }

  return (
    <PaginaMenu tema="ristorante" className="min-h-screen">
      <CopertinaMenu tema="ristorante" etichetta={tavolo ? `${uiLingue.tavolo[lingua]} ${tavolo}` : undefined}>
        <div className="mt-3 flex gap-1.5">
          {LINGUE.map((l) => (
            <button key={l.id} onClick={() => cambia(l.id)} title={l.nome} aria-label={l.nome}
              className={cn('rounded-full px-2 py-0.5 text-xl transition', lingua === l.id ? 'bg-white/30 ring-2 ring-white' : 'opacity-70 hover:opacity-100')}>{l.bandiera}</button>
          ))}
        </div>
      </CopertinaMenu>

      <main className="mx-auto max-w-5xl space-y-12 px-4 pt-16 sm:px-6">
        <p className="text-center font-gesso text-3xl text-[color:var(--acc)]">{uiLingue.menu[lingua]}</p>
        {sezioniMenu.map((sez, i) => {
          const piatti = menu.filter((p) => p.categoria === sez.id)
          if (!piatti.length) return null
          return (
            <section key={sez.id}>
              <TitoloSezione n={i + 1} nome={nomeSezioneIn(sez, lingua)} />
              <div className={GRIGLIA_VOCI}>
                {piatti.map((p) => <SchedaVoce key={p.id} v={{ id: p.id, nome: nomeIn(p, lingua), prezzo: p.prezzo, foto: p.foto, descrizione: lingua === 'it' ? p.descrizione : undefined }} />)}
              </div>
            </section>
          )
        })}
      </main>
      <PiedeMenu>
        <p className="mt-3 text-xs text-[#3B2A20]/55">{uiLingue.allergeni[lingua]}</p>
        <p className="text-xs text-[#3B2A20]/55">{uiLingue.prezzi[lingua]} · {uiLingue.aggiornato[lingua]}</p>
      </PiedeMenu>
    </PaginaMenu>
  )
}
