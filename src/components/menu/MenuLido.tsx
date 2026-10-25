/**
 * Grafica unica dei menu del Lido dei Pini: ristorante, bar, lavagnetta (tablet self e QR del tavolo),
 * ordini dall'ombrellone (app clienti) e menu pubblico in 5 lingue.
 *
 * Ispirata alle foto del lido: fondo sabbia, inchiostro marrone del logo disegnato a mano, tenda a righe
 * degli ombrelloni come motivo, onda del mare sotto la copertina. Ogni menu ha il suo colore preso dalle foto:
 * mare per il ristorante, spritz al tramonto per bar e ombrellone (stesso listino, stessa grafica), pineta per la lavagna.
 */
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Minus, Plus, UtensilsCrossed } from 'lucide-react'
import { fotoSito, logoLido } from '@/assets/sito'
import { config } from '@/data/config'
import { euroCent } from '@/lib/formatters'
import { cn } from '@/lib/cn'

export type TemaMenu = 'ristorante' | 'bar' | 'ombrellone' | 'lavagnetta'

export const TEMI: Record<TemaMenu, { colore: string; chiaro: string; foto: string; titolo: string; corsivo: string; motto: string }> = {
  ristorante: { colore: '#1F6A84', chiaro: '#DCEBEF', foto: fotoSito.ristorante, titolo: 'Il mare,', corsivo: 'nel piatto', motto: 'cucina di mare sotto il canniccio' },
  bar: { colore: '#D9622B', chiaro: '#FBE3D3', foto: fotoSito.barDistillati, titolo: 'Il bar', corsivo: 'in riva al mare', motto: 'spritz, caffè e gelati' },
  ombrellone: { colore: '#D9622B', chiaro: '#FBE3D3', foto: fotoSito.ombrelloniCielo, titolo: 'Il bar', corsivo: 'all’ombrellone', motto: 'te lo portiamo sotto l’ombrellone' },
  lavagnetta: { colore: '#2F6B4F', chiaro: '#DDEBE2', foto: fotoSito.tramonto, titolo: 'La lavagna', corsivo: 'di oggi', motto: 'le proposte del giorno' },
}

const SABBIA = '#F6EFE3'
const INCHIOSTRO = '#3B2A20'

/** Contenitore: colori del tema come variabili CSS, così ogni pezzo usa `var(--acc)`. */
export function PaginaMenu({ tema, className, children }: { tema: TemaMenu; className?: string; children: ReactNode }) {
  const t = TEMI[tema]
  const stile = { '--acc': t.colore, '--acc-chiaro': t.chiaro, backgroundColor: SABBIA, color: INCHIOSTRO } as CSSProperties
  return <div className={cn('min-h-full', className)} style={stile}>{children}</div>
}

/** Copertina: foto vera del lido, logo nel medaglione, titolo in corsivo e onda sotto. `compatta` per l'app sul telefono. */
export function CopertinaMenu({ tema, etichetta, compatta, children }: { tema: TemaMenu; etichetta?: ReactNode; compatta?: boolean; children?: ReactNode }) {
  const t = TEMI[tema]
  return (
    <section className="relative">
      <div className={cn('relative overflow-hidden', compatta ? 'h-48 rounded-3xl' : 'h-[320px] sm:h-[400px]')}>
        <img src={t.foto} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/65" />
        {etichetta && <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--acc)] shadow">{etichetta}</span>}
        <div className={cn('absolute inset-x-0 bottom-0 text-white', compatta ? 'px-5 pb-5' : 'mx-auto max-w-6xl px-6 pb-14 sm:px-8')}>
          <p className={cn('font-gesso leading-none text-[#FFE3B8]', compatta ? 'text-2xl' : 'text-3xl')}>{t.motto}</p>
          <h1 className={cn('font-display leading-[1.02]', compatta ? 'text-4xl' : 'text-5xl sm:text-6xl')}>
            {t.titolo} <span className="italic">{t.corsivo}</span>
          </h1>
          {children}
        </div>
        {!compatta && <Onda />}
      </div>
      {!compatta && (
        <img src={logoLido} alt={config.nome}
          className="absolute -bottom-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-[#FBF7F0] object-contain p-2.5 shadow-[0_10px_30px_-10px_rgba(59,42,32,0.45)] ring-4 ring-[color:var(--acc)] sm:h-28 sm:w-28" />
      )}
    </section>
  )
}

/** Onda del mare color sabbia che chiude la copertina. */
function Onda() {
  return (
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-10 w-full" aria-hidden>
      <path d="M0 30 C 180 0 360 60 540 30 S 900 0 1080 30 S 1320 55 1440 28 V60 H0 Z" fill={SABBIA} />
    </svg>
  )
}

// fascia piena in alto + mezzi cerchi sotto, uno per riga
const FESTONI = 'linear-gradient(#000 0 0) top / 100% 9px no-repeat, radial-gradient(circle at 11px 9px, #000 11px, transparent 11.5px) 0 0 / 22px 100% repeat-x'

/** Tenda a righe degli ombrelloni con il bordo a festoni: il motivo di riconoscimento dei menu. */
export function TendaRighe({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('h-5 w-full', className)}
      style={{
        background: 'repeating-linear-gradient(90deg, var(--acc) 0 22px, #FBF7F0 22px 44px)',
        WebkitMask: FESTONI,
        mask: FESTONI,
      }} />
  )
}

