import { supabase } from './supabase'

/**
 * Utility per il caricamento immagini (foto eventi, galleria del sito).
 * Le immagini vengono ridimensionate e, con Supabase configurato, caricate nello
 * Storage (bucket `beachin`): nei dati resta solo l'URL. Senza Supabase restano data URI. Robusto: se il ridimensionamento fallisce ma l'immagine è valida,
 * si usa l'originale; se il browser non sa decodificare il file (es. HEIC
 * dell'iPhone) la Promise viene rifiutata, così il chiamante può avvisare.
 */
export function ridimensionaImmagine(file: File, maxLato = 1280, qualita = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Lettura file fallita'))
    reader.onload = () => {
      const originale = reader.result as string
      const img = new Image()
      // Il browser non sa decodificare il file (formato non supportato, es. HEIC).
      img.onerror = () => reject(new Error('formato-non-supportato'))
      img.onload = () => {
        try {
          const scala = Math.min(1, maxLato / Math.max(img.width, img.height))
          const w = Math.max(1, Math.round(img.width * scala))
          const h = Math.max(1, Math.round(img.height * scala))
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(originale)
          ctx.drawImage(img, 0, 0, w, h)
          const ridotta = canvas.toDataURL('image/jpeg', qualita)
          // Alcuni browser (Safari/iOS con canvas molto grandi) restituiscono
          // un data URL vuoto: in quel caso teniamo l'immagine originale.
          resolve(ridotta && ridotta.length > 100 ? ridotta : originale)
        } catch {
          resolve(originale)
        }
      }
      img.src = originale
    }
    reader.readAsDataURL(file)
  })
}

const BUCKET = 'beachin'

/**
 * Carica una foto (data URI) nello Storage e restituisce l'URL pubblico.
 * Senza Supabase, o se il caricamento fallisce, restituisce il data URI così l'app continua a funzionare.
 */
export async function salvaFoto(dataUri: string, cartella: string): Promise<string> {
  if (!supabase || !dataUri.startsWith('data:')) return dataUri
  try {
    const blob = await (await fetch(dataUri)).blob()
    const est = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
    const percorso = `${cartella}/${crypto.randomUUID()}.${est}`
    const archivio = supabase.storage.from(BUCKET)
    const { error } = await archivio.upload(percorso, blob, { contentType: blob.type, cacheControl: '31536000' })
    if (error) throw error
    return archivio.getPublicUrl(percorso).data.publicUrl
  } catch (e) {
    console.error('[supabase] foto:', e)
    return dataUri
  }
}

/** Vero se il file sembra un HEIC/HEIF (foto iPhone). */
function isHeic(file: File): boolean {
  return /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

/**
 * Converte un HEIC/HEIF in JPEG nel browser (libheif via `heic2any`), caricata
 * on-demand solo quando serve — così non appesantisce chi carica già JPG/PNG.
 */
async function heicAJpeg(file: File): Promise<Blob> {
  const { default: heic2any } = await import('heic2any')
  const risultato = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
  return Array.isArray(risultato) ? risultato[0] : risultato
}

/**
 * Da un file scelto dall'utente a immagine pronta per l'app: converte l'HEIC in
 * JPEG se necessario, ridimensiona e salva nello Storage (`cartella`). Lancia se il file non è utilizzabile.
 */
export async function fileAImmagine(file: File, cartella: string, maxLato?: number, qualita?: number): Promise<string> {
  const sorgente: Blob = isHeic(file) ? await heicAJpeg(file) : file
  return salvaFoto(await ridimensionaImmagine(sorgente as File, maxLato, qualita), cartella)
}

/**
 * Importa più immagini da un input file, chiamando `aggiungi` per ognuna
 * caricata con successo (HEIC convertiti automaticamente). Restituisce i NOMI
 * dei file non caricabili, per avvisare l'utente.
 */
export async function importaImmagini(
  files: FileList | null,
  aggiungi: (url: string, file: File) => void,
  cartella: string
): Promise<string[]> {
  const falliti: string[] = []
  if (!files) return falliti
  for (const file of Array.from(files)) {
    const sembraImmagine = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name)
    if (!sembraImmagine) { falliti.push(file.name); continue }
    try {
      aggiungi(await fileAImmagine(file, cartella), file)
    } catch {
      falliti.push(file.name)
    }
  }
  return falliti
}

/** Messaggio da mostrare quando alcuni file non si caricano. */
export function messaggioFileFalliti(falliti: string[]): string {
  return (
    `Non sono riuscito a caricare ${falliti.length === 1 ? 'questo file' : 'questi file'}: ` +
    `${falliti.join(', ')}.\n\n` +
    `Probabile formato non supportato dal browser (es. HEIC delle foto iPhone). ` +
    `Converti le foto in JPG o PNG e riprova.`
  )
}
