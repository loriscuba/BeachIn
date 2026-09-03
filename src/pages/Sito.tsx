import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2, ExternalLink, CalendarCheck, MessageSquare, Star, BarChart3, Globe, Check, X as XIcon,
  Image, Newspaper, Tags, Umbrella, Search, FileText,
} from 'lucide-react'
import type { StatoSito } from '@/data/types'
import { getDisponibilitaSito, getStatoSito } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { numero, percento, data as fmtData } from '@/lib/formatters'
import { etichetteTipologia } from '@/lib/arenile'
import { cn } from '@/lib/cn'

type Sezione = 'panoramica' | 'prenotazioni' | 'contenuti' | 'interazioni'

export default function Sito() {
  const { prenotazioniOnline, confermaPrenotazione, rifiutaPrenotazione, pagine, pubblicaPagina, listinoPubblicato } = useDemoData()
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

  const daConfermare = prenotazioniOnline.filter((p) => p.stato === 'da_confermare').length
  const nonLetti = sito?.messaggi.filter((m) => !m.letto).length ?? 0
  const votoMedio = useMemo(() => {
    if (!sito) return 0
    return sito.recensioni.reduce((s, r) => s + r.voto, 0) / sito.recensioni.length
  }, [sito])

  if (!sito || !disp) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
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
            { valore: 'contenuti', etichetta: 'Contenuti' },
            { valore: 'interazioni', etichetta: 'Recensioni e messaggi' },
          ]}
        />
        <Link to="/sito/anteprima" target="_blank" rel="noreferrer">
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
        <Card>
          <CardHeader titolo="Richieste di prenotazione online" sottotitolo={`${prenotazioniOnline.length} richieste`} />
          <CardBody className="pt-1">
            <ul className="divide-y divide-calce-200">
              {prenotazioniOnline.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-profondo">{p.nome} <span className="font-normal text-profondo/50">· {p.persone} pers.</span></p>
                    <p className="num text-xs text-profondo/55">
                      {fmtData(p.dal)} – {fmtData(p.al)} · {etichetteTipologia[p.tipologiaPostazione]}
                    </p>
                    {p.messaggio && <p className="mt-0.5 text-xs italic text-profondo/50">“{p.messaggio}”</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.stato === 'da_confermare' ? (
                      <>
                        <Button variante="primario" dimensione="sm" onClick={() => confermaPrenotazione(p.id)}><Check className="h-4 w-4" /> Conferma</Button>
                        <Button variante="secondario" dimensione="sm" onClick={() => rifiutaPrenotazione(p.id)}><XIcon className="h-4 w-4" /> Rifiuta</Button>
                      </>
                    ) : (
                      <Badge tono={p.stato === 'confermata' ? 'acqua' : 'boa'} puntino>{p.stato === 'confermata' ? 'Confermata' : 'Rifiutata'}</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
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
              <CardHeader titolo={<span className="inline-flex items-center gap-2"><Image className="h-4 w-4 text-cabina" /> Galleria</span>} sottotitolo={`${sito.galleria.length} foto`} />
              <CardBody className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
                {sito.galleria.map((f, i) => (
                  <div key={f.id} className="aspect-square overflow-hidden rounded-lg" style={{ background: ['#2E7D9A', '#7FB7A8', '#F2C14E', '#E4572E'][i % 4] }}>
                    <div className="flex h-full items-end bg-gradient-to-t from-profondo-900/40 p-1.5">
                      <span className="text-[10px] font-medium leading-tight text-white">{f.titolo}</span>
                    </div>
                  </div>
                ))}
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
