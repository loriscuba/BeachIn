import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2, ExternalLink, CalendarCheck, MessageSquare, Star, BarChart3, Globe, Check, X as XIcon,
  Image, Newspaper, Tags, Umbrella, Search, FileText, UtensilsCrossed, Inbox, Mail, Ticket, Upload,
} from 'lucide-react'
import type { Email, StatoSito, Turno } from '@/data/types'
import { getDisponibilitaSito, getStatoSito } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { numero, percento, data as fmtData } from '@/lib/formatters'
import { etichetteTipologia } from '@/lib/arenile'
import { importaImmagini, messaggioFileFalliti } from '@/lib/immagini'
import { cn } from '@/lib/cn'

type Sezione = 'panoramica' | 'prenotazioni' | 'posta' | 'contenuti' | 'interazioni'
const turnoLabel = (t: Turno) => (t === 'pranzo' ? 'Pranzo' : 'Cena')

export default function Sito() {
  const {
    prenotazioniOnline, confermaPrenotazione, rifiutaPrenotazione,
    richiesteRistorante, confermaRistorante, rifiutaRistorante,
    richiesteEventi, confermaEvento, rifiutaEvento,
    canaliPrenotazione, impostaCanalePrenotazione,
    postaAdmin, segnaEmailLetta, pagine, pubblicaPagina, listinoPubblicato,
    galleria, aggiungiFoto, rimuoviFoto, rinominaFoto,
  } = useDemoData()
  const [sito, setSito] = useState<StatoSito>()
  const [disp, setDisp] = useState<{ libere: number; totali: number; occupazione: number }>()
  const [sez, setSez] = useState<Sezione>('panoramica')
  const [home, setHome] = useState({ titolo: '', sottotitolo: '', testo: '' })

  useEffect(() => {
    Promise.all([getStatoSito(), getDisponibilitaSito()]).then(([s, d]) => {
      setSito(s); setDisp(d)
      setHome({ titolo: s.home.titolo, sottotitolo: s.home.sottotitolo, testo: s.home.testo })
    })
  }, [])

  const daConfermareOmbr = prenotazioniOnline.filter((p) => p.stato === 'da_confermare').length
  const daConfermareRist = richiesteRistorante.filter((p) => p.stato === 'da_confermare').length
  const daConfermareEve = richiesteEventi.filter((p) => p.stato === 'da_confermare').length
  const daConfermare = daConfermareOmbr + daConfermareRist + daConfermareEve
  const postaNonLetta = postaAdmin.filter((m) => !m.letto).length
  const nonLetti = sito?.messaggi.filter((m) => !m.letto).length ?? 0
  const votoMedio = useMemo(() => {
    if (!sito) return 0
    return sito.recensioni.reduce((s, r) => s + r.voto, 0) / sito.recensioni.length
  }, [sito])

  if (!sito || !disp) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  const caricaFotoGalleria = async (files: FileList | null) => {
    const falliti = await importaImmagini(files, (uri, file) => aggiungiFoto(uri, file.name.replace(/\.[^.]+$/, '')))
    if (falliti.length) alert(messaggioFileFalliti(falliti))
  }

  return (
    <div className="space-y-4">
      {/* Testata con anteprima */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          valore={sez}
          onChange={setSez}
          opzioni={[
            { valore: 'panoramica', etichetta: 'Panoramica' },
            { valore: 'prenotazioni', etichetta: `Prenotazioni${daConfermare ? ` (${daConfermare})` : ''}` },
            { valore: 'posta', etichetta: `Posta${postaNonLetta ? ` (${postaNonLetta})` : ''}` },
            { valore: 'contenuti', etichetta: 'Contenuti' },
            { valore: 'interazioni', etichetta: 'Recensioni e messaggi' },
          ]}
        />
        <Link to="/sito/anteprima">
          <Button variante="primario" dimensione="sm"><ExternalLink className="h-4 w-4" /> Anteprima sito</Button>
        </Link>
      </div>

      {sez === 'panoramica' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icona={CalendarCheck} etichetta="Prenotazioni da confermare" valore={String(daConfermare)} accento={daConfermare > 0} />
            <Kpi icona={MessageSquare} etichetta="Messaggi non letti" valore={String(nonLetti)} />
            <Kpi icona={Star} etichetta="Voto medio" valore={votoMedio.toFixed(1)} sotto={`${sito.recensioni.length} recensioni`} />
            <Kpi icona={BarChart3} etichetta="Visite (ieri)" valore={numero(sito.visite.at(-1)?.visite ?? 0)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Sincronizzazioni */}
            <Card>
              <CardHeader titolo="Sincronizzato con il gestionale" sottotitolo="Sul sito i dati sono sempre quelli veri" />
              <CardBody className="space-y-3 pt-2">
                <div className="flex items-center justify-between rounded-lg border border-calce-200 bg-white px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-profondo"><Umbrella className="h-4 w-4 text-cabina" /> Disponibilità ombrelloni</span>
                  <span className="text-right">
                    <span className="num block text-sm font-bold text-profondo">{disp.libere} liberi</span>
                    <span className="text-xs text-profondo/50">occupazione {percento(disp.occupazione)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-calce-200 bg-white px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-profondo"><Tags className="h-4 w-4 text-cabina" /> Listino prezzi</span>
                  <Badge tono={listinoPubblicato ? 'acqua' : 'tenda'} puntino>{listinoPubblicato ? 'Pubblicato' : 'Bozza'}</Badge>
                </div>
                <p className="text-xs text-profondo/50">
                  Disponibilità e listino non si inseriscono qui: arrivano da Arenile e Tariffe e si aggiornano da soli.
                </p>
              </CardBody>
            </Card>

            {/* Statistiche visite */}
            <Card>
              <CardHeader titolo="Visite del sito" sottotitolo="Ultimi 30 giorni" />
              <CardBody className="pt-3">
                <MiniVisite dati={sito.visite} />
              </CardBody>
            </Card>
          </div>

          {/* SEO */}
          <Card>
            <CardHeader titolo={<span className="inline-flex items-center gap-2"><Search className="h-4 w-4 text-cabina" /> SEO</span>} />
            <CardBody className="space-y-2 pt-1 text-sm">
              <p><span className="text-profondo/50">Titolo:</span> <span className="font-medium text-profondo">{sito.seo.titolo}</span></p>
              <p><span className="text-profondo/50">Descrizione:</span> {sito.seo.descrizione}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sito.seo.keyword.map((k) => <Badge key={k} tono="neutro">{k}</Badge>)}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {sez === 'prenotazioni' && (
        <div className="space-y-4">
          {/* Canali attivi sul sito pubblico */}
          <Card>
            <CardHeader
              titolo={<span className="inline-flex items-center gap-2"><Globe className="h-4 w-4 text-cabina" /> Prenotazioni online attive</span>}
              sottotitolo="Decidi cosa può essere prenotato dal sito pubblico"
            />
            <CardBody className="grid gap-2 pt-1 sm:grid-cols-3">
              <Interruttore icona={Umbrella} etichetta="Ombrelloni" attivo={canaliPrenotazione.ombrelloni} onCambia={(v) => impostaCanalePrenotazione('ombrelloni', v)} />
              <Interruttore icona={UtensilsCrossed} etichetta="Ristorante" attivo={canaliPrenotazione.ristorante} onCambia={(v) => impostaCanalePrenotazione('ristorante', v)} />
              <Interruttore icona={Ticket} etichetta="Eventi" attivo={canaliPrenotazione.eventi} onCambia={(v) => impostaCanalePrenotazione('eventi', v)} />
            </CardBody>
          </Card>

          <p className="text-sm text-profondo/60">
            Le richieste arrivano dal sito. Alla conferma o al rifiuto parte in automatico un’email al cliente (visibile in “La mia posta” sul sito).
          </p>

          {/* Ombrelloni */}
          <Card>
            <CardHeader titolo={<span className="inline-flex items-center gap-2"><Umbrella className="h-4 w-4 text-cabina" /> Ombrelloni</span>} sottotitolo={`${prenotazioniOnline.length} richieste`} />
            <CardBody className="pt-1">
              {prenotazioniOnline.length === 0 ? <Vuoto testo="Nessuna richiesta ombrellone." /> : (
                <ul className="divide-y divide-calce-200">
                  {prenotazioniOnline.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-profondo">{p.nome} <span className="font-normal text-profondo/50">· {p.persone} pers.</span></p>
                        <p className="num text-xs text-profondo/55">{fmtData(p.dal)} – {fmtData(p.al)} · {etichetteTipologia[p.tipologiaPostazione]}</p>
                        {p.messaggio && <p className="mt-0.5 text-xs italic text-profondo/50">“{p.messaggio}”</p>}
                      </div>
                      <AzioniRichiesta stato={p.stato} onConferma={() => confermaPrenotazione(p.id)} onRifiuta={() => rifiutaPrenotazione(p.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Ristorante */}
          <Card>
            <CardHeader titolo={<span className="inline-flex items-center gap-2"><UtensilsCrossed className="h-4 w-4 text-cabina" /> Ristorante</span>} sottotitolo={`${richiesteRistorante.length} richieste`} />
            <CardBody className="pt-1">
              {richiesteRistorante.length === 0 ? <Vuoto testo="Nessuna richiesta tavolo. Provane una dal sito → “Prenota un tavolo”." /> : (
                <ul className="divide-y divide-calce-200">
                  {richiesteRistorante.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-profondo">{p.nome} <span className="font-normal text-profondo/50">· {p.coperti} coperti</span></p>
                        <p className="num text-xs text-profondo/55">{turnoLabel(p.turno)} del {fmtData(p.data)}</p>
                        {p.note && <p className="mt-0.5 text-xs italic text-profondo/50">“{p.note}”</p>}
                      </div>
                      <AzioniRichiesta stato={p.stato} onConferma={() => confermaRistorante(p.id)} onRifiuta={() => rifiutaRistorante(p.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Eventi */}
          <Card>
            <CardHeader titolo={<span className="inline-flex items-center gap-2"><Ticket className="h-4 w-4 text-cabina" /> Eventi</span>} sottotitolo={`${richiesteEventi.length} richieste`} />
            <CardBody className="pt-1">
              {richiesteEventi.length === 0 ? <Vuoto testo="Nessuna richiesta di partecipazione. Provane una dal sito → sezione “Eventi”." /> : (
                <ul className="divide-y divide-calce-200">
                  {richiesteEventi.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-profondo">{p.nome} <span className="font-normal text-profondo/50">· {p.persone} pers.</span></p>
                        <p className="num text-xs text-profondo/55">{p.eventoNome} · {fmtData(p.eventoData)}</p>
                        {p.note && <p className="mt-0.5 text-xs italic text-profondo/50">“{p.note}”</p>}
                      </div>
                      <AzioniRichiesta stato={p.stato} onConferma={() => confermaEvento(p.id)} onRifiuta={() => rifiutaEvento(p.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {sez === 'posta' && (
        <Card>
          <CardHeader
            titolo={<span className="inline-flex items-center gap-2"><Inbox className="h-4 w-4 text-cabina" /> Posta amministratore</span>}
            sottotitolo="Notifiche delle richieste in arrivo dal sito"
          />
          <CardBody className="pt-1">
            <CasellaPosta emails={postaAdmin} onLetta={segnaEmailLetta} vuoto="Nessuna notifica. Invia una richiesta dal sito e comparirà qui." />
          </CardBody>
        </Card>
      )}

      {sez === 'contenuti' && (
        <div className="space-y-4">
          {/* Pagine */}
          <Card>
            <CardHeader titolo={<span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-cabina" /> Pagine del sito</span>} />
            <CardBody className="pt-1">
              <ul className="divide-y divide-calce-200">
                {pagine.map((pg) => (
                  <li key={pg.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-profondo">{pg.titolo}</p>
                      <p className="num text-xs text-profondo/50">/{pg.slug} · agg. {fmtData(pg.aggiornata)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tono={pg.pubblicata ? 'acqua' : 'tenda'} puntino>{pg.pubblicata ? 'Pubblicata' : 'Bozza'}</Badge>
                      {!pg.pubblicata && <Button variante="secondario" dimensione="sm" onClick={() => pubblicaPagina(pg.id)}>Pubblica</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Editor homepage */}
          <Card>
            <CardHeader titolo="Editor homepage" sottotitolo="Titolo, testo e immagine di apertura" />
            <CardBody className="space-y-3 pt-1">
              <Campo label="Titolo"><input className={ic} value={home.titolo} onChange={(e) => setHome((h) => ({ ...h, titolo: e.target.value }))} /></Campo>
              <Campo label="Sottotitolo"><input className={ic} value={home.sottotitolo} onChange={(e) => setHome((h) => ({ ...h, sottotitolo: e.target.value }))} /></Campo>
              <Campo label="Testo"><textarea rows={3} className={cn(ic, 'h-auto py-2')} value={home.testo} onChange={(e) => setHome((h) => ({ ...h, testo: e.target.value }))} /></Campo>
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-calce-300 bg-calce/40 px-3 py-3 text-sm text-profondo/55">
                <Image className="h-4 w-4" /> Immagine di apertura: <span className="font-medium text-profondo/70">{sito.home.immagine}</span>
              </div>
            </CardBody>
          </Card>

          {/* Galleria + news */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                titolo={<span className="inline-flex items-center gap-2"><Image className="h-4 w-4 text-cabina" /> Galleria</span>}
                sottotitolo={`${galleria.length} foto`}
                azione={
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-calce-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-profondo hover:bg-calce">
                    <Upload className="h-3.5 w-3.5" /> Carica foto
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => { caricaFotoGalleria(e.target.files); e.target.value = '' }}
                    />
                  </label>
                }
              />
              <CardBody className="pt-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {galleria.map((f, i) => (
                    <div key={f.id} className="space-y-1">
                      <div
                        className="group relative aspect-square overflow-hidden rounded-lg border border-calce-200"
                        style={{ background: f.immagine ? undefined : ['#2E7D9A', '#7FB7A8', '#F2C14E', '#E4572E'][i % 4] }}
                      >
                        {f.immagine ? (
                          <img src={f.immagine} alt={f.titolo} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-end bg-gradient-to-t from-profondo-900/40 p-1.5">
                            <span className="text-[10px] font-medium leading-tight text-white">{f.titolo}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => rimuoviFoto(f.id)}
                          title={`Rimuovi ${f.titolo}`}
                          aria-label={`Rimuovi ${f.titolo}`}
                          className="absolute right-1 top-1 grid h-6 w-6 place-content-center rounded-md bg-profondo-900/60 text-white hover:bg-boa"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        value={f.titolo}
                        onChange={(e) => rinominaFoto(f.id, e.target.value)}
                        placeholder="Didascalia"
                        aria-label="Didascalia foto"
                        className="w-full rounded-md border border-calce-200 bg-white px-1.5 py-1 text-[11px] text-profondo focus-visible:focus-ring"
                      />
                    </div>
                  ))}
                  {galleria.length === 0 && (
                    <p className="col-span-full py-6 text-center text-sm text-profondo/45">
                      Nessuna foto. Usa «Carica foto» per aggiungerle (anche più di una alla volta).
                    </p>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-profondo/45">
                  Le foto vengono ridimensionate e compaiono sul sito pubblico. In demo restano in memoria.
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader titolo={<span className="inline-flex items-center gap-2"><Newspaper className="h-4 w-4 text-cabina" /> News ed eventi</span>} />
              <CardBody className="pt-1">
                <ul className="divide-y divide-calce-200">
                  {sito.news.map((n) => (
                    <li key={n.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-profondo">{n.titolo}</p>
                        <p className="num text-xs text-profondo/50">{fmtData(n.data)}</p>
                      </div>
                      <Badge tono={n.pubblicata ? 'acqua' : 'tenda'}>{n.pubblicata ? 'Pubblicata' : 'Bozza'}</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {sez === 'interazioni' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader titolo="Recensioni" sottotitolo={`Voto medio ${votoMedio.toFixed(1)} / 5`} />
            <CardBody className="pt-1">
              <ul className="divide-y divide-calce-200">
                {sito.recensioni.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-profondo">{r.autore}</span>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('h-3.5 w-3.5', i < r.voto ? 'fill-tenda text-tenda' : 'text-calce-300')} />
                        ))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-profondo/70">{r.testo}</p>
                    {!r.pubblicata && <Badge tono="tenda" className="mt-1">Non pubblicata</Badge>}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader titolo="Messaggi dal form contatti" sottotitolo={`${nonLetti} non letti`} />
            <CardBody className="pt-1">
              <ul className="divide-y divide-calce-200">
                {sito.messaggi.map((m) => (
                  <li key={m.id} className={cn('py-2.5', !m.letto && 'font-medium')}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-profondo">{m.nome} · <span className="text-profondo/60">{m.oggetto}</span></span>
                      {!m.letto && <span className="h-2 w-2 rounded-full bg-cabina" />}
                    </div>
                    <p className="num text-xs text-profondo/45">{fmtData(m.data)} · {m.email}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

function Vuoto({ testo }: { testo: string }) {
  return <p className="py-6 text-center text-sm text-profondo/45">{testo}</p>
}

function Interruttore({ icona: Icona, etichetta, attivo, onCambia }: { icona: typeof Globe; etichetta: string; attivo: boolean; onCambia: (v: boolean) => void }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors', attivo ? 'border-acqua/50 bg-acqua/10' : 'border-calce-200 bg-calce/40')}>
      <span className="flex items-center gap-2 text-sm font-medium text-profondo"><Icona className={cn('h-4 w-4', attivo ? 'text-cabina' : 'text-profondo/40')} /> {etichetta}</span>
      <button
        type="button"
        role="switch"
        aria-checked={attivo}
        aria-label={`Prenotazioni ${etichetta} ${attivo ? 'attive' : 'sospese'}`}
        onClick={() => onCambia(!attivo)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:focus-ring', attivo ? 'bg-acqua' : 'bg-calce-300')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', attivo ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}

function AzioniRichiesta({ stato, onConferma, onRifiuta }: { stato: 'da_confermare' | 'confermata' | 'rifiutata'; onConferma: () => void; onRifiuta: () => void }) {
  if (stato !== 'da_confermare') {
    return <Badge tono={stato === 'confermata' ? 'acqua' : 'boa'} puntino>{stato === 'confermata' ? 'Confermata' : 'Rifiutata'}</Badge>
  }
  return (
    <div className="flex items-center gap-2">
      <Button variante="primario" dimensione="sm" onClick={onConferma}><Check className="h-4 w-4" /> Conferma</Button>
      <Button variante="secondario" dimensione="sm" onClick={onRifiuta}><XIcon className="h-4 w-4" /> Rifiuta</Button>
    </div>
  )
}

function CasellaPosta({ emails, onLetta, vuoto }: { emails: Email[]; onLetta: (id: string) => void; vuoto: string }) {
  const [aperto, setAperto] = useState<string>()
  if (emails.length === 0) return <Vuoto testo={vuoto} />
  return (
    <ul className="space-y-2">
      {emails.map((m) => {
        const open = aperto === m.id
        return (
          <li key={m.id} className="overflow-hidden rounded-lg border border-calce-200 bg-white">
            <button onClick={() => { setAperto(open ? undefined : m.id); if (!m.letto) onLetta(m.id) }} className="flex w-full items-start gap-2 px-3 py-2.5 text-left">
              <Mail className={cn('mt-0.5 h-4 w-4 shrink-0', m.letto ? 'text-profondo/30' : 'text-cabina')} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cn('truncate text-sm', m.letto ? 'font-medium text-profondo' : 'font-bold text-profondo')}>{m.oggetto}</span>
                  <span className="num shrink-0 text-[11px] text-profondo/45">{fmtData(m.data)}</span>
                </span>
                <span className="truncate text-xs text-profondo/50">da {m.da}</span>
              </span>
              {!m.letto && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-boa" />}
            </button>
            {open && <div className="whitespace-pre-line border-t border-calce-200 bg-calce/40 px-3 py-2.5 text-sm text-profondo/80">{m.corpo}</div>}
          </li>
        )
      })}
    </ul>
  )
}

function MiniVisite({ dati }: { dati: StatoSito['visite'] }) {
  const max = Math.max(1, ...dati.map((d) => d.visite))
  const tot = dati.reduce((s, d) => s + d.visite, 0)
  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {dati.map((d) => (
          <div key={d.data} className="flex-1 rounded-t bg-cabina/70" style={{ height: `${(d.visite / max) * 100}%` }} title={`${fmtData(d.data)}: ${d.visite} visite`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-profondo/55">Totale 30 giorni: <span className="num font-medium text-profondo">{numero(tot)} visite</span></p>
    </div>
  )
}

const ic = 'h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring'

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-profondo/60">{label}</span>
      {children}
    </label>
  )
}

function Kpi({ icona: Icona, etichetta, valore, sotto, accento }: { icona: typeof Globe; etichetta: string; valore: string; sotto?: string; accento?: boolean }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/50">
          <Icona className="h-3.5 w-3.5 text-cabina" /> {etichetta}
        </p>
        <p className={cn('num mt-0.5 text-2xl font-bold', accento ? 'text-boa' : 'text-profondo')}>{valore}</p>
        {sotto && <p className="num text-xs text-profondo/50">{sotto}</p>}
      </CardBody>
    </Card>
  )
}
