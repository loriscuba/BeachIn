import { useState } from 'react'
import { credenzialiValide } from '@/lib/adminapp'
import { cn } from '@/lib/cn'

/** Accesso del gestore (gestionale e app admin). Credenziali demo in `src/lib/adminapp.ts`. */
export function LoginGestore({ onEntra, className }: { onEntra: () => void; className?: string }) {
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState(false)
  const campo = 'h-12 w-full rounded-xl border border-calce-200 bg-white px-4 text-base focus-visible:focus-ring'
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (credenzialiValide(utente, password)) onEntra(); else setErrore(true) }}
      className={cn('mx-auto mt-6 w-full max-w-md space-y-3 rounded-2xl bg-white p-5 text-profondo shadow-sm', className)}
    >
      <h1 className="text-center font-display text-2xl font-semibold">Area gestore</h1>
      <input value={utente} onChange={(e) => { setUtente(e.target.value); setErrore(false) }} placeholder="Utente" autoCapitalize="none" autoComplete="username" className={campo} />
      <input value={password} onChange={(e) => { setPassword(e.target.value); setErrore(false) }} type="password" placeholder="Password" autoComplete="current-password" className={campo} />
      {errore && <p className="text-sm text-boa">Utente o password non corretti.</p>}
      <button className="h-12 w-full rounded-xl bg-cabina text-base font-semibold text-white hover:bg-profondo">Entra</button>
    </form>
  )
}
