import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, X, Phone, Mail, Umbrella, Wallet, CalendarDays, FileText, Baby, Plus } from 'lucide-react'
import type { Cliente, TipologiaCliente } from '@/data/types'
import { getClienti } from '@/data/api'
import { useDemoData } from '@/context/DemoDataContext'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { Tabella, type Colonna } from '@/components/ui/Tabella'
import { euro, iniziali, percento } from '@/lib/formatters'
import { etichetteTipologiaCliente } from '@/lib/etichette'
import { cn } from '@/lib/cn'

type Vista = 'elenco' | 'storici'

const tonoTipologia: Record<TipologiaCliente, 'stagionale' | 'mare' | 'acqua' | 'tenda' | 'neutro'> = {
  stagionale: 'stagionale', mensile: 'mare', quindicinale: 'acqua', settimanale: 'acqua',
  giornaliero: 'tenda', occasionale: 'neutro',
}

export default function Clienti() {
  const { clientiAggiunti, aggiungiCliente } = useDemoData()
  const [caricati, setCaricati] = useState<Cliente[]>([])
  const [caricato, setCaricato] = useState(false)
  const [vista, setVista] = useState<Vista>('elenco')
  const [ricerca, setRicerca] = useState('')
  const [filtro, setFiltro] = useState<TipologiaCliente | 'tutti'>('tutti')
  const [selezionato, setSelezionato] = useState<Cliente>()
  const [modale, setModale] = useState(false)

  useEffect(() => {
    getClienti().then((c) => {
      setCaricati(c)
      setCaricato(true)
    })
  }, [])

  // I clienti creati in demo si affiancano a quelli caricati
  const clienti = useMemo(() => [...clientiAggiunti, ...caricati], [clientiAggiunti, caricati])

  const filtrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase()
    let out = clienti.filter((c) => {
      if (filtro !== 'tutti' && c.tipologia !== filtro) return false
      if (q && !`${c.nome} ${c.cognome} ${c.email}`.toLowerCase().includes(q)) return false
      return true
    })
    if (vista === 'storici') out = [...out].sort((a, b) => b.clienteDaAnni - a.clienteDaAnni || b.valoreStagione - a.valoreStagione)
    return out
  }, [clienti, ricerca, filtro, vista])

  if (!caricato) {
    return <div className="grid h-64 place-items-center text-profondo/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  const colonne: Colonna<Cliente>[] = [
    {
      chiave: 'nome', intestazione: 'Cliente',
      cella: (c) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-profondo/10 text-xs font-bold text-profondo">
            {iniziali(c.nome, c.cognome)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-profondo">{c.nome} {c.cognome}</p>
            <p className="truncate text-xs text-profondo/50">{c.email}</p>
          </div>
        </div>
      ),
    },
    {
      chiave: 'tipologia', intestazione: 'Tipologia',
      cella: (c) => <Badge tono={tonoTipologia[c.tipologia]}>{etichetteTipologiaCliente[c.tipologia]}</Badge>,
    },
    { chiave: 'comp', intestazione: 'Pers.', allineaDx: true, nascondiMobile: true, cella: (c) => <span className="num">{c.componenti}</span> },
    {
      chiave: 'post', intestazione: 'Postazione', nascondiMobile: true,
      cella: (c) => <span className="num text-profondo/70">{c.postazioneId ?? c.postazionePreferita ?? '—'}</span>,
    },
    {
      chiave: 'anni', intestazione: vista === 'storici' ? 'Fedeltà' : 'Da anni', allineaDx: true,
      cella: (c) => <span className="num">{c.clienteDaAnni} {c.clienteDaAnni === 1 ? 'anno' : 'anni'}</span>,
    },
    {
      chiave: 'valore', intestazione: 'Valore staz.', allineaDx: true,
      cella: (c) => <span className="num font-semibold text-profondo">{euro(c.valoreStagione)}</span>,
    },
    {
      chiave: 'saldo', intestazione: 'Saldo', allineaDx: true, nascondiMobile: true,
      cella: (c) => c.saldoAperto > 0 ? <span className="num font-medium text-boa">{euro(c.saldoAperto)}</span> : <span className="text-profondo/30">—</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          valore={vista}
          onChange={setVista}
          opzioni={[{ valore: 'elenco', etichetta: 'Elenco' }, { valore: 'storici', etichetta: 'Clienti storici' }]}
        />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-profondo/40" />
            <input
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca nome o email…"
              className="h-9 w-full rounded-lg border border-calce-200 bg-white pl-9 pr-8 text-sm text-profondo focus-visible:focus-ring"
            />
            {ricerca && (
              <button onClick={() => setRicerca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-profondo/40 hover:text-profondo">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="w-40">
            <Select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as TipologiaCliente | 'tutti')}
              opzioni={[{ valore: 'tutti', etichetta: 'Tutte le tipologie' }, ...Object.entries(etichetteTipologiaCliente).map(([v, l]) => ({ valore: v, etichetta: l }))]}
            />
          </div>
          <Button variante="primario" dimensione="sm" onClick={() => setModale(true)}>
            <Plus className="h-4 w-4" /> Nuovo cliente
          </Button>
        </div>
      </div>

      <Card>
        <CardBody className="px-1 py-1 sm:px-2">
          <div className="px-2 pt-1 text-xs text-profondo/50">
            {filtrati.length} clienti{vista === 'storici' ? ' · ordinati per fedeltà' : ''}
          </div>
          <Tabella colonne={colonne} righe={filtrati} chiaveRiga={(c) => c.id} onRigaClick={setSelezionato} />
        </CardBody>
      </Card>

      <SchedaCliente cliente={selezionato} onChiudi={() => setSelezionato(undefined)} />

      <NuovoCliente
        aperto={modale}
        onChiudi={() => setModale(false)}
        onSalva={(c) => { aggiungiCliente(c); setModale(false); setSelezionato(c) }}
      />
    </div>
  )
}

function NuovoCliente({ aperto, onChiudi, onSalva }: { aperto: boolean; onChiudi: () => void; onSalva: (c: Cliente) => void }) {
  const vuoto = {
    nome: '', cognome: '', telefono: '', email: '',
    tipologia: 'giornaliero' as TipologiaCliente, componenti: '2', conBambini: false,
    postazionePreferita: '', clienteDaAnni: '0', note: '',
  }
  const [f, setF] = useState(vuoto)
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))
  const valido = f.nome.trim() && f.cognome.trim()

  const salva = () => {
    const nome = f.nome.trim()
    const cognome = f.cognome.trim()
    onSalva({
      id: `C-NEW-${Date.now()}`,
      nome, cognome,
      telefono: f.telefono.trim() || '—',
      email: f.email.trim() || `${nome.toLowerCase()}.${cognome.toLowerCase().replace(/[^a-z]/g, '')}@example.it`,
      tipologia: f.tipologia,
      componenti: Math.max(1, Number(f.componenti) || 1),
      conBambini: f.conBambini,
      postazionePreferita: f.postazionePreferita.trim() || undefined,
      postazioneId: undefined,
      clienteDaAnni: Math.max(0, Number(f.clienteDaAnni) || 0),
      saldoAperto: 0,
      valoreStagione: 0,
      note: f.note.trim() || undefined,
    })
    setF(vuoto)
  }

  return (
    <Modal
      aperto={aperto}
      onChiudi={onChiudi}
      titolo="Nuovo cliente"
      piede={
        <div className="flex justify-end gap-2">
          <Button variante="secondario" onClick={onChiudi}>Annulla</Button>
          <Button variante="primario" onClick={salva} disabled={!valido}>Salva cliente</Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <CampoC label="Nome"><input className={icc} value={f.nome} onChange={(e) => set('nome', e.target.value)} /></CampoC>
        <CampoC label="Cognome"><input className={icc} value={f.cognome} onChange={(e) => set('cognome', e.target.value)} /></CampoC>
        <CampoC label="Telefono"><input className={`${icc} num`} value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="340 1234567" /></CampoC>
        <CampoC label="Email"><input className={icc} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="opzionale" /></CampoC>
        <CampoC label="Tipologia">
          <Select value={f.tipologia} onChange={(e) => set('tipologia', e.target.value)}
            opzioni={Object.entries(etichetteTipologiaCliente).map(([v, l]) => ({ valore: v, etichetta: l }))} />
        </CampoC>
        <CampoC label="Componenti"><input type="number" min={1} className={`${icc} num`} value={f.componenti} onChange={(e) => set('componenti', e.target.value)} /></CampoC>
        <CampoC label="Cliente da (anni)"><input type="number" min={0} className={`${icc} num`} value={f.clienteDaAnni} onChange={(e) => set('clienteDaAnni', e.target.value)} /></CampoC>
        <CampoC label="Postazione preferita"><input className={icc} value={f.postazionePreferita} onChange={(e) => set('postazionePreferita', e.target.value)} placeholder="es. Fila B" /></CampoC>
        <label className="col-span-2 flex items-center gap-2 text-sm text-profondo">
          <input type="checkbox" checked={f.conBambini} onChange={(e) => set('conBambini', e.target.checked)} className="h-4 w-4 rounded border-calce-300 text-cabina focus-visible:focus-ring" />
          Con bambini
        </label>
        <CampoC label="Note" span2><textarea rows={2} className={`${icc} h-auto py-2`} value={f.note} onChange={(e) => set('note', e.target.value)} /></CampoC>
      </div>
    </Modal>
  )
}