/** Barra delle sezioni (scorre in orizzontale). */
export function ChipSezioni({ sezioni, attiva, onScegli, className }: { sezioni: { id: string; nome: string }[]; attiva?: string; onScegli: (id: string) => void; className?: string }) {
  return (
    <nav className={cn('flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]', className)}>
      {sezioni.map((s) => (
        <button key={s.id} type="button" onClick={() => onScegli(s.id)}
          className={cn('h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition',
            attiva === s.id ? 'border-transparent bg-[var(--acc)] text-white shadow-sm' : 'border-[#3B2A20]/15 bg-[#FBF7F0] text-[#3B2A20]/80 hover:border-[color:var(--acc)]')}>
          {s.nome}
        </button>
      ))}
    </nav>
  )
}

/** Titolo di sezione: numero scritto a mano, nome in corsivo, onda sotto. */
export function TitoloSezione({ n, nome, className }: { n?: number; nome: string; className?: string }) {
  return (
    <div className={cn('mb-5 text-center', className)}>
      {n !== undefined && <p className="font-gesso text-2xl leading-none text-[color:var(--acc)]">{String(n).padStart(2, '0')}</p>}
      <h2 className="font-display text-3xl italic sm:text-4xl">{nome}</h2>
      <svg viewBox="0 0 120 12" className="mx-auto mt-1.5 h-3 w-28" aria-hidden>
        <path d="M2 6 Q 17 0 32 6 T 62 6 T 92 6 T 118 6" fill="none" stroke="var(--acc)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export interface VoceMenu {
  id: string
  nome: string
  prezzo: number
  descrizione?: string
  foto?: string
  dettaglio?: string // allergeni, formato…
}

/** Scheda di una voce: foto, nome, descrizione, prezzo e (se si ordina) Aggiungi / quantità. */
export function SchedaVoce({ v, n = 0, onCambia }: { v: VoceMenu; n?: number; onCambia?: (d: number) => void }) {
  return (
    <article className={cn('flex gap-4 rounded-3xl bg-[#FFFCF6] p-3 shadow-[0_6px_24px_-12px_rgba(59,42,32,0.35)] ring-1 transition',
      n > 0 ? 'ring-2 ring-[color:var(--acc)]' : 'ring-[#3B2A20]/5')}>
      <FotoVoce src={v.foto} className="h-24 w-24 sm:h-28 sm:w-28" />
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <h3 className="font-display text-lg leading-snug">{v.nome}</h3>
        {v.descrizione && <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#3B2A20]/65">{v.descrizione}</p>}
        {v.dettaglio && <p className="mt-1 text-[10.5px] uppercase tracking-wider text-[#3B2A20]/40">{v.dettaglio}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="num rounded-full bg-[var(--acc-chiaro)] px-2.5 py-0.5 font-display text-lg font-semibold text-[color:var(--acc)]">{v.prezzo ? euroCent(v.prezzo) : '—'}</span>
          {onCambia && (n > 0 ? <Stepper n={n} onCambia={onCambia} /> : (
            <button type="button" onClick={() => onCambia(1)} className="inline-flex h-9 items-center gap-1 rounded-full bg-[var(--acc)] pl-3 pr-3.5 text-sm font-semibold text-white shadow-sm active:scale-95" aria-label={`Aggiungi ${v.nome}`}>
              <Plus className="h-4 w-4" /> Aggiungi
            </button>
          ))}
        </div>
      </div>
    </article>
  )
}

export function Stepper({ n, onCambia }: { n: number; onCambia: (d: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onCambia(-1)} className="grid h-9 w-9 place-content-center rounded-full border border-[#3B2A20]/20 bg-white" aria-label="Togli uno"><Minus className="h-4 w-4" /></button>
      <span className="num w-6 text-center text-lg font-bold">{n}</span>
      <button type="button" onClick={() => onCambia(1)} className="grid h-9 w-9 place-content-center rounded-full bg-[var(--acc)] text-white" aria-label="Aggiungi uno"><Plus className="h-4 w-4" /></button>
    </div>
  )
}

/** Foto quadrata arrotondata; senza foto (o se non carica) un segnaposto col colore del menu. */
export function FotoVoce({ src, className }: { src?: string; className?: string }) {
  const [errore, setErrore] = useState(false)
  if (!src || errore) {
    return (
      <div className={cn('grid shrink-0 place-content-center rounded-2xl bg-[var(--acc-chiaro)]', className)}>
        <UtensilsCrossed className="h-8 w-8 text-[color:var(--acc)] opacity-50" />
      </div>
    )
  }
  return <img src={src} alt="" loading="lazy" onError={() => setErrore(true)} className={cn('shrink-0 rounded-2xl object-cover', className)} />
}

/** Griglia delle schede: una colonna sul telefono, due/tre su tablet. */
export const GRIGLIA_VOCI = 'grid gap-3.5 md:grid-cols-2 xl:grid-cols-3'

/** Piede con logo e contatti. */
export function PiedeMenu({ children }: { children?: ReactNode }) {
  return (
    <footer className="mt-12 text-center">
      <TendaRighe className="opacity-80" />
      <div className="px-6 pb-8 pt-6">
        <img src={logoLido} alt={config.nome} className="mx-auto h-16 w-auto opacity-90" />
        {children}
        <p className="mt-2 text-xs text-[#3B2A20]/55">{config.indirizzo} {config.localita} · {config.telefono}</p>
      </div>
    </footer>
  )
}
