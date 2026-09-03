import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { config } from '@/data/config'
import { Logo } from '@/components/layout/Logo'

/**
 * Anteprima pubblica del sito dello stabilimento (vetrina).
 * Pagina stand-alone, senza lo shell gestionale.
 * In Fase 8 sarà generata dagli stessi dati del gestionale.
 */
export default function SitoAnteprima() {
  return (
    <div className="min-h-screen bg-profondo text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <Link
          to="/sito"
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al gestionale
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="rounded-3xl bg-gradient-to-b from-cabina/40 to-profondo-900 px-6 py-16 text-center sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-tenda">
            {config.localita}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{config.nome}</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            La vetrina pubblica dello stabilimento — listino, servizi, disponibilità
            e prenotazioni — sarà generata qui a partire dagli stessi dati del gestionale.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-tenda/20 px-3 py-1 text-sm font-semibold text-tenda">
            In arrivo nella Fase 8
          </div>
        </section>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {['Listino sincronizzato', 'Disponibilità in tempo reale', 'Prenotazione online'].map(
            (t) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6">
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm text-white/60">
                  Contenuto dimostrativo, in costruzione.
                </p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}
