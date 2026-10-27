import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, CheckCheck, Settings2, Share, Trash2, X } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { it } from 'date-fns/locale'
import { useNotifiche } from '@/context/NotificheContext'
import { useTema } from '@/hooks/useTema'
import { attivaPush, statoPush, type StatoPush } from '@/lib/notifichePush'
import { BadgeConta } from './Sidebar'
import { cn } from '@/lib/cn'

/** Campanella in alto a destra: elenco di tutti gli eventi e preferenze delle notifiche. */
export function CentroNotifiche() {
  const { nonLette } = useNotifiche()
  const [aperto, setAperto] = useState(false)
  return (
    <>
      <button
        onClick={() => setAperto(!aperto)}
        className="relative grid h-9 w-9 shrink-0 place-content-center rounded-full border border-calce-200 bg-white text-profondo/70 hover:text-profondo"
        aria-label={nonLette ? `Notifiche, ${nonLette} da leggere` : 'Notifiche'}
        title="Notifiche"
      >
        <Bell className="h-4 w-4" />
        <BadgeConta n={nonLette} className="absolute -right-1.5 -top-1.5" />
      </button>
      {aperto && <Pannello onChiudi={() => setAperto(false)} />}
    </>
  )
}

function Pannello({ onChiudi }: { onChiudi: () => void }) {
  const { notifiche, nonLette, segnaLetta, segnaTutteLette, svuota } = useNotifiche()
  const [tema] = useTema()
  const scuro = tema === 'scuro'
  const [impostazioni, setImpostazioni] = useState(false)
  const vai = useNavigate()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChiudi])
  const tenue = scuro ? 'text-white/55' : 'text-profondo/55'
  const icona = cn('rounded-lg p-1.5', scuro ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-profondo/60 hover:bg-profondo/5 hover:text-profondo')

  return createPortal(
    <div className="fixed inset-0 z-50" data-tema={tema}>
      <div className="absolute inset-0" onClick={onChiudi} aria-hidden />
      <div
        role="dialog"
        aria-label="Notifiche"
        className={cn(
          'anim-pop absolute right-2 top-[calc(env(safe-area-inset-top)+3.75rem)] flex max-h-[min(36rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border shadow-[0_30px_60px_-20px_rgba(6,22,29,0.55)] md:top-[4.25rem]',
          scuro ? 'border-white/10 bg-[#0d2a35] text-white' : 'border-calce-200 bg-white text-profondo'
        )}
      >
        <div className={cn('flex items-center gap-1 border-b px-3 py-2.5', scuro ? 'border-white/10' : 'border-calce-200')}>
          <h2 className="flex-1 font-display text-lg font-semibold">{impostazioni ? 'Preferenze notifiche' : 'Notifiche'}</h2>
          {!impostazioni && nonLette > 0 && <button className={icona} onClick={segnaTutteLette} title="Segna tutte come lette" aria-label="Segna tutte come lette"><CheckCheck className="h-5 w-5" /></button>}
          {!impostazioni && notifiche.length > 0 && <button className={icona} onClick={svuota} title="Svuota l'elenco" aria-label="Svuota l'elenco"><Trash2 className="h-5 w-5" /></button>}
          <button className={cn(icona, impostazioni && (scuro ? 'bg-white/10 text-white' : 'bg-profondo/5 text-profondo'))} onClick={() => setImpostazioni(!impostazioni)} title="Preferenze" aria-label="Preferenze"><Settings2 className="h-5 w-5" /></button>
          <button className={icona} onClick={onChiudi} aria-label="Chiudi"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          {impostazioni ? <Preferenze scuro={scuro} /> : notifiche.length === 0 ? (
            <p className={cn('px-4 py-10 text-center text-sm', tenue)}>Nessuna notifica. Qui arrivano prenotazioni, richieste e comande appena succedono.</p>
          ) : (
            <ul>
              {notifiche.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => { segnaLetta(n.id); onChiudi(); vai(n.percorso) }}
                    className={cn('flex w-full items-start gap-3 px-3 py-2.5 text-left', scuro ? 'hover:bg-white/5' : 'hover:bg-calce/60', !n.letta && (scuro ? 'bg-white/[0.04]' : 'bg-acqua/10'))}
                  >
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.letta ? 'bg-transparent' : 'bg-boa')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm', !n.letta && 'font-semibold')}>{n.titolo}</span>
                      <span className={cn('block truncate text-xs', tenue)}>{n.testo}</span>
                    </span>
                    <span className={cn('shrink-0 text-[11px]', tenue)}>{formatDistanceToNowStrict(n.ts, { locale: it })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function Interruttore({ acceso, onCambia, etichetta, scuro }: { acceso: boolean; onCambia: (v: boolean) => void; etichetta: string; scuro: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={acceso}
      aria-label={etichetta}
      onClick={() => onCambia(!acceso)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', acceso ? 'bg-cabina' : scuro ? 'bg-white/20' : 'bg-calce-300')}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', acceso ? 'translate-x-[1.375rem]' : 'translate-x-0.5')} />
    </button>
  )
}

function Preferenze({ scuro }: { scuro: boolean }) {
  const { categorie, preferenze, impostaSuono, impostaCategoria } = useNotifiche()
  const riga = cn('flex items-center gap-3 border-b px-4 py-3 text-sm', scuro ? 'border-white/10' : 'border-calce-200')
  const tenue = scuro ? 'text-white/55' : 'text-profondo/55'
  return (
    <div>
      <div className={riga}>
        <span className="flex-1">Suono del campanello<span className={cn('block text-xs', tenue)}>A ogni notifica nuova, su questo dispositivo</span></span>
        <Interruttore acceso={preferenze.suono} onCambia={impostaSuono} etichetta="Suono del campanello" scuro={scuro} />
      </div>
      <NotifichePush riga={riga} tenue={tenue} />
      <p className={cn('px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide', tenue)}>Cosa notificare</p>
      {categorie.length === 0 && <p className={cn('px-4 py-3 text-sm', tenue)}>Il tuo ruolo non riceve notifiche.</p>}
      {categorie.map((c) => (
        <div key={c.id} className={riga}>
          <span className="flex-1">{c.nome}</span>
          <Interruttore acceso={!preferenze.spente.includes(c.id)} onCambia={(v) => impostaCategoria(c.id, v)} etichetta={c.nome} scuro={scuro} />
        </div>
      ))}
    </div>
  )
}

/** Notifiche push (anche a telefono bloccato): il server le manda per prenotazioni tavolo e ombrellone e richieste eventi. */
function NotifichePush({ riga, tenue }: { riga: string; tenue: string }) {
  const [stato, setStato] = useState<StatoPush>()
  const [lavoro, setLavoro] = useState(false)
  const [errore, setErrore] = useState<string>()
  useEffect(() => { statoPush('admin').then(setStato).catch(() => setStato('non-supportato')) }, [])
  if (!stato) return null
  const spiegazione: Record<StatoPush, React.ReactNode> = {
    attivo: 'Attive su questo dispositivo',
    'da-attivare': 'Prenotazioni (tavolo e ombrellone) e richieste eventi anche a schermo bloccato',
    'serve-installazione': <>Su iPhone: <Share className="inline h-3.5 w-3.5" /> Condividi → Aggiungi alla schermata Home, poi apri l'app dall'icona</>,
    negato: 'Bloccate: riattivale dalle impostazioni del browser per questo sito',
    'non-supportato': 'Questo browser non le supporta',
    'senza-server': 'Servono i dati online (modalità demo locale)',
  }
  const attiva = async () => {
    setLavoro(true); setErrore(undefined)
    try { setStato(await attivaPush('admin')) } catch (e) { setErrore((e as Error).message) } finally { setLavoro(false) }
  }
  return (
    <div className={riga}>
      <span className="flex-1">
        <span className="inline-flex items-center gap-1.5">Notifiche sul telefono {stato === 'attivo' && <BellRing className="h-3.5 w-3.5 text-acqua" />}</span>
        <span className={cn('block text-xs', tenue)}>{spiegazione[stato]}</span>
        {errore && <span className="block text-xs text-boa">Errore: {errore}</span>}
      </span>
      {stato === 'da-attivare' && (
        <button onClick={attiva} disabled={lavoro} className="h-8 shrink-0 rounded-lg bg-cabina px-3 text-xs font-semibold text-white disabled:opacity-60">{lavoro ? 'Attivo…' : 'Attiva'}</button>
      )}
    </div>
  )
}
