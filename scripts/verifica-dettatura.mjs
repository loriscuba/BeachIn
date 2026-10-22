/**
 * Verifica della dettatura del menu (npm run test:dettatura).
 * Frasi come le scrive il riconoscimento vocale (Chrome/Safari o Whisper) → comando atteso
 * del parser a regole `src/lib/comandiMenu.ts`. Esce con codice 1 se qualcosa non torna.
 * Senza `azione` il comando atteso è «aggiungi».
 */
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { parseComandoMenu, dividiComandi } = await server.ssrLoadModule('/src/lib/comandiMenu.ts')
await server.close()

const casi = [
  ['Aggiungi spaghetti allo scoglio a 18 euro', {azione:'aggiungi',nome:'Spaghetti allo scoglio',prezzo:18}],
  ['aggiungi tiramisù categoria dolci a 6,50', {azione:'aggiungi',nome:'Tiramisù',prezzo:6.5,categoria:'dolci'}],
  ['aggiungi tiramisù a 6,50 €', {nome:'Tiramisù',prezzo:6.5}],
  ['aggiungi tiramisù a 6 euro e 50', {nome:'Tiramisù',prezzo:6.5}],
  ['aggiungi tiramisù a 6 euro e 50 centesimi', {nome:'Tiramisù',prezzo:6.5}],
  ['aggiungi tiramisù a sei euro e cinquanta', {nome:'Tiramisù',prezzo:6.5}],
  ['aggiungi il tiramisù a sei e cinquanta', {nome:'Tiramisù',prezzo:6.5}],
  ['aggiungi frittura di paranza a dodici euro', {nome:'Frittura di paranza',prezzo:12}],
  ['aggiungi frittura di paranza a 12 e mezzo', {nome:'Frittura di paranza',prezzo:12.5}],
  ['aggiungi frittura di paranza a €12', {nome:'Frittura di paranza',prezzo:12}],
  ['aggiungi frittura di paranza €12,00', {nome:'Frittura di paranza',prezzo:12}],
  ['aggiungi frittura di paranza 12 €', {nome:'Frittura di paranza',prezzo:12}],
  ['aggiungi caffè a 1 euro e 20', {nome:'Caffè',prezzo:1.2,categoria:'bevande'}],
  ['aggiungi caffè a un euro e venti', {nome:'Caffè',prezzo:1.2}],
  ['aggiungi caffè a 1,2 €', {nome:'Caffè',prezzo:1.2}],
  ['aggiungi acqua naturale a 2 euro nelle bevande', {nome:'Acqua naturale',prezzo:2,categoria:'bevande'}],
  ['aggiungi pizza 4 stagioni a 9 euro', {nome:'Pizza 4 stagioni',prezzo:9,categoria:'pizze'}],
  ['aggiungi pizza quattro formaggi a 9 euro e 50', {nome:'Pizza quattro formaggi',prezzo:9.5}],
  ['aggiungi coca cola 33 cl a 3 euro', {nome:'Coca cola 33 cl',prezzo:3}],
  ['aggiungi birra media a 5 euro', {nome:'Birra media',prezzo:5,categoria:'bevande'}],
  ['aggiungi gnocchi al pesto a 12 euro tra i primi', {nome:'Gnocchi al pesto',prezzo:12,categoria:'primi'}],
  ['aggiungi orata al forno nei secondi a 22 euro', {nome:'Orata al forno',prezzo:22,categoria:'secondi'}],
  ['aggiungi patatine fritte come contorno a 4 euro', {nome:'Patatine fritte',prezzo:4,categoria:'contorni'}],
  ['aggiungi trofie al pesto prezzo 13 euro', {nome:'Trofie al pesto',prezzo:13}],
  ['aggiungi trofie al pesto costo 13', {nome:'Trofie al pesto',prezzo:13}],
  ['aggiungi trofie al pesto', {nome:'Trofie al pesto',prezzo:null}],
  ['aggiungi spaghetti aglio olio e peperoncino a 10 euro', {nome:'Spaghetti aglio olio e peperoncino',prezzo:10}],
  ['inserisci la focaccia di Recco a 8 euro', {nome:'Focaccia di Recco',prezzo:8}],
  ['aggiungi al menu le acciughe ripiene a 11 euro', {nome:'Acciughe ripiene',prezzo:11}],
  ['aggiungi panna cotta ai frutti di bosco a 5 euro tra i dolci', {nome:'Panna cotta ai frutti di bosco',prezzo:5,categoria:'dolci'}],
  ['Aggiungi Spritz Aperol a 7 euro', {nome:'Spritz Aperol',prezzo:7}],
  ['metti nel menu il fritto misto a 16 euro', {azione:'aggiungi',nome:'Fritto misto',prezzo:16}],
  ['Cambia il prezzo della carbonara a 13 euro', {azione:'prezzo',nome:'Carbonara',prezzo:13}],
  ['cambia il prezzo della carbonara a tredici euro', {azione:'prezzo',nome:'Carbonara',prezzo:13}],
  ['cambia il prezzo della carbonara a 13 euro e 50', {azione:'prezzo',nome:'Carbonara',prezzo:13.5}],
  ['la carbonara costa 13 euro', {azione:'prezzo',nome:'Carbonara',prezzo:13}],
  ['la carbonara adesso costa 14', {azione:'prezzo',nome:'Carbonara',prezzo:14}],
  ['metti la carbonara a 13', {azione:'prezzo',nome:'Carbonara',prezzo:13}],
  ['porta il tiramisù a 7 euro', {azione:'prezzo',nome:'Tiramisù',prezzo:7}],
  ['il prezzo del branzino è 24 euro', {azione:'prezzo',nome:'Branzino',prezzo:24}],
  ['aumenta il caffè a 1,50', {azione:'prezzo',nome:'Caffè',prezzo:1.5}],
  ['modifica prezzo spaghetti alle vongole 18', {azione:'prezzo',nome:'Spaghetti alle vongole',prezzo:18}],
  ['cambia il prezzo della pizza 4 stagioni a 10 euro', {azione:'prezzo',nome:'Pizza 4 stagioni',prezzo:10}],
  ['Togli il branzino al forno', {azione:'rimuovi',nome:'Branzino al forno'}],
  ['togli dal menu il tiramisù', {azione:'rimuovi',nome:'Tiramisù'}],
  ['elimina la frittura di paranza dal menù', {azione:'rimuovi',nome:'Frittura di paranza'}],
  ['toglimi le cozze', {azione:'rimuovi',nome:'Cozze'}],
  ['Rinomina calamari fritti in calamari alla griglia', {azione:'rinomina',nome:'Calamari fritti',nuovoNome:'Calamari alla griglia'}],
  ['rinomina spaghetti in spaghetti alle vongole', {azione:'rinomina',nome:'Spaghetti',nuovoNome:'Spaghetti alle vongole'}],
  ['cambia nome della pizza in pizza margherita', {azione:'rinomina',nome:'Pizza',nuovoNome:'Pizza margherita'}],
  ['Leggi il menu', {azione:'leggi'}],
  ['leggimi il menù', {azione:'leggi'}],
  ['svuota il menu', {azione:'svuota'}],
  ['Aggiungi il risotto alla pescatora a 18 euro.', {nome:'Risotto alla pescatora',prezzo:18}],
  ['Aggiungi gelato a 3 euro.', {nome:'Gelato',prezzo:3}],
  ['Aggiungi, per favore, il gelato a 3 euro', {nome:'Gelato',prezzo:3}],
  ['ok aggiungi il gelato a tre euro', {nome:'Gelato',prezzo:3}],
  ['aggiungi insalata di mare a 15 euro in antipasti', {nome:'Insalata di mare',prezzo:15,categoria:'antipasti'}],
  ['aggiungi vino bianco della casa al calice a 5 euro', {nome:'Vino bianco della casa al calice',prezzo:5,categoria:'bevande'}],
  ['aggiungi mezzo litro di vino a 8 euro', {nome:'Mezzo litro di vino',prezzo:8}],
  ['aggiungi tagliata di manzo a ventidue euro', {nome:'Tagliata di manzo',prezzo:22}],
  ['aggiungi grigliata mista a trentacinque euro', {nome:'Grigliata mista',prezzo:35}],
  ['aggiungi aragosta a 120 euro', {nome:'Aragosta',prezzo:120}],
  ['aggiungi aragosta a centoventi euro', {nome:'Aragosta',prezzo:120}],
  ['aggiungi crudo di mare a 25 euro a persona', {nome:'Crudo di mare',prezzo:25}],
  ['aggiungi pizza 4 stagioni', {nome:'Pizza 4 stagioni',prezzo:null}],
  ['aggiungi pizza quattro formaggi', {nome:'Pizza quattro formaggi',prezzo:null}],
  ['aggiungi spaghetti aglio e olio a 9', {nome:'Spaghetti aglio e olio',prezzo:9}],
  ['cambia il prezzo della frittura di paranza a 12', {azione:'prezzo',nome:'Frittura di paranza',prezzo:12}],
  ["cambia il prezzo dell'acqua a 2,50", {azione:'prezzo',nome:'Acqua',prezzo:2.5}],
  ["togli l'orata", {azione:'rimuovi',nome:'Orata'}],
  ["togli l’orata alla griglia", {azione:'rimuovi',nome:'Orata alla griglia'}],
  ['aggiungi acqua minerale 1L a 2 euro', {nome:'Acqua minerale 1L',prezzo:2}],
  ['aggiungi tris di tartare a 18 euro', {nome:'Tris di tartare',prezzo:18}],
  ['metti il tiramisù a sette euro', {azione:'prezzo',nome:'Tiramisù',prezzo:7}],
  ['aggiungi caffè a 1 euro e 5', {nome:'Caffè',prezzo:1.05}],
  ['il vino della casa costa 5 euro e 50', {azione:'prezzo',nome:'Vino della casa',prezzo:5.5}],
  ['abbassa la birra artigianale a 5', {azione:'prezzo',nome:'Birra artigianale',prezzo:5}],
  ['aggiungi Gelato al fior di latte a 5 euro', {nome:'Gelato al fior di latte',prezzo:5}],
  ['Aggiungi spaghetti allo scoglio a €18.', {nome:'Spaghetti allo scoglio',prezzo:18}],
  ['aggiungi spritz a sette e cinquanta', {nome:'Spritz',prezzo:7.5}],
  ['aggiungi trenette al pesto a 12,50 euro', {nome:'Trenette al pesto',prezzo:12.5}],
  ['aggiungi pizza margherita 8 euro', {nome:'Pizza margherita',prezzo:8,categoria:'pizze'}],
  ['aggiungi pizza margherita otto euro', {nome:'Pizza margherita',prezzo:8}],
  ['aggiungi il tiramisù a sei euro tra i dolci', {nome:'Tiramisù',prezzo:6,categoria:'dolci'}],
  ['aggiungi i ravioli di borragine al sugo di noci a quattordici euro', {nome:'Ravioli di borragine al sugo di noci',prezzo:14}],
  ['aggiungi cappuccino a uno e cinquanta', {nome:'Cappuccino',prezzo:1.5}],
  ['aggiungi tagliere di salumi per due a 20 euro', {nome:'Tagliere di salumi per due',prezzo:20}],
  ['cambia il prezzo del caffè a un euro e trenta', {azione:'prezzo',nome:'Caffè',prezzo:1.3}],
  ['porta il prezzo del fritto royale a 22', {azione:'prezzo',nome:'Fritto royale',prezzo:22}],
  ['imposta il prezzo della pavlova a 7 euro', {azione:'prezzo',nome:'Pavlova',prezzo:7}],
  ['rinomina il fritto royale in fritto misto di mare', {azione:'rinomina',nome:'Fritto royale',nuovoNome:'Fritto misto di mare'}],
  ['aggiungi bottiglia di vermentino a 28 euro', {nome:'Bottiglia di vermentino',prezzo:28}],
]

// frasi con più comandi
const multipli = [
  ['togli la pasta allo scoglio e aggiungi il filetto a 14 €', ['rimuovi', 'aggiungi']],
  ['aggiungi vino a 5 euro e metti la birra a 6', ['aggiungi', 'prezzo']],
  ['aggiungi gelato a 3 euro e 50 e togli il caffè', ['aggiungi', 'rimuovi']],
  ['aggiungi spaghetti aglio e olio a 9 euro', ['aggiungi']],
]

let errori = 0
for (const [frase, atteso] of casi) {
  const r = parseComandoMenu(frase)
  const diff = Object.entries({ azione: 'aggiungi', ...atteso }).filter(([k, v]) => r[k] !== v)
  if (diff.length) { errori++; console.error(`  ✗ «${frase}» → ${JSON.stringify(r)}`) }
}
for (const [frase, azioni] of multipli) {
  const r = dividiComandi(frase).map((p) => parseComandoMenu(p).azione)
  if (r.join() !== azioni.join()) { errori++; console.error(`  ✗ «${frase}» → ${r.join(', ')}`) }
}
const totale = casi.length + multipli.length
console.log(`Dettatura menu: ${totale - errori}/${totale} frasi interpretate correttamente`)
process.exit(errori ? 1 : 0)
