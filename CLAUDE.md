# BeachIn — nota di progetto per Claude

App demo di gestione commerciale per uno **stabilimento balneare** italiano.
Tutto in italiano. Dati finti ma strutturati come una vera API, numeri
riconciliati tra le pagine. BeachIn è l'**aggregatore di moduli**.

## Come riprendere il lavoro (per Claude)
- Branch di sviluppo: **`claude/prompt-fase-1-5hlkom`** (PR #1, draft su `loriscuba/BeachIn`).
- Anteprima web (Artifact, unico link stabile): https://claude.ai/code/artifact/c58937ca-89cf-46df-b35e-ff763e14a146
- Prima di modifiche: `git fetch origin claude/prompt-fase-1-5hlkom && git checkout claude/prompt-fase-1-5hlkom`.
- Per risparmiare token: build/typecheck di norma bastano; screenshot solo se richiesti; evita di rileggere l'artifact pubblicato (è enorme).

## Stack
React 18 + Vite + TypeScript + Tailwind + react-router-dom (HashRouter per
l'anteprima statica via `VITE_ROUTER=hash`) + Recharts + lucide-react +
date-fns (locale it). `noUnusedLocals` ON: rimuovi import/variabili inutilizzati o il build fallisce.

## Architettura dati
- `src/context/DemoDataContext.tsx`: unico store mutabile in memoria. Le azioni
  stabili (useCallback) leggono lo stato fresco tramite ref sincronizzate in
  useEffect (`prenRef`/`richRef`/`evtRef`), non dentro gli updater di setState
  (StrictMode-safe). `nuovoId(p)` per gli id.
- `src/data/api.ts`: getter async (150–300ms simulati) per i dati read-only.
- `src/data/types.ts`: tipi. `src/data/seed/*`: dati iniziali.
- Palette: NAVY `#0F3B4C`, CABINA `#2E7D9A`, ACQUA `#7FB7A8`, TENDA `#F2C14E`,
  BOA `#E4572E`, CALCE `#EDF1F2` (usare le classi `profondo/cabina/acqua/tenda/boa/calce`).

## Moduli / pagine (`src/pages`)
Cruscotto, Arenile, Clienti, Tariffe, Bar, Ristorante, Costi, ContoEconomico,
Personale, **Eventi**, **Sito** (gestionale) + **SitoAnteprima** (sito pubblico), Impostazioni.

## Stato funzionalità Sito + Eventi (ultimo lavoro)
- Sito gestionale: panoramica, **prenotazioni** (Ombrelloni/Ristorante/Eventi con
  Conferma/Rifiuta), **posta** admin, contenuti, recensioni/messaggi.
- Sito pubblico: navbar, hero, servizi, listino, ristorante, prenota ombrellone,
  **eventi (card con foto → modal con descrizione e form "Prenota")**, galleria,
  recensioni, contatti, "La mia posta" (cliente).
- Flusso prenotazione (ombrellone/ristorante/evento): richiesta dal sito →
  ricevuta in posta cliente + notifica posta admin → conferma/rifiuto in
  gestionale → email al cliente. Pattern mail: `pushMail(casella, tipo, da, a, oggetto, corpo)`.
- **Eventi**: CRUD completo; foto caricabile (`src/lib/immagini.ts`, ridimensiona a data URI);
  campo prezzo; nella scheda evento **riepilogo "Partecipanti confermati"** con
  **inserimento manuale in loco** (`aggiungiPartecipanteEvento`/`rimuoviPartecipanteEvento`;
  `RichiestaEvento.origine: 'sito' | 'manuale'`).

## Anteprima single-file (Artifact)
1. `VITE_ROUTER=hash npm run build`
2. Inline di CSS+JS in un solo `preview.html` con `<meta charset="utf-8">`
   (senza charset → mojibake "Â·"/"â€¦"). Usare replacement in forma di
   funzione (`.replace(re, () => js)`) perché il bundle contiene `$` che
   altrimenti viene interpretato come pattern di sostituzione.
   Config: `vite.config.ts` forza `inlineDynamicImports` quando `VITE_ROUTER=hash`.
3. Pubblicare sullo stesso URL dell'Artifact (non crearne uno nuovo).

## Verifica visiva (Chromium)
playwright-core via `createRequire('/home/user/BeachIn/package.json')`;
binario `/opt/pw-browsers/chromium-1194/chrome-linux/chrome --no-sandbox`.
`NODE_PATH=$(npm root)` per i moduli CJS.

## Idee non ancora fatte (offerte)
- Risposte admin al cliente dalla casella di posta.
- Modifica di una prenotazione prima della conferma.
