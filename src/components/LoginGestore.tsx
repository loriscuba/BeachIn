import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useSessione } from '@/context/SessioneContext'
import { cn } from '@/lib/cn'
import { supabaseAttivo } from '@/lib/supabase'
import { UTENTI_ADMIN } from '@/lib/adminapp'

/** Accesso dello staff (gestionale e app admin): nome utente (o email) + password Supabase Auth, oppure credenziali demo senza Supabase. */
export function LoginGestore({ onEntra, className }: { onEntra?: () => void; className?: string }) {
  const { accedi } = useSessione()
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [vedi, setVedi] = useState(false)
  const campo = 'h-12 w-full rounded-xl border border-calce-200 bg-white px-4 text-base focus-visible:focus-ring'
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setAttesa(true)
        const err = await accedi(utente, password)
        setAttesa(false)
        if (err) setErrore(err)
        else onEntra?.()
      }}
      className={cn('mx-auto mt-6 w-full max-w-md space-y-3 rounded-2xl bg-white p-5 text-profondo shadow-sm', className)}
    >
      <h1 className="text-center font-display text-2xl font-semibold">Area gestore</h1>
      <input value={utente} onChange={(e) => { setUtente(e.target.value); setErrore(null) }} placeholder="Nome utente" type="text" autoCorrect="off" autoCapitalize="none" autoComplete="username" className={campo} />
      <div className="relative">
        <input value={password} onChange={(e) => { setPassword(e.target.value); setErrore(null) }} type={vedi ? 'text' : 'password'} placeholder="Password" autoComplete="current-password" className={cn(campo, 'pr-12')} />
        <button type="button" onClick={() => setVedi(!vedi)} className="absolute inset-y-0 right-0 grid w-12 place-content-center text-profondo/50 hover:text-profondo" aria-label={vedi ? 'Nascondi password' : 'Mostra password'}>
          {vedi ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {errore && <p className="text-sm text-boa">{errore}</p>}
      {!supabaseAttivo && (
        // demo locale: un tocco compila l'utente del ruolo (per provare l'app su più dispositivi)
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-profondo/55">
          <span>Demo (password <b>lido</b>):</span>
          {UTENTI_ADMIN.map((u) => (
            <button key={u.utente} type="button" onClick={() => { setUtente(u.utente); setPassword(u.password); setErrore(null) }} className="rounded-full border border-calce-200 px-2.5 py-1 font-medium text-profondo/70 hover:bg-calce">{u.ruolo}</button>
          ))}
        </div>
      )}
      <button disabled={attesa} className="h-12 w-full rounded-xl bg-cabina text-base font-semibold text-white hover:bg-profondo disabled:opacity-60">{attesa ? 'Accesso…' : 'Entra'}</button>
    </form>
  )
}
