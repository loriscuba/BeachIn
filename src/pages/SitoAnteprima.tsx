import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Umbrella, Home, Coffee, UtensilsCrossed, Waves, Car, Star, Phone, Mail, MapPin, Clock, Check,
} from 'lucide-react'
import type { FilaId, Periodo, StatoSito, VoceTariffa } from '@/data/types'
import { getDisponibilitaSito, getListinoPubblicato, getStatoSito } from '@/data/api'
import { config } from '@/data/config'
import { Logo } from '@/components/layout/Logo'
import { euro, numero, dataEstesa } from '@/lib/formatters'
import { etichettePeriodo } from '@/lib/etichette'

const servizi = [
  { icona: Umbrella, nome: 'Ombrelloni e gazebo', desc: '180 postazioni su 9 file, dalla prima fila al fondo.' },
  { icona: Home, nome: 'Cabine e armadietti', desc: '40 cabine e servizio spogliatoi.' },
  { icona: Coffee, nome: 'Bar', desc: 'Colazioni, aperitivi e servizio in spiaggia.' },
  { icona: UtensilsCrossed, nome: 'Ristorante', desc: 'Cucina di mare a pranzo e a cena.' },
  { icona: Waves, nome: 'Noleggi', desc: 'SUP, pedalò, canoa e kayak.' },
  { icona: Car, nome: 'Parcheggio', desc: 'Posti riservati per i nostri clienti.' },
]
const file: FilaId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
const periodi: Periodo[] = ['bassa', 'media', 'alta', 'altissima']

