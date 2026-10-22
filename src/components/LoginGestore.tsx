import { useState } from 'react'
import { useSessione } from '@/context/SessioneContext'
import { supabaseAttivo } from '@/lib/supabase'
import { cn } from '@/lib/cn'

/** Accesso dello staff (gestionale e app admin): email + password Supabase Auth, oppure credenziali demo senza Supabase. */
export function LoginGestore({ onEntra, className }: { onEntra?: () => void; className?: string }) {
  const { accedi } = useSessione()
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)
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
      <input value={utente} onChange={(e) => { setUtente(e.target.value); setErrore(null) }} placeholder={supabaseAttivo ? 'Email' : 'Utente'} type={supabaseAttivo ? 'email' : 'text'} autoCapitalize="none" autoComplete="username" className={campo} />
      <input value={password} onChange={(e) => { setPassword(e.target.value); setErrore(null) }} type="password" placeholder="Password" autoComplete="current-password" className={campo} />
      {errore && <p className="text-sm text-boa">{errore}</p>}
      <button disabled={attesa} className="h-12 w-full rounded-xl bg-cabina text-base font-semibold text-white hover:bg-profondo disabled:opacity-60">{attesa ? 'Accesso…' : 'Entra'}</button>
    </form>
  )
}
