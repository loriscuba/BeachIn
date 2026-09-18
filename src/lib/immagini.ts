/**
 * Ridimensiona un'immagine caricata dall'utente e la restituisce come data URI.
 * Serve a tenere leggere le foto degli eventi (che in demo vivono in memoria).
 */
export function ridimensionaImmagine(file: File, maxLato = 1280, qualita = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Lettura file fallita'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Immagine non valida'))
      img.onload = () => {
        const scala = Math.min(1, maxLato / Math.max(img.width, img.height))
        const w = Math.round(img.width * scala)
        const h = Math.round(img.height * scala)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas non disponibile'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', qualita))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
