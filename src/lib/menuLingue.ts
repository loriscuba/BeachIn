/**
 * Menu multilingua: 5 lingue (it + en/fr/de/es).
 * - Piatti del seed: traduzioni curate a mano (`traduzioniSeed`).
 * - Piatti nuovi o rinominati (a mano o a voce): `traduciNome()` prova il servizio gratuito
 *   MyMemory (dal browser del gestore) e, se non risponde, un glossario parola per parola.
 *   Domani: stessa firma, dietro un LLM/servizio a pagamento lato server.
 */
import { urlPubblico } from '@/lib/urlPubblico'
import type { CategoriaPiatto, LinguaMenu } from '@/data/types'

export const LINGUE: { id: LinguaMenu; nome: string; bandiera: string }[] = [
  { id: 'it', nome: 'Italiano', bandiera: '🇮🇹' },
  { id: 'en', nome: 'English', bandiera: '🇬🇧' },
  { id: 'fr', nome: 'Français', bandiera: '🇫🇷' },
  { id: 'de', nome: 'Deutsch', bandiera: '🇩🇪' },
  { id: 'es', nome: 'Español', bandiera: '🇪🇸' },
]
export const LINGUE_ESTERE = LINGUE.filter((l) => l.id !== 'it').map((l) => l.id) as Exclude<LinguaMenu, 'it'>[]

type Testi = Record<LinguaMenu, string>
const T = (it: string, en: string, fr: string, de: string, es: string): Testi => ({ it, en, fr, de, es })

const categorieLingue: Record<CategoriaPiatto, Testi> = {
  antipasti: T('Antipasti', 'Starters', 'Entrées', 'Vorspeisen', 'Entrantes'),
  primi: T('Primi', 'First courses', 'Premiers plats', 'Erste Gänge', 'Primeros'),
  secondi: T('Secondi', 'Main courses', 'Plats principaux', 'Hauptgerichte', 'Segundos'),
  contorni: T('Contorni', 'Side dishes', 'Accompagnements', 'Beilagen', 'Guarniciones'),
  pizze: T('Pizze', 'Pizzas', 'Pizzas', 'Pizzen', 'Pizzas'),
  dolci: T('Dolci', 'Desserts', 'Desserts', 'Desserts', 'Postres'),
  bevande: T('Bevande', 'Drinks', 'Boissons', 'Getränke', 'Bebidas'),
  grigliata: T('Grigliata di carne del lido', 'Lido meat grill', 'Grillades de viande du Lido', 'Fleischgrill vom Lido', 'Parrillada de carne del Lido'),
}
export function traduzioniSezioneSeed(id: string): TraduzioniPiatto | undefined {
  const t = categorieLingue[id]
  return t && { en: t.en, fr: t.fr, de: t.de, es: t.es }
}

export const uiLingue = {
  menu: T('Il nostro menu', 'Our menu', 'Notre menu', 'Unsere Speisekarte', 'Nuestro menú'),
  tavolo: T('Tavolo', 'Table', 'Table', 'Tisch', 'Mesa'),
  allergeni: T('Allergeni: chiedi al personale', 'Allergens: please ask our staff', 'Allergènes : demandez au personnel', 'Allergene: bitte fragen Sie unser Personal', 'Alérgenos: pregunte al personal'),
  aggiornato: T('Menu aggiornato in tempo reale', 'Menu updated in real time', 'Menu mis à jour en temps réel', 'Speisekarte in Echtzeit aktualisiert', 'Menú actualizado en tiempo real'),
  prezzi: T('Prezzi in euro', 'Prices in euro', 'Prix en euros', 'Preise in Euro', 'Precios en euros'),
}