const icc = 'h-9 w-full rounded-lg border border-calce-200 bg-white px-3 text-sm text-profondo focus-visible:focus-ring'

function CampoC({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn('block', span2 && 'col-span-2')}>
      <span className="mb-1 block text-xs font-medium text-profondo/60">{label}</span>
      {children}
    </label>
  )
}

function SchedaCliente({ cliente: c, onChiudi }: { cliente?: Cliente; onChiudi: () => void }) {
  // Ripartizione sintetica del valore stagione (deterministica, per la scheda)
  const spiaggia = c ? Math.round(c.valoreStagione * 0.58) : 0
  const bar = c ? Math.round(c.valoreStagione * 0.24) : 0
  const ristorante = c ? c.valoreStagione - spiaggia - bar : 0

  return (
    <Drawer
      aperto={!!c}
      onChiudi={onChiudi}
      intestazione={
        c ? (
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-profondo text-sm font-bold text-white">
              {iniziali(c.nome, c.cognome)}
            </span>
            <div>
              <h2 className="text-base font-bold text-profondo">{c.nome} {c.cognome}</h2>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge tono={tonoTipologia[c.tipologia]}>{etichetteTipologiaCliente[c.tipologia]}</Badge>
                <span className="text-xs text-profondo/50">cliente da {c.clienteDaAnni} {c.clienteDaAnni === 1 ? 'anno' : 'anni'}</span>
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      {c && (
        <div className="space-y-4">
          {/* Contatti */}
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-calce-200 bg-white p-3 text-sm">
            <span className="flex items-center gap-2 text-profondo/75"><Phone className="h-4 w-4 text-cabina" /> <span className="num">{c.telefono}</span></span>
            <span className="flex items-center gap-2 text-profondo/75"><Mail className="h-4 w-4 text-cabina" /> {c.email}</span>
            <span className="flex items-center gap-2 text-profondo/75">
              <Umbrella className="h-4 w-4 text-cabina" /> {c.postazioneId ? `Postazione ${c.postazioneId}` : c.postazionePreferita ?? 'Nessuna postazione fissa'}
            </span>
            <span className="flex items-center gap-2 text-profondo/75">
              <Baby className="h-4 w-4 text-cabina" /> {c.componenti} persone{c.conBambini ? ' · con bambini' : ''}
            </span>
          </div>

          {/* Valore stagione */}
          <Sezione icona={CalendarDays} titolo="Valore in stagione">
            <p className="num text-2xl font-bold text-profondo">{euro(c.valoreStagione)}</p>
            <div className="mt-2 space-y-1.5">
              {[
                { l: 'Spiaggia', v: spiaggia }, { l: 'Bar', v: bar }, { l: 'Ristorante', v: ristorante },
              ].map((r) => (
                <div key={r.l}>
                  <div className="flex justify-between text-xs text-profondo/65">
                    <span>{r.l}</span><span className="num">{euro(r.v)} · {percento(r.v / c.valoreStagione)}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-calce-200">
                    <div className="h-full rounded-full bg-cabina" style={{ width: `${(r.v / c.valoreStagione) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Sezione>

          {/* Saldo */}
          <Sezione icona={Wallet} titolo="Saldo">
            {c.saldoAperto > 0 ? (
              <p className="text-sm"><span className="num font-bold text-boa">{euro(c.saldoAperto)}</span> <span className="text-profondo/55">da incassare</span></p>
            ) : (
              <p className="text-sm text-profondo/55">Nessun saldo aperto.</p>
            )}
          </Sezione>

          {/* Documenti */}
          <Sezione icona={FileText} titolo="Documenti">
            <ul className="space-y-1">
              {['Documento d’identità', 'Consenso privacy', 'Contratto stagionale'].map((d, i) => (
                <li key={d} className="flex items-center justify-between text-sm">
                  <span className="text-profondo/75">{d}</span>
                  <Badge tono={i < (c.tipologia === 'stagionale' ? 3 : 2) ? 'acqua' : 'neutro'}>
                    {i < (c.tipologia === 'stagionale' ? 3 : 2) ? 'presente' : 'mancante'}
                  </Badge>
                </li>
              ))}
            </ul>
          </Sezione>

          {c.note && (
            <div className={cn('rounded-lg bg-tenda/15 px-3 py-2 text-sm text-[#7A5A12]')}>
              <span className="font-medium">Nota:</span> {c.note}
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

function Sezione({ icona: Icona, titolo, children }: { icona: typeof Phone; titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-profondo/45">
        <Icona className="h-3.5 w-3.5" /> {titolo}
      </p>
      {children}
    </div>
  )
}