export default function SitoAnteprima() {
  const [sito, setSito] = useState<StatoSito>()
  const [disp, setDisp] = useState<{ libere: number; totali: number; occupazione: number }>()
  const [listino, setListino] = useState<VoceTariffa[]>([])

  useEffect(() => {
    Promise.all([getStatoSito(), getDisponibilitaSito(), getListinoPubblicato()]).then(([s, d, l]) => {
      setSito(s); setDisp(d); setListino(l)
    })
  }, [])

  // Listino pubblico: giornaliera, ombrellone + 2 lettini, per fila × periodo
  const matrice = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of listino) {
      if (v.durata === 'giornaliera' && v.tipologia === 'ombrellone_2_lettini') m.set(`${v.fila}|${v.periodo}`, v.prezzo)
    }
    return m
  }, [listino])

  return (
    <div className="min-h-screen bg-calce text-profondo">
      {/* Barra */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-profondo">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <Link to="/sito" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15">
            <ArrowLeft className="h-4 w-4" /> Gestionale
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-profondo text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-cabina/30 to-profondo-900" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 text-center sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-tenda">{config.localita}</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            {sito?.home.titolo ?? config.nome}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/75">{sito?.home.testo}</p>
          {disp && (
            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acqua opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-acqua" />
              </span>
              <span className="text-sm">
                <span className="num font-bold">{disp.libere} ombrelloni liberi</span> oggi · disponibilità in tempo reale
              </span>
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-16 px-5 py-16">
        {/* Servizi */}
        <section>
          <Titolo occhiello="I servizi" titolo="Tutto quello che ti serve in spiaggia" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servizi.map((s) => (
              <div key={s.nome} className="rounded-2xl border border-calce-200 bg-white p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-cabina/10 text-cabina"><s.icona className="h-5 w-5" /></span>
                <h3 className="mt-3 font-bold text-profondo">{s.nome}</h3>
                <p className="mt-1 text-sm text-profondo/60">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Listino */}
        <section>
          <Titolo occhiello="Listino" titolo="Prezzi ombrellone + 2 lettini" nota="Tariffa giornaliera per fila e periodo. Prezzi sincronizzati col gestionale." />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-calce-200 bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-calce-200 text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">Fila</th>
                  {periodi.map((p) => (
                    <th key={p} className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-profondo/45">{etichettePeriodo[p]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {file.map((f) => (
                  <tr key={f} className="border-b border-calce-200/70 last:border-0">
                    <td className="px-4 py-2.5 font-bold text-profondo/70">Fila {f}</td>
                    {periodi.map((p) => (
                      <td key={p} className="num px-4 py-2.5 text-right font-medium text-profondo">
                        {matrice.has(`${f}|${p}`) ? euro(matrice.get(`${f}|${p}`)!) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Prenota + disponibilità */}
        <section className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Titolo occhiello="Prenota" titolo="Richiedi il tuo ombrellone" />
            <FormPrenotazione />
          </div>
          <div className="lg:col-span-2">
            {disp && (
              <div className="flex h-full flex-col justify-center rounded-2xl bg-profondo p-6 text-white">
                <p className="text-sm text-white/60">Disponibilità di oggi</p>
                <p className="num mt-1 text-5xl font-extrabold">{disp.libere}</p>
                <p className="text-white/70">ombrelloni liberi su {disp.totali}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-acqua" style={{ width: `${disp.occupazione * 100}%` }} />
                </div>
                <p className="mt-2 text-xs text-white/50">{dataEstesa(config.stagione.oggi)}</p>
              </div>
            )}
          </div>
        </section>

        {/* Galleria */}
        {sito && (
          <section>
            <Titolo occhiello="Galleria" titolo="Il nostro stabilimento" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sito.galleria.map((f, i) => (
                <div key={f.id} className="aspect-[4/3] overflow-hidden rounded-xl" style={{ background: ['#2E7D9A', '#7FB7A8', '#F2C14E', '#E4572E'][i % 4] }}>
                  <div className="flex h-full items-end bg-gradient-to-t from-profondo-900/50 p-2">
                    <span className="text-xs font-medium text-white">{f.titolo}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recensioni */}
        {sito && (
          <section>
            <Titolo occhiello="Dicono di noi" titolo="Le recensioni dei clienti" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sito.recensioni.filter((r) => r.pubblicata).slice(0, 6).map((r) => (
                <div key={r.id} className="rounded-2xl border border-calce-200 bg-white p-5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={i < r.voto ? 'h-4 w-4 fill-tenda text-tenda' : 'h-4 w-4 text-calce-300'} />
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-profondo/75">“{r.testo}”</p>
                  <p className="mt-2 text-xs font-medium text-profondo/50">— {r.autore}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contatti / dove siamo */}
        <section className="grid gap-6 rounded-2xl bg-profondo p-8 text-white lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Dove siamo</h2>
            <ul className="mt-4 space-y-2 text-white/80">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-tenda" /> {config.indirizzo}, {config.localita}</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-tenda" /> <span className="num">{config.telefono}</span></li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-tenda" /> {config.email}</li>
              <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-tenda" /> {config.orari.apertura}–{config.orari.chiusura}</li>
            </ul>
          </div>
          <div className="grid place-items-center rounded-xl bg-white/5">
            <span className="py-10 text-sm text-white/40">Mappa dello stabilimento</span>
          </div>
        </section>
      </main>

      <footer className="border-t border-calce-200 bg-white py-6 text-center text-xs text-profondo/45">
        {config.nome} · {config.localita} · P.IVA {config.partitaIva} — Sito dimostrativo generato dal gestionale BeachIn
      </footer>
    </div>
  )
}

function Titolo({ occhiello, titolo, nota }: { occhiello: string; titolo: string; nota?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cabina">{occhiello}</p>
      <h2 className="mt-1 text-2xl font-bold text-profondo sm:text-3xl">{titolo}</h2>
      {nota && <p className="mt-1 text-sm text-profondo/55">{nota}</p>}
    </div>
  )
}

function FormPrenotazione() {
  const [inviato, setInviato] = useState(false)
  if (inviato) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-acqua/40 bg-acqua/10 p-5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-acqua text-white"><Check className="h-5 w-5" /></span>
        <div>
          <p className="font-semibold text-profondo">Richiesta inviata!</p>
          <p className="text-sm text-profondo/60">Ti ricontattiamo a breve per la conferma.</p>
        </div>
      </div>
    )
  }
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setInviato(true) }}
      className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-calce-200 bg-white p-5"
    >
      <label className="col-span-2 block">
        <span className="mb-1 block text-xs font-medium text-profondo/60">Nome e cognome</span>
        <input required className={pc} placeholder="Mario Rossi" />
      </label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-profondo/60">Dal</span><input type="date" required defaultValue={config.stagione.oggi} className={pc} /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-profondo/60">Al</span><input type="date" required defaultValue={config.stagione.oggi} className={pc} /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-profondo/60">Persone</span><input type="number" min={1} defaultValue={2} className={pc} /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-profondo/60">Email</span><input type="email" required placeholder="tu@email.it" className={pc} /></label>
      <button type="submit" className="col-span-2 mt-1 h-11 rounded-lg bg-boa font-semibold text-white transition-colors hover:bg-boa/90">
        Invia richiesta
      </button>
      <p className="col-span-2 text-center text-xs text-profondo/40">{numero(180)} postazioni · risposta entro 24 ore</p>
    </form>
  )
}

const pc = 'h-10 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring'
