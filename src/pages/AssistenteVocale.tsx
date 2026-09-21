/**
 * Assistente vocale del menu — "la funzione sviluppata a voce".
 * Si parla (o si scrive) e l'assistente modifica il MENU del ristorante:
 * aggiungi / togli / cambia prezzo / rinomina / leggi / svuota.
 *
 * Voce via Web Speech API del browser (nessuna chiave, nessun costo). Il menu
 * vive nel DemoDataContext (dati statici in memoria, stessa forma dell'API):
 * quando collegheremo il DB, cambieranno solo le mutazioni del context.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Send, Trash2, Volume2, UtensilsCrossed } from 'lucide-react'
import type { CategoriaPiatto, Piatto } from '@/data/types'
import { useDemoData } from '@/context/DemoDataContext'
import { useVoce } from '@/hooks/useVoce'
import { parseComandoMenu } from '@/lib/comandiMenu'
import { trovaMigliore } from '@/lib/fuzzy'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { euroCent } from '@/lib/formatters'
import { etichetteCategoriaPiatto, etichetteAllergene } from '@/lib/etichette'
import { cn } from '@/lib/cn'

type Ruolo = 'utente' | 'assistente' | 'errore'
interface Messaggio {
  id: number
  ruolo: Ruolo
  testo: string
}

const ORDINE_CAT: CategoriaPiatto[] = ['antipasti', 'primi', 'secondi', 'contorni', 'pizze', 'dolci', 'bevande']

// Soglie di somiglianza: sopra OK agiamo, tra FORSE e OK proponiamo, sotto niente.
const SOGLIA_OK = 0.6
const SOGLIA_FORSE = 0.42

/**
 * Trova il piatto dal menu partendo dai nomi candidati (uno per ogni alternativa
 * di trascrizione). Restituisce il piatto se la somiglianza è alta, altrimenti
 * il miglior "forse intendevi" o niente.
 */
function risolviPiatto(menu: Piatto[], nomi: string[]): { piatto: Piatto | null; suggerimento: Piatto | null } {
  let best: { item: Piatto; score: number } | null = null
  for (const nome of nomi) {
    if (!nome) continue
    const m = trovaMigliore(nome, menu, (p) => p.nome)
    if (m && (!best || m.score > best.score)) best = m
  }
  if (!best) return { piatto: null, suggerimento: null }
  if (best.score >= SOGLIA_OK) return { piatto: best.item, suggerimento: best.item }
  if (best.score >= SOGLIA_FORSE) return { piatto: null, suggerimento: best.item }
  return { piatto: null, suggerimento: null }
}

/** Raccoglie i possibili nomi di piatto dalle alternative con la stessa azione. */
function nomiDaAlternative(alts: string[], azione: string, primario: string): string[] {
  const out = [primario]
  for (const a of alts.slice(1)) {
    const c = parseComandoMenu(a)
    if (c.azione === azione && 'nome' in c && c.nome) out.push(c.nome)
  }
  return out
}

/** Prezzo pronunciato a voce: "12 euro", "6 euro e 50 centesimi". */
function prezzoParlato(p: number): string {
  if (Number.isInteger(p)) return `${p} euro`
  const [intero, dec] = p.toFixed(2).split('.')
  return `${intero} euro e ${dec} centesimi`
}

const ESEMPI = [
  'Aggiungi spaghetti allo scoglio a 18 euro',
  'Aggiungi tiramisù categoria dolci a 6,50',
  'Cambia il prezzo della carbonara a 13 euro',
  'Rinomina calamari fritti in calamari alla griglia',
  'Togli il branzino al forno',
  'Leggi il menu',
]