/** Traduzioni curate dei piatti iniziali: nome italiano → [en, fr, de, es]. */
const SEED: Record<string, [string, string, string, string]> = {
  'Antipasto di mare': ['Seafood starter', 'Entrée de la mer', 'Meeresfrüchte-Vorspeise', 'Entrante de mar'],
  'Cozze alla marinara': ['Mussels marinara', 'Moules marinières', 'Miesmuscheln Marinara', 'Mejillones a la marinera'],
  'Insalata di polpo': ['Octopus salad', 'Salade de poulpe', 'Oktopussalat', 'Ensalada de pulpo'],
  'Tartare di pescato del giorno con fragole e crema balsamica': ['Catch of the day tartare with strawberries and balsamic cream', 'Tartare de la pêche du jour aux fraises et crème balsamique', 'Tatar vom Tagesfang mit Erdbeeren und Balsamico-Creme', 'Tartar de pesca del día con fresas y crema balsámica'],
  'Bruschette miste': ['Mixed bruschetta', 'Bruschettas variées', 'Gemischte Bruschetta', 'Bruschettas variadas'],
  'Spaghetti alle vongole': ['Spaghetti with clams', 'Spaghetti aux palourdes', 'Spaghetti mit Venusmuscheln', 'Espaguetis con almejas'],
  'Risotto alla pescatora': ['Seafood risotto', 'Risotto aux fruits de mer', 'Meeresfrüchte-Risotto', 'Risotto de marisco'],
  'Fusilli con scampi, ricotta fresca e olive taggiasche': ['Fusilli with langoustines, fresh ricotta and Taggiasca olives', 'Fusilli aux langoustines, ricotta fraîche et olives taggiasche', 'Fusilli mit Kaisergranat, frischem Ricotta und Taggiasca-Oliven', 'Fusilli con cigalas, ricotta fresca y aceitunas taggiasche'],
  'Trofie al pesto': ['Trofie with pesto', 'Trofie au pesto', 'Trofie mit Pesto', 'Trofie al pesto'],
  'Gnocchi pomodoro e basilico': ['Gnocchi with tomato and basil', 'Gnocchis tomate et basilic', 'Gnocchi mit Tomate und Basilikum', 'Ñoquis con tomate y albahaca'],
  'Spaghetti con gamberoni, asparagi di mare e lime': ['Spaghetti with king prawns, samphire and lime', 'Spaghetti aux gambas, salicorne et citron vert', 'Spaghetti mit Riesengarnelen, Queller und Limette', 'Espaguetis con langostinos, salicornia y lima'],
  'Fritto misto di mare': ['Mixed fried seafood', 'Friture de la mer', 'Frittierte Meeresfrüchte', 'Fritura mixta de mar'],
  'Grigliata di pesce': ['Grilled fish platter', 'Grillade de poissons', 'Gegrillte Fischplatte', 'Parrillada de pescado'],
  'Branzino al forno': ['Baked sea bass', 'Bar au four', 'Wolfsbarsch aus dem Ofen', 'Lubina al horno'],
  'Tagliata di manzo': ['Sliced beef steak', 'Tagliata de bœuf', 'Rindfleisch-Tagliata', 'Tagliata de ternera'],
  'Calamari fritti': ['Fried squid', 'Calamars frits', 'Frittierte Calamari', 'Calamares fritos'],
  'Pollo alla griglia': ['Grilled chicken', 'Poulet grillé', 'Gegrilltes Hähnchen', 'Pollo a la parrilla'],
  'Insalata mista': ['Mixed salad', 'Salade composée', 'Gemischter Salat', 'Ensalada mixta'],
  'Patatine fritte': ['French fries', 'Frites', 'Pommes frites', 'Patatas fritas'],
  'Verdure grigliate': ['Grilled vegetables', 'Légumes grillés', 'Gegrilltes Gemüse', 'Verduras a la parrilla'],
  'Pizza Margherita': ['Margherita pizza', 'Pizza Margherita', 'Pizza Margherita', 'Pizza Margarita'],
  'Pizza Marinara': ['Marinara pizza', 'Pizza Marinara', 'Pizza Marinara', 'Pizza Marinara'],
  'Pizza Diavola': ['Spicy salami pizza', 'Pizza Diavola (salami piquant)', 'Pizza Diavola (scharfe Salami)', 'Pizza Diavola (salami picante)'],
  'Pizza Frutti di mare': ['Seafood pizza', 'Pizza aux fruits de mer', 'Pizza mit Meeresfrüchten', 'Pizza de marisco'],
  'Pizza Capricciosa': ['Capricciosa pizza', 'Pizza Capricciosa', 'Pizza Capricciosa', 'Pizza Capricciosa'],
  'Tiramisù': ['Tiramisu', 'Tiramisu', 'Tiramisu', 'Tiramisú'],
  'Panna cotta': ['Panna cotta', 'Panna cotta', 'Panna cotta', 'Panna cotta'],
  'Macedonia': ['Fruit salad', 'Salade de fruits', 'Obstsalat', 'Macedonia de frutas'],
  'Semifreddo al pistacchio': ['Pistachio semifreddo', 'Semifreddo à la pistache', 'Pistazien-Halbgefrorenes', 'Semifrío de pistacho'],
  'Acqua minerale 1L': ['Mineral water 1L', 'Eau minérale 1L', 'Mineralwasser 1L', 'Agua mineral 1L'],
  'Vino della casa (calice)': ['House wine (glass)', 'Vin de la maison (verre)', 'Hauswein (Glas)', 'Vino de la casa (copa)'],
  'Vino della casa (bottiglia)': ['House wine (bottle)', 'Vin de la maison (bouteille)', 'Hauswein (Flasche)', 'Vino de la casa (botella)'],
  'Flan di zucchine, fiore croccante e crema al grana': ['Courgette flan with crispy flower and Grana cream', 'Flan de courgettes, fleur croustillante et crème de Grana', 'Zucchini-Flan mit knuspriger Blüte und Grana-Creme', 'Flan de calabacín, flor crujiente y crema de Grana'],
  'Tartare di fassona con stracciatella affumicata e pesto': ['Fassona beef tartare with smoked stracciatella and pesto', 'Tartare de bœuf Fassona, stracciatella fumée et pesto', 'Fassona-Rindertatar mit geräucherter Stracciatella und Pesto', 'Tartar de ternera Fassona con stracciatella ahumada y pesto'],
  'Guazzetto di mare': ['Seafood stew', 'Ragoût de fruits de mer', 'Meeresfrüchte-Eintopf', 'Guiso de mariscos'],
  'Frittino del contadino': ["Farmer's mixed fry", 'Petite friture paysanne', 'Bauern-Frittiertes', 'Fritura del campesino'],
  'Tartare di tonno al naturale': ['Plain tuna tartare', 'Tartare de thon nature', 'Thunfischtatar natur', 'Tartar de atún al natural'],
  'Duetto di acciughe e verdurine': ['Anchovy and vegetable duo', "Duo d'anchois et petits légumes", 'Sardellen-Duett mit Gemüse', 'Dúo de anchoas y verduritas'],
  'Penne con porri e salsiccia': ['Penne with leeks and sausage', 'Penne aux poireaux et saucisse', 'Penne mit Lauch und Wurst', 'Penne con puerros y salchicha'],
  'Gnocchi di patate con crema di gorgonzola e gherigli di noci': ['Potato gnocchi with gorgonzola cream and walnuts', 'Gnocchis de pommes de terre, crème de gorgonzola et noix', 'Kartoffelgnocchi mit Gorgonzolacreme und Walnüssen', 'Ñoquis de patata con crema de gorgonzola y nueces'],
  'Spaghetto Lido': ['Spaghetto Lido (house seafood spaghetti)', 'Spaghetto Lido (spaghetti maison aux fruits de mer)', 'Spaghetto Lido (Spaghetti des Hauses mit Meeresfrüchten)', 'Spaghetto Lido (espaguetis de la casa con marisco)'],
  'Tagliatelle al ragù di fassona piemontese': ['Tagliatelle with Piedmontese Fassona beef ragù', 'Tagliatelles au ragù de bœuf Fassona piémontais', 'Tagliatelle mit Ragù vom piemontesischen Fassona-Rind', 'Tagliatelle con ragú de ternera Fassona piamontesa'],
  'Cappellacci bianchi e neri al profumo di mare': ['Black and white cappellacci with a hint of the sea', 'Cappellacci noirs et blancs au parfum de la mer', 'Schwarz-weiße Cappellacci mit Meeresaroma', 'Cappellacci blancos y negros con aroma de mar'],
  'Tagliatelle al nero di seppia, tartare di gambero e stracciatella affumicata': ['Squid ink tagliatelle, prawn tartare and smoked stracciatella', "Tagliatelles à l'encre de seiche, tartare de crevettes et stracciatella fumée", 'Sepia-Tagliatelle, Garnelentatar und geräucherte Stracciatella', 'Tagliatelle negras de sepia, tartar de gamba y stracciatella ahumada'],
  'Orata alla griglia': ['Grilled sea bream', 'Dorade grillée', 'Gegrillte Dorade', 'Dorada a la parrilla'],
  'Fritto royale': ['Royal fried seafood platter', 'Friture royale de la mer', 'Königliche Meeresfrüchte-Fritto', 'Fritura real de mariscos'],
  'Trancio di spada alla griglia con aromi di Provenza': ['Grilled swordfish steak with herbes de Provence', "Pavé d'espadon grillé aux herbes de Provence", 'Gegrilltes Schwertfischsteak mit Kräutern der Provence', 'Rodaja de pez espada a la parrilla con hierbas provenzales'],
  'Filetto di fassona con burro aromatizzato alle erbe liguri': ['Fassona beef fillet with Ligurian herb butter', 'Filet de bœuf Fassona au beurre aux herbes de Ligurie', 'Fassona-Rinderfilet mit ligurischer Kräuterbutter', 'Solomillo de ternera Fassona con mantequilla de hierbas de Liguria'],
  "Tagliata di fassona spadellata con burro aromatizzato e salsa di soia (all'etto)": ['Pan-seared sliced Fassona beef with flavoured butter and soy sauce (per 100 g)', 'Tagliata de bœuf Fassona poêlée, beurre aromatisé et sauce soja (les 100 g)', 'Gebratene Fassona-Tagliata mit Würzbutter und Sojasauce (pro 100 g)', 'Tagliata de ternera Fassona salteada con mantequilla aromatizada y salsa de soja (por 100 g)'],
  'Costine di maiale, coppa di vitello, pollo e arrosticini': ['Pork ribs, veal coppa, chicken and lamb skewers', "Travers de porc, coppa de veau, poulet et brochettes d'agneau", 'Schweinerippchen, Kalbscoppa, Hähnchen und Lammspieße', 'Costillas de cerdo, coppa de ternera, pollo y brochetas de cordero'],
  "Colomba pasquale con crema al latte all'arancia": ['Easter colomba cake with orange milk cream', 'Colomba de Pâques, crème au lait à l’orange', 'Oster-Colomba mit Orangen-Milchcreme', 'Colomba de Pascua con crema de leche a la naranja'],
  'Pavlova con frutti di bosco freschi': ['Pavlova with fresh berries', 'Pavlova aux fruits rouges frais', 'Pavlova mit frischen Waldbeeren', 'Pavlova con frutos del bosque frescos'],
  'Bunetto al cioccolato e amaretto di Saronno': ['Chocolate bunet with Amaretto di Saronno', 'Bunet au chocolat et amaretto di Saronno', 'Schokoladen-Bunet mit Amaretto di Saronno', 'Bunet de chocolate con amaretto di Saronno'],
  'Pastiera napoletana al cioccolato': ['Chocolate Neapolitan pastiera', 'Pastiera napolitaine au chocolat', 'Neapolitanische Pastiera mit Schokolade', 'Pastiera napolitana de chocolate'],
  'Panna cotta ai frutti di bosco con meringa alla mandorla': ['Berry panna cotta with almond meringue', "Panna cotta aux fruits rouges et meringue à l'amande", 'Panna cotta mit Waldbeeren und Mandelbaiser', 'Panna cotta de frutos del bosque con merengue de almendra'],
  'Crostatina con panna cotta ai mirtilli': ['Small tart with blueberry panna cotta', 'Tartelette à la panna cotta aux myrtilles', 'Törtchen mit Heidelbeer-Panna-cotta', 'Tartaleta con panna cotta de arándanos'],
  'Gelato al fior di latte con Chartreuse francese': ['Fior di latte ice cream with French Chartreuse', 'Glace fior di latte à la Chartreuse', 'Fior-di-latte-Eis mit französischem Chartreuse', 'Helado de fior di latte con Chartreuse francés'],
  'Birra artigianale': ['Craft beer', 'Bière artisanale', 'Craft-Bier', 'Cerveza artesanal'],
  'Caffè': ['Espresso', 'Café expresso', 'Espresso', 'Café expreso'],
  'Limoncello': ['Limoncello', 'Limoncello', 'Limoncello', 'Limoncello'],
}

