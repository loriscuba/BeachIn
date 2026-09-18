# BeachIn

Cruscotto gestionale per uno stabilimento balneare — **demo commerciale**.
Nessun database, nessun backend, nessuna autenticazione: tutti i dati sono
statici e mockati in TypeScript, ma strutturati come se arrivassero da un'API
(così in una fase successiva potranno essere sostituiti da Supabase senza
toccare le pagine).

> ⚠️ **Dati dimostrativi.** Le modifiche fatte durante la demo (assegna
> ombrellone, incassa, aggiungi costo, conferma prenotazione, pubblica pagina)
> restano **in memoria** e si vedono subito. Al refresh — o con **Impostazioni →
> Ripristina dati demo** — tutto torna allo stato iniziale.

## Avvio

```bash
npm install
npm run dev
```

L'app parte su http://localhost:5173. Serve solo Node 18+. Nessun'altra
configurazione.

Altri comandi:

- `npm run build` — type-check e build di produzione (con code-splitting)
- `npm run preview` — anteprima della build
- `npm run lint` — solo type-check

## Stack

React 18 · Vite · TypeScript · Tailwind CSS · react-router-dom · Recharts ·
lucide-react · date-fns (locale `it`). Interfaccia e dati **in italiano**,
valuta EUR, formato `it-IT`, date `gg/mm/aaaa`. Componenti costruiti a mano
(nessun UI kit). Sistema di design in [`DESIGN.md`](./DESIGN.md).

## Dove cambiare i dati prima della demo

- **`src/data/config.ts`** — parametri dello stabilimento in un solo file: nome,
  località, stagione, file e postazioni dell'arenile, orari, aliquote, numeri di
  scala (incassi e costi obiettivo). **Parti da qui.**
- **`src/data/seed/*.ts`** — i dati statici per dominio (`spiaggia`, `clienti`,
  `tariffe`, `bar`, `ristorante`, `costi`, `personale`, `eventi`, `sito`) più il
  motore comune: `giornaliero.ts` è la **serie giornaliera** da cui derivano
  incassi e occupazione, e `_calendario.ts`/`_rng.ts` la generano in modo
  deterministico (seed fisso: stessi dati a ogni caricamento).
- Le pagine non importano mai i seed: passano tutte da **`src/data/api.ts`**
  (funzioni async con ritardo simulato). Le mutazioni della demo vivono in
  **`src/context/DemoDataContext.tsx`**.

**Un vincolo su tutti: i numeri tornano tra le pagine.** C'è un'unica fonte di
verità (la serie giornaliera), quindi l'incasso del Cruscotto coincide con il
Conto economico, l'occupazione dell'Arenile con quella mostrata sul Sito, e le
vendite di Bar/Ristorante con i totali di stagione.

## Struttura

```
src/
  data/        types.ts · api.ts · config.ts · seed/
  context/     DemoDataContext.tsx        (mutazioni in memoria)
  components/  ui/ · layout/ · charts/ · arenile/
  pages/       Cruscotto, Arenile, Clienti, Tariffe, Bar, Ristorante,
               Costi, ContoEconomico, Personale, Eventi, Sito,
               SitoAnteprima, Impostazioni
  lib/         formatters.ts · calcoli.ts · arenile.ts · etichette.ts
```

## Percorso di demo consigliato (10 passi)

Da seguire davanti al cliente. Apri l'app e vai in ordine.

1. **Cruscotto.** Apri sulla home: incasso di oggi diviso per area, occupazione
   con confronto sull'anno scorso, coperti, e il **meteo dei prossimi giorni**
   accanto all'occupazione. «Questa è la giornata in un colpo d'occhio.»
2. **Andamento e alert.** Scorri: grafico incassi degli ultimi 30 giorni,
   occupazione per fila, e gli **alert operativi** (postazioni fuori servizio,
   scorte bar, saldi aperti, prenotazioni dal sito da confermare).
3. **Arenile.** Il pezzo forte: la **pianta vista dall'alto** dello
   stabilimento. Mostra file, passerelle, cabine, torrette. «Ogni ombrellone è
   cliccabile.»
4. **Assegna un ombrellone.** Clicca una postazione **libera** → *Assegna* →
   scegli un cliente e conferma. Fai notare che **il contatore in alto cambia
   subito** (e che il Cruscotto è coerente).
5. **Scheda postazione.** Clicca un ombrellone **occupato**: cliente, periodo,
   tariffa, **conto bar aperto**. Premi *Incassa* per chiudere il conto.
6. **Tariffe + simulatore.** Vai in Tariffe: la matrice per fila e periodo è
   **editabile**. Usa il **simulatore** («2 persone, fila C, 3–17 agosto →
   totale»). Premi *Pubblica listino*.
7. **Costi.** Mostra l'elenco: filtra per categoria/centro. Fai vedere che
   **copre davvero tutte le voci** (concessione demaniale, personale, utenze,
   manutenzioni, assicurazioni…). Aggiungi un costo col form.
8. **Conto economico.** Ricavi e costi per centro, **margine**, break-even e
   indicatori. Passa alla **vista mensile**: maggio in perdita (apertura),
   recupero in estate. «I conti tornano con tutto il resto.»
9. **Sito.** In *Presenza online → Sito internet*: **conferma una prenotazione**
   arrivata dal sito. Nota che disponibilità e listino sono **sincronizzati** col
   gestionale.
10. **Anteprima sito.** Premi **"Anteprima sito"**: si apre la **vetrina
    pubblica** con la disponibilità in tempo reale e il listino veri. «Lo stesso
    dato, dal gestionale al sito del cliente.»

> Suggerimento: prima di ricominciare, **Impostazioni → Ripristina dati demo**.

### Scorciatoia: demo guidata

In alternativa al percorso manuale, il pulsante **"Avvia demo"** (in alto, nella
topbar) simula una **giornata tipo in ~90 secondi**: lo stabilimento parte dal
mattino e si riempie da solo — arrivano clienti e si occupano gli ombrelloni,
entrano ordini al bar, arrivano prenotazioni dal sito, e i **KPI del Cruscotto
salgono in tempo reale** (occupazione e incasso simulato). Un riquadro in basso
a destra mostra il progresso e il flusso delle attività. È **fermabile** e
**riavviabile** da capo.

## Stato di avanzamento

- [x] **Fase 1** — Setup, design system, `DESIGN.md`, AppShell e navigazione
- [x] **Fase 2** — Tipi, seed completi, `api.ts` e context; serie giornaliera
      deterministica come fonte di verità, totali riconciliati
- [x] **Fase 3** — Arenile con pianta interattiva e pannello postazione
- [x] **Fase 4** — Cruscotto con KPI, grafici, meteo, scadenze e alert
- [x] **Fase 5** — Tariffe, Clienti, Bar, Ristorante
- [x] **Fase 6** — Costi e Conto economico
- [x] **Fase 7** — Personale ed Eventi
- [x] **Fase 8** — Sito internet e vetrina pubblica
- [x] **Fase 9** — Rifinitura: stati di caricamento/vuoti, responsive,
      code-splitting, ripristino demo, coerenza dei numeri