export default function AssistenteVocale() {
  const { menu, aggiungiPiatto, rimuoviPiatto, modificaPrezzoPiatto, rinominaPiatto } = useDemoData()
  const { supportata, inAscolto, avviaAscolto, fermaAscolto, parla, setParlaAttivo } = useVoce()

  const [messaggi, setMessaggi] = useState<Messaggio[]>([
    {
      id: 0,
      ruolo: 'assistente',
      testo: supportata
        ? 'Ciao! Premi il microfono e parla, oppure scrivi un comando. Prova: «aggiungi spaghetti allo scoglio a 18 euro».'
        : 'Il riconoscimento vocale non è disponibile in questo browser (usa Chrome o Edge). Puoi comunque scrivere i comandi qui sotto: l’assistente risponde a voce.',
    },
  ])
  const [testo, setTesto] = useState('')
  const [parlaAttivo, setParlaAttivoState] = useState(true)
  const [ultimoId, setUltimoId] = useState<string | null>(null)
  const seqRef = useRef(1)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight })
  }, [messaggi])

  const aggiungiMessaggio = (ruolo: Ruolo, t: string) =>
    setMessaggi((prev) => [...prev, { id: seqRef.current++, ruolo, testo: t }])

  const rispondi = (t: string, ruolo: Ruolo = 'assistente') => {
    aggiungiMessaggio(ruolo, t)
    parla(t)
  }

  const nonTrovato = (nome: string, suggerimento: Piatto | null) =>
    suggerimento
      ? rispondi(`Non ho trovato «${nome}». Forse intendevi «${suggerimento.nome}»? Ripeti con il nome esatto.`, 'errore')
      : rispondi(`Non trovo «${nome}» nel menu.`, 'errore')

  function gestisci(alternative: string[]) {
    const alts = alternative.map((a) => a.trim()).filter(Boolean)
    if (!alts.length) return
    const testo = alts[0]
    aggiungiMessaggio('utente', testo)
    const c = parseComandoMenu(testo)

    switch (c.azione) {
      case 'aggiungi': {
        const simile = trovaMigliore(c.nome, menu, (p) => p.nome)
        if (simile && simile.score >= 0.85) {
          rispondi(`«${simile.item.nome}» sembra già nel menu. Per cambiare prezzo dì: «cambia il prezzo di ${simile.item.nome} a …».`)
          break
        }
        const p = aggiungiPiatto(c.nome, c.prezzo, c.categoria)
        setUltimoId(p.id)
        rispondi(
          `Aggiunto «${p.nome}» in ${etichetteCategoriaPiatto[p.categoria]}` +
            (c.prezzo !== null ? ` a ${prezzoParlato(c.prezzo)}.` : ' (senza prezzo).')
        )
        break
      }
      case 'rimuovi': {
        const { piatto, suggerimento } = risolviPiatto(menu, nomiDaAlternative(alts, 'rimuovi', c.nome))
        if (!piatto) { nonTrovato(c.nome, suggerimento); break }
        rimuoviPiatto(piatto.id)
        rispondi(`Ho tolto «${piatto.nome}» dal menu.`)
        break
      }
      case 'prezzo': {
        const { piatto, suggerimento } = risolviPiatto(menu, nomiDaAlternative(alts, 'prezzo', c.nome))
        if (!piatto) { nonTrovato(c.nome, suggerimento); break }
        modificaPrezzoPiatto(piatto.id, c.prezzo)
        setUltimoId(piatto.id)
        rispondi(`Prezzo di «${piatto.nome}» aggiornato a ${prezzoParlato(c.prezzo)}.`)
        break
      }
      case 'rinomina': {
        const { piatto, suggerimento } = risolviPiatto(menu, nomiDaAlternative(alts, 'rinomina', c.nome))
        if (!piatto) { nonTrovato(c.nome, suggerimento); break }
        const vecchio = piatto.nome
        rinominaPiatto(piatto.id, c.nuovoNome)
        setUltimoId(piatto.id)
        rispondi(`Rinominato «${vecchio}» in «${c.nuovoNome}».`)
        break
      }
      case 'leggi': {
        if (menu.length === 0) { rispondi('Il menu è vuoto.'); break }
        const parti = menu.map((p) => `${p.nome}${p.prezzo > 0 ? ` a ${prezzoParlato(p.prezzo)}` : ''}`)
        rispondi(`Nel menu ci sono ${menu.length} piatti: ${parti.join('; ')}.`)
        break
      }
      case 'svuota': {
        menu.map((p) => p.id).forEach((id) => rimuoviPiatto(id))
        rispondi('Ho svuotato il menu.')
        break
      }
      case 'aiuto':
        rispondi(
          'Puoi dire per esempio: aggiungi spaghetti allo scoglio a 18 euro; cambia il prezzo della carbonara a 13; togli il tiramisù; rinomina pizza in pizza margherita; leggi il menu; svuota il menu.'
        )
        break
      default:
        rispondi(
          'Non ho capito. Prova con «aggiungi …», «togli …», «cambia il prezzo di …» oppure «leggi il menu». Dì «aiuto» per gli esempi.',
          'errore'
        )
    }
  }

  const ascolta = () => {
    if (inAscolto) { fermaAscolto(); return }
    avviaAscolto(
      (alts) => gestisci(alts),
      (codice) => {
        const msg =
          codice === 'not-allowed' || codice === 'service-not-allowed'
            ? 'Microfono bloccato dal browser. Consenti l’accesso al microfono, oppure scrivi il comando qui sotto.'
            : codice === 'no-speech'
              ? 'Non ho sentito nulla. Riprova.'
              : codice === 'non-supportato'
                ? 'Il riconoscimento vocale non è disponibile in questo browser. Usa Chrome o Edge.'
                : 'Errore del microfono. Puoi scrivere il comando qui sotto.'
        rispondi(msg, 'errore')
      }
    )
  }

  const cambiaParla = (attivo: boolean) => {
    setParlaAttivoState(attivo)
    setParlaAttivo(attivo)
  }

  const perCategoria = useMemo(() => {
    return ORDINE_CAT.map((cat) => ({ cat, piatti: menu.filter((p) => p.categoria === cat) })).filter(
      (g) => g.piatti.length > 0
    )
  }, [menu])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Assistente */}
      <Card className="flex flex-col">
        <CardHeader
          titolo={<span className="inline-flex items-center gap-2"><Mic className="h-4 w-4 text-cabina" /> Assistente vocale</span>}
          sottotitolo="Parla o scrivi per modificare il menu"
          azione={
            <Badge tono={inAscolto ? 'boa' : supportata ? 'acqua' : 'spento'} puntino>
              {inAscolto ? 'In ascolto' : supportata ? 'Pronto' : 'Solo testo'}
            </Badge>
          }
        />
        <CardBody className="flex flex-1 flex-col gap-3 pt-2">
          <div
            ref={chatRef}
            className="flex h-72 flex-col gap-2 overflow-y-auto rounded-lg border border-calce-200 bg-calce/60 p-3"
            aria-live="polite"
          >
            {messaggi.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[88%] rounded-xl px-3 py-2 text-sm',
                  m.ruolo === 'utente' && 'self-end bg-profondo text-white',
                  m.ruolo === 'assistente' && 'self-start border border-calce-200 bg-white text-profondo',
                  m.ruolo === 'errore' && 'self-start border border-boa/40 bg-boa/10 text-boa'
                )}
              >
                {m.testo}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variante={inAscolto ? 'pericolo' : 'primario'}
              onClick={ascolta}
              disabled={!supportata}
              className="gap-2"
            >
              <Mic className="h-4 w-4" />
              {inAscolto ? 'Sto ascoltando…' : 'Parla'}
            </Button>
            <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-profondo/70">
              <input
                type="checkbox"
                checked={parlaAttivo}
                onChange={(e) => cambiaParla(e.target.checked)}
                className="h-4 w-4 accent-cabina"
              />
              <Volume2 className="h-4 w-4 text-profondo/50" /> Risposte a voce
            </label>
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); gestisci([testo]); setTesto('') }}
          >
            <input
              id="comando-vocale"
              type="text"
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              autoComplete="off"
              placeholder="Scrivi: «aggiungi carbonara a 12 euro»"
              className="h-10 flex-1 rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring"
            />
            <Button type="submit" variante="secondario" className="gap-1.5" aria-label="Invia">
              <Send className="h-4 w-4" /> Invia
            </Button>
          </form>

          <details className="text-xs text-profondo/55">
            <summary className="cursor-pointer font-medium text-profondo/70">Cosa posso dire?</summary>
            <ul className="mt-2 space-y-1">
              {ESEMPI.map((e) => (
                <li key={e}>
                  <code className="rounded bg-calce-200 px-1.5 py-0.5 text-[11px] text-profondo">{e}</code>
                </li>
              ))}
            </ul>
          </details>
        </CardBody>
      </Card>

      {/* Menu */}
      <Card>
        <CardHeader
          titolo={<span className="inline-flex items-center gap-2"><UtensilsCrossed className="h-4 w-4 text-cabina" /> Menu ristorante</span>}
          sottotitolo="Modificabile a voce · dati dimostrativi"
          azione={<Badge tono="mare">{menu.length} {menu.length === 1 ? 'piatto' : 'piatti'}</Badge>}
        />
        <CardBody className="space-y-4 pt-2">
          {menu.length === 0 && (
            <p className="py-10 text-center text-sm text-profondo/45">
              Il menu è vuoto. Prova a dire «aggiungi spaghetti allo scoglio a 18 euro».
            </p>
          )}
          <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
            {perCategoria.map(({ cat, piatti }) => (
              <div key={cat}>
                <h3 className="mb-1.5 border-b border-calce-200 pb-1 text-[11px] font-semibold uppercase tracking-wide text-cabina">
                  {etichetteCategoriaPiatto[cat]}
                </h3>
                <ul className="space-y-1.5">
                  {piatti.map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
                        p.id === ultimoId ? 'border-cabina bg-cabina/5' : 'border-calce-200 bg-white'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-profondo">{p.nome}</p>
                        {p.allergeni.length > 0 && (
                          <p className="truncate text-[11px] text-profondo/45">
                            {p.allergeni.map((a) => etichetteAllergene[a]).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="num text-sm font-bold text-profondo">
                          {p.prezzo > 0 ? euroCent(p.prezzo) : '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => { rimuoviPiatto(p.id); parla(`Ho tolto ${p.nome} dal menu.`) }}
                          className="grid h-7 w-7 place-content-center rounded-lg text-profondo/40 hover:bg-boa/10 hover:text-boa focus-visible:focus-ring"
                          title={`Elimina ${p.nome}`}
                          aria-label={`Elimina ${p.nome}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
