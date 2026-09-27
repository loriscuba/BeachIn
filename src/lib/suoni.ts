/** Suoni dell'app con Web Audio (nessun file): il browser li permette solo dopo un gesto dell'utente. */
let ctx: AudioContext | undefined

export function sbloccaAudio() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* audio non disponibile */ }
}

function tono(freq: number, inizio: number, durata: number, volume = 0.35) {
  if (!ctx) return
  const t = ctx.currentTime + inizio
  const osc = ctx.createOscillator(), gain = ctx.createGain()
  osc.type = 'sine'; osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durata)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t); osc.stop(t + durata + 0.05)
}

/** "Din-don" da campanello del bancone. */
export function campanello() {
  sbloccaAudio()
  tono(1320, 0, 0.9); tono(2640, 0, 0.5, 0.12)
  tono(990, 0.28, 1.1); tono(1980, 0.28, 0.6, 0.1)
}

/** Breve conferma (lato cliente). */
export function ding() {
  sbloccaAudio()
  tono(1568, 0, 0.35, 0.25)
}
