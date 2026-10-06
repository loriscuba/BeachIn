/**
 * Verifica di coerenza dei dati "Sito e marketing" (npm test).
 * Carica src/data/marketing.ts tramite Vite (TypeScript + alias) e controlla
 * somme e rapporti tra i blocchi. Esce con codice 1 se qualcosa non torna.
 */
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { calcolaMarketing, PERIODI_MARKETING } = await server.ssrLoadModule('/src/data/marketing.ts')
await server.close()

let errori = 0
const ok = (cond, msg) => { if (!cond) { errori++; console.error('  ✗ ' + msg) } }
const tra = (v, min, max) => v >= min && v <= max
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0)
const pc = (v) => (v * 100).toFixed(1) + '%'

for (const { valore } of PERIODI_MARKETING) {
  const d = calcolaMarketing(valore)
  for (const [anno, m] of [['2026', d.attuale], ['2025', d.precedente]]) {
    const V = m.visite
    console.log(`${valore} ${anno}: visite ${V}, visitatori ${pc(m.visitatori / V)}, interazioni ${pc(m.interazioni / V)}, ` +
      `ricerca ${pc(m.provenienze.ricerca / V)}, maps ${pc(m.provenienze.maps / V)}, apparizioni ${(m.google.apparizioni / V).toFixed(2)}×, ` +
      `% clic ${pc(m.google.clic / m.google.apparizioni)}, posizione ${m.google.posizione}`)
    ok(V === sum(m.giorni, (g) => g.visite), 'visite = somma dei giorni')
    ok(m.visitatori === sum(m.giorni, (g) => g.visitatori), 'visitatori = somma dei giorni')
    ok(m.interazioni === sum(m.giorni, (g) => g.interazioni), 'interazioni = somma dei giorni')
    ok(sum(Object.values(m.azioni), (x) => x) === m.interazioni, 'azioni = interazioni')
    ok(sum(Object.values(m.provenienze), (x) => x) === V, 'provenienze = visite')
    ok(tra(m.visitatori / V, 0.7, 0.76), 'visitatori 70–76%')
    ok(tra(m.interazioni / V, 0.11, 0.18), 'interazioni 11–18%')
    ok(tra(m.provenienze.ricerca / V, 0.38, 0.44), 'Google ricerca ~41%')
    ok(tra(m.provenienze.maps / V, 0.15, 0.19), 'Google Maps ~17%')
    ok(m.google.clic === m.provenienze.ricerca, 'clic Search Console = visite da ricerca')
    ok(m.profilo.clicSito === m.provenienze.maps, 'clic sito dal profilo = visite da Maps')
    if (anno === '2026') {
      ok(tra(m.google.apparizioni / V, 5.5, 6.1), 'apparizioni ~5,8× visite')
      ok(tra(m.google.clic / m.google.apparizioni, 0.066, 0.075), '% clic ~7%')
    }
    ok(sum(m.ricerche, (r) => r.clic) <= m.google.clic, 'clic top 10 ≤ clic totali')
    ok(m.profilo.daMaps + m.profilo.daRicerca === m.profilo.visualizzazioni, 'profilo: Maps + Ricerca = totale')
  }
  if (valore === 'stagione') {
    const mesi = ['giugno', 'luglio', 'agosto', 'settembre'].map((p) => calcolaMarketing(p).attuale)
    for (const k of ['visite', 'visitatori', 'interazioni'])
      ok(sum(mesi, (m) => m[k]) === d.attuale[k], `stagione: ${k} = somma dei mesi`)
    ok(sum(mesi, (m) => m.google.apparizioni) === d.attuale.google.apparizioni, 'stagione: apparizioni = somma dei mesi')
    const picco = Math.max(...d.attuale.giorni.map((g) => g.visite))
    const giorno = d.attuale.giorni.find((g) => g.visite === picco).data
    console.log(`  picco ${picco} visite il ${giorno}; prenota/giorno medio agosto ${(mesi[2].azioni.prenota / 31).toFixed(1)} su ${d.postiGiornalieri} posti`)
    ok(giorno >= '2026-08-01' && giorno <= '2026-08-31', 'picco in agosto')
    ok(tra(mesi[0].visite / mesi[2].visite, 0.3, 0.5) && tra(mesi[3].visite / mesi[2].visite, 0.3, 0.5), 'giugno e settembre ~1/3 del picco')
  }
  const t = d.tripadvisor
  ok(sum(t.distribuzione, (x) => x.numero) === t.recensioni, 'Tripadvisor: distribuzione = recensioni')
  ok(Math.abs(sum(t.distribuzione, (x) => x.bolle * x.numero) / t.recensioni - t.voto) < 0.05, 'Tripadvisor: media coerente col voto')
}

if (errori) { console.error(`\n${errori} controlli falliti`); process.exit(1) }
console.log('\nTutti i controlli passati.')
