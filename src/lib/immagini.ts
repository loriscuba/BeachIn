/**
 * Utility per il caricamento immagini (foto eventi, galleria del sito).
 * Le immagini vengono ridimensionate e tenute come data URI (in demo vivono in
 * memoria). Robusto: se il ridimensionamento fallisce ma l'immagine è valida,
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

/**
 * Importa più immagini da un input file, chiamando `aggiungi` per ognuna
 * caricata con successo. Restituisce i NOMI dei file non caricabili (per
 * avvisare l'utente). I file non-immagine vengono saltati e segnalati.
 */
export async function importaImmagini(
  files: FileList | null,
  aggiungi: (dataUri: string, file: File) => void
): Promise<string[]> {
  const falliti: string[] = []
  if (!files) return falliti
  for (const file of Array.from(files)) {
    const sembraImmagine = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name)
    if (!sembraImmagine) { falliti.push(file.name); continue }
    try {
      aggiungi(await ridimensionaImmagine(file), file)
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