export type TraduzioniPiatto = Partial<Record<LinguaMenu, string>>

/** Nome della sezione nella lingua richiesta (fallback: italiano). */
export const nomeSezioneIn = (s: { nome: string; traduzioni?: TraduzioniPiatto }, l: LinguaMenu) => (l === 'it' ? s.nome : s.traduzioni?.[l] || s.nome)

export function traduzioniSeed(nome: string): TraduzioniPiatto | undefined {
  const t = SEED[nome]
  return t && { en: t[0], fr: t[1], de: t[2], es: t[3] }
}

/** Glossario minimo per la traduzione di riserva (parola per parola). */
const GLOSSARIO: Record<string, [string, string, string, string]> = {
  pesce: ['fish', 'poisson', 'Fisch', 'pescado'], gamberi: ['prawns', 'crevettes', 'Garnelen', 'gambas'],
  gamberoni: ['king prawns', 'gambas', 'Riesengarnelen', 'langostinos'], polpo: ['octopus', 'poulpe', 'Oktopus', 'pulpo'],
  calamari: ['squid', 'calamars', 'Calamari', 'calamares'], cozze: ['mussels', 'moules', 'Miesmuscheln', 'mejillones'],
  vongole: ['clams', 'palourdes', 'Venusmuscheln', 'almejas'], tonno: ['tuna', 'thon', 'Thunfisch', 'atún'],
  salmone: ['salmon', 'saumon', 'Lachs', 'salmón'], acciughe: ['anchovies', 'anchois', 'Sardellen', 'anchoas'],
  pomodoro: ['tomato', 'tomate', 'Tomate', 'tomate'], basilico: ['basil', 'basilic', 'Basilikum', 'albahaca'],
  limone: ['lemon', 'citron', 'Zitrone', 'limón'], patate: ['potatoes', 'pommes de terre', 'Kartoffeln', 'patatas'],
  insalata: ['salad', 'salade', 'Salat', 'ensalada'], verdure: ['vegetables', 'légumes', 'Gemüse', 'verduras'],
  fritto: ['fried', 'frit', 'frittiert', 'frito'], fritti: ['fried', 'frits', 'frittiert', 'fritos'],
  grigliata: ['grilled', 'grillé', 'gegrillt', 'a la parrilla'], griglia: ['grill', 'grill', 'Grill', 'parrilla'],
  forno: ['oven', 'four', 'Ofen', 'horno'], manzo: ['beef', 'bœuf', 'Rind', 'ternera'], pollo: ['chicken', 'poulet', 'Hähnchen', 'pollo'],
  torta: ['cake', 'gâteau', 'Kuchen', 'tarta'], gelato: ['ice cream', 'glace', 'Eis', 'helado'], frutta: ['fruit', 'fruits', 'Obst', 'fruta'],
  vino: ['wine', 'vin', 'Wein', 'vino'], birra: ['beer', 'bière', 'Bier', 'cerveza'], acqua: ['water', 'eau', 'Wasser', 'agua'],
  con: ['with', 'avec', 'mit', 'con'], e: ['and', 'et', 'und', 'y'], al: ['with', 'au', 'mit', 'al'], alla: ['with', 'à la', 'nach Art', 'a la'],
  branzino: ['sea bass', 'bar', 'Wolfsbarsch', 'lubina'], orata: ['sea bream', 'daurade', 'Dorade', 'dorada'],
  spigola: ['sea bass', 'bar', 'Wolfsbarsch', 'lubina'], scampi: ['langoustines', 'langoustines', 'Kaisergranat', 'cigalas'],
  seppie: ['cuttlefish', 'seiches', 'Tintenfisch', 'sepia'], crudo: ['raw', 'cru', 'roh', 'crudo'], sale: ['salt', 'sel', 'Salz', 'sal'],
  pesto: ['pesto', 'pesto', 'Pesto', 'pesto'], funghi: ['mushrooms', 'champignons', 'Pilze', 'setas'], zucchine: ['courgettes', 'courgettes', 'Zucchini', 'calabacines'],
  melanzane: ['aubergines', 'aubergines', 'Auberginen', 'berenjenas'], formaggio: ['cheese', 'fromage', 'Käse', 'queso'],
  cioccolato: ['chocolate', 'chocolat', 'Schokolade', 'chocolate'], crema: ['cream', 'crème', 'Creme', 'crema'],
  di: ['of', 'de', 'von', 'de'], mare: ['sea', 'mer', 'Meer', 'mar'], fresco: ['fresh', 'frais', 'frisch', 'fresco'], fresca: ['fresh', 'fraîche', 'frisch', 'fresca'],
}

