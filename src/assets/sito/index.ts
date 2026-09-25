/**
 * Foto del sito pubblico (ottimizzate, max ~1400px). Le prime sono foto reali
 * dello stabilimento; ristorante/famiglia/pineta/mare-pini/tramonto sono
 * immagini concept del mockup, da sostituire con scatti reali quando arrivano.
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

export const fotoSito = {
  logoColori, ombrelloniCielo, spiaggiaDrone, bagnino, beachVolley, torneo, barDistillati,
  ristorante, famiglia, pineta, marePini, tramonto,
}

/**
 * Video di sfondo dell'hero (opzionale): basta mettere `hero.mp4` (o `.webm`)
 * in questa cartella. Se manca, l'hero usa la foto dal drone.
 */
const video = import.meta.glob('./hero.{mp4,webm}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const videoHero: string | undefined = Object.values(video)[0]
