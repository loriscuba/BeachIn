/**
 * Foto del sito pubblico (ottimizzate, max ~1400px). Reali, dall'Instagram del lido: hero drone, ombrelloni,
 * pattino di salvataggio (bagnino), tramonto, ristorante, spritz (bar), beach volley, torneo, staff (famiglia),
 * drone onde (pineta), golfo (mare-pini). Cabine/docce/area relax: Wikimedia Commons CC BY-SA (crediti nel footer
 * del sito), da sostituire con scatti reali.
 */
import logoColori from './logo-colori.jpg'
import ombrelloniCielo from './ombrelloni-cielo.jpg'
import spiaggiaDrone from './spiaggia-drone.jpg'
import bagnino from './bagnino.jpg'
import beachVolley from './beach-volley.jpg'
import torneo from './torneo.jpg'
import barDistillati from './bar-distillati.jpg'
import ristorante from './ristorante.jpg'
import famiglia from './famiglia.jpg'
import pineta from './pineta.jpg'
import marePini from './mare-pini.jpg'
import tramonto from './tramonto.jpg'
import spiaggiaAlto from './spiaggia-alto.jpg'
import logoLido from './logo-lido.png'
import cabine from './cabine.jpg'
import docce from './docce.jpg'
import areaRelax from './area-relax.jpg'

export const fotoSito = {
  logoColori, ombrelloniCielo, spiaggiaDrone, bagnino, beachVolley, torneo, barDistillati,
  ristorante, famiglia, pineta, marePini, tramonto, spiaggiaAlto, cabine, docce, areaRelax,
}

/** Logo Lido dei Pini (tratto scuro su trasparente, ricavato dalla grafica ufficiale). */
export { logoLido }

/**
 * Video di sfondo dell'hero (opzionale): basta mettere `hero.mp4` (o `.webm`)
 * in questa cartella. Se manca, l'hero usa la foto dal drone.
 */
const video = import.meta.glob('./hero.{mp4,webm}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const videoHero: string | undefined = Object.values(video)[0]