function traduciGlossario(nome: string, lingua: Exclude<LinguaMenu, 'it'>): string {
  const i = { en: 0, fr: 1, de: 2, es: 3 }[lingua]
  return nome.split(/(\s+|,)/).map((w) => GLOSSARIO[w.toLowerCase()]?.[i] ?? w).join('')
}

async function traduciOnline(testo: string, lingua: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(testo)}&langpair=it|${lingua}`, { signal: ctrl.signal })
    clearTimeout(t)
    const j = await r.json()
    const out: string | undefined = j?.responseData?.translatedText
    return out && j.responseStatus === 200 && !/MYMEMORY WARNING/i.test(out) ? out : null
  } catch {
    return null
  }
}

/** Traduce il nome di un piatto in tutte le lingue estere. */
export async function traduciNome(nome: string): Promise<TraduzioniPiatto> {
  const seed = traduzioniSeed(nome)
  if (seed) return seed
  const voci = await Promise.all(LINGUE_ESTERE.map(async (l) => [l, (await traduciOnline(nome, l)) ?? traduciGlossario(nome, l)] as const))
  return Object.fromEntries(voci)
}

/** Nome del piatto nella lingua scelta (italiano se manca la traduzione). */
export const nomeIn = (p: { nome: string; traduzioni?: TraduzioniPiatto }, l: LinguaMenu) => (l === 'it' ? p.nome : p.traduzioni?.[l] || p.nome)

/** URL del menu pubblico (per il QR), compatibile con HashRouter e BrowserRouter. */
export function urlMenu(tavolo?: number): string {
  return urlPubblico(`menu${tavolo ? `?tavolo=${tavolo}` : ''}`)
}
