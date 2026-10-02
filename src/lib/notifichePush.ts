/**
 * Notifiche push dell'app admin (Web Push + service worker `public/sw-admin.js`).
 * L'iscrizione del telefono viene salvata su Supabase (RPC `beachin.registra_push`); a ogni nuova
 * richiesta tavolo un trigger chiama la Edge Function `beachin-push` che invia la notifica.
 */
import { supabase } from '@/lib/supabase'

/** Chiave pubblica VAPID (la privata è nel Vault di Supabase). */
const VAPID_PUBBLICA = 'BKCQla4JMqnJkbo21hLm_4czvgZK6zPnH6xYFU0CLOea0wBc-BweE9rvi6OD-xAqyK4IiMI9H2_TA8cAOuSBCMU'

export type StatoPush = 'non-supportato' | 'serve-installazione' | 'negato' | 'attivo' | 'da-attivare' | 'senza-server'

const base64ToBytes = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
export const isInstallata = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

async function registrazione() {
  return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw-admin.js`, { scope: import.meta.env.BASE_URL })
}

export async function statoPush(): Promise<StatoPush> {
  if (!supabase) return 'senza-server'
  if (isIos() && !isInstallata()) return 'serve-installazione'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'non-supportato'
  if (Notification.permission === 'denied') return 'negato'
  const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'attivo' : 'da-attivare'
}

/** Chiede il permesso, iscrive il telefono e salva l'iscrizione su Supabase. */
export async function attivaPush(): Promise<StatoPush> {
  if (!supabase) return 'senza-server'
  const permesso = await Notification.requestPermission()
  if (permesso !== 'granted') return permesso === 'denied' ? 'negato' : 'da-attivare'
  const reg = await registrazione()
  await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(VAPID_PUBBLICA) }))
  const j = sub.toJSON()
  const { error } = await supabase.rpc('registra_push', {
    p_endpoint: sub.endpoint, p_p256dh: j.keys?.p256dh ?? '', p_auth: j.keys?.auth ?? '', p_url: window.location.href,
  })
  if (error) throw new Error(error.message)
  return 'attivo'
}

/** Collega manifest e meta iOS alla pagina corrente (sostituisce quelli di un'altra app già aperta). */
export function impostaManifest(manifest: string, icona: string, titolo: string) {
  const base = import.meta.env.BASE_URL
  const metti = (tag: string, chiave: string, valore: string, attr: string, val: string) => {
    let el = document.head.querySelector(`${tag}[${chiave}="${valore}"]`)
    if (!el) { el = document.createElement(tag); el.setAttribute(chiave, valore); document.head.appendChild(el) }
    el.setAttribute(attr, val)
  }
  metti('link', 'rel', 'manifest', 'href', `${base}${manifest}`)
  metti('link', 'rel', 'apple-touch-icon', 'href', `${base}${icona}`)
  metti('meta', 'name', 'apple-mobile-web-app-capable', 'content', 'yes')
  metti('meta', 'name', 'apple-mobile-web-app-title', 'content', titolo)
}

/** Rende l'app admin installabile (manifest + meta iOS), solo su questa pagina. */
export function preparaInstallazione() {
  impostaManifest('admin.webmanifest', 'admin-icon-192.png', 'BeachIn Admin')
  // tocco su una notifica con l'app già aperta: ricarico per avere le prenotazioni aggiornate
  if ('serviceWorker' in navigator && !(window as unknown as { __bxAggiorna?: boolean }).__bxAggiorna) {
    (window as unknown as { __bxAggiorna?: boolean }).__bxAggiorna = true
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.tipo === 'aggiorna') window.location.reload() })
  }
  // registra subito il service worker (serve anche per l'installazione su Android)
  if ('serviceWorker' in navigator) void registrazione().catch(() => undefined)
}
