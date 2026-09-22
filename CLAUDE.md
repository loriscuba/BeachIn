# BeachIn — nota di progetto per Claude

App demo di gestione commerciale per uno **stabilimento balneare** italiano.
Tutto in italiano. Dati finti ma strutturati come una vera API, numeri
riconciliati tra le pagine. BeachIn è l'**aggregatore di moduli**.

## Come riprendere il lavoro (per Claude)
- Branch di sviluppo attuale: **`claude/web-app-voice-restaurant-menu-yk9jm4`** (PR #2, draft su `loriscuba/BeachIn`) —
  app completa consolidata + Assistente vocale. (Storico: `claude/prompt-fase-1-5hlkom`, PR #1.)
- Anteprima web (Artifact): https://claude.ai/artifact/PqRRUL2ws33iz2m9qn99nV — ripubblicare sullo stesso URL.
- Deploy pubblico (microfono reale), due canali automatici sul push:
  - **GitHub Pages** — https://loriscuba.github.io/BeachIn/ (workflow `.github/workflows/pages.yml`,
    build Vite con `VITE_BASE=/BeachIn/` + HashRouter; Pages attivo su Source: GitHub Actions).
  - **Vercel** — anteprima per branch (BrowserRouter, `vercel.json` con rewrite SPA verso `/index.html`).
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
Cruscotto, Arenile, Clienti, **Comande**, Tariffe, Bar, Ristorante, **AssistenteVocale**, Costi, ContoEconomico,
Personale, **Eventi**, **Sito** (gestionale) + **SitoAnteprima** (sito pubblico), Impostazioni.

## Comande dall'ombrellone (servizio in spiaggia)
- Pagina `Comande` (rotta `/comande`, modulo `comande`, gruppo Operatività): a sinistra si compone
  l'ordine (numero ombrellone + articoli bar da `getArticoliBar`), a destra la coda al bar con stato.
- Context: `comande` + `inviaComanda(ombrellone, righe, note?)` / `avanzaComanda(id)` (in_attesa→in_preparazione→consegnata)
  / `annullaComanda(id)`. Incluso nel `reset()`. Tipi: `Comanda/RigaComanda/StatoComanda` in `types.ts`.
- Nel piano `ristorante_web` di default.

## Assistente vocale (menu a voce)
- Pagina `AssistenteVocale` (rotta `/assistente-vocale`, gruppo Gestione): parla/scrivi per
  modificare il MENU del ristorante (aggiungi/togli/prezzo/rinomina/leggi/svuota).
- Voce: `src/hooks/useVoce.ts` (Web Speech API, `it-IT`). Parser a regole: `src/lib/comandiMenu.ts`
  → `parseComandoMenu()` restituisce `ComandoMenu` (sostituibile con un LLM senza toccare la pagina).
- Il menu è mutabile nel context: `menu` + `aggiungiPiatto/rimuoviPiatto/modificaPrezzoPiatto/rinominaPiatto`
  (seed `menu` da `seed/ristorante.ts`). Incluso nel `reset()`. La pagina **Ristorante legge lo stesso `menu`
  dal context** (non più `getMenu()`): menu unico, le modifiche vocali si riflettono lì.

## Prenotazioni ristorante + tavoli (gestione dal vivo)
- **Tavoli** e **prenotazioni ristorante** sono ora mutabili nel context (seed `tavoli`/`prenotazioniRistorante`
  da `seed/ristorante.ts`, inclusi nel `reset()`). La pagina Ristorante li legge dal context, non più da
  `getTavoli()/getPrenotazioniRistorante()`.
- Azioni context: `aggiungiTavolo(numero, posti, zona)` / `rimuoviTavolo(id)` (deassegna il tavolo dalle
  prenotazioni); `creaPrenotazioneRistorante(dati)` (presa a **telefono/in loco**, `origine:'manuale'`,
  con telefono/note/tavolo); `assegnaTavolo(prenId, tavoloId?)`; `impostaStatoPrenotazione(id, stato)`;
  `rimuoviPrenotazioneRistorante(id)`. `PrenotazioneRistorante` ha ora `telefono?` e `origine?:'manuale'|'sito'`.
- Pagina **Ristorante**: form "Nuova prenotazione (telefono)", assegnazione tavolo per prenotazione (Select con
  i tavoli **liberi per quel turno** + quello già assegnato, evita doppie assegnazioni), annulla/elimina;
  **Mappa tavoli** con tavoli occupati oggi evidenziati, "+ Aggiungi tavolo" (numero = nome numerico, posti, zona)
  ed eliminazione tavolo.
- **Dal sito**: `confermaRistorante(id)` ora, oltre a segnare la richiesta confermata e mandare la mail,
  crea una `PrenotazioneRistorante` (`origine:'sito'`, id `PR-<idRichiesta>` idempotente) così la prenotazione
  online entra tra quelle del ristorante e le si può assegnare un tavolo.

## Moduli commerciali (vendita a moduli)
- BeachIn si vende a moduli: sorgente unica `src/config/moduli.ts` (`ModuloId`, `MODULI` con testi di
  upsell, `PIANI` bundle, `MODULI_CORE`). Stato "attivi" nel `src/context/ModuliContext.tsx`
  (in memoria + localStorage `beachin.moduli.v1`; domani = campo per-cliente dal DB).
- Core sempre attivi: `panoramica` (home ridotta, rotta `/`) e `impostazioni`.
- Gating: ogni voce nav ha `modulo`; `src/components/ModuloGate.tsx` protegge le rotte → se il modulo
  non è attivo mostra `src/pages/ModuloBloccato.tsx` (pagina di upsell, deep-link non fa 404). La Sidebar
  mostra i moduli bloccati col lucchetto. Il Cruscotto completo è ora rotta `/cruscotto` (modulo `cruscotto`).
- Piano di default: `ristorante_web` (Panoramica, Ristorante, Assistente vocale, Comande, Eventi, Sito, Impostazioni).
- Attivazione dal vivo (demo/vendita) da **Impostazioni → Moduli e piano** (`applicaPiano`, `toggle`).

## Stato funzionalità Sito + Eventi (ultimo lavoro)
- Sito gestionale: panoramica, **prenotazioni** (Ombrelloni/Ristorante/Eventi con
  Conferma/Rifiuta), **posta** admin, contenuti, recensioni/messaggi.
- **Galleria foto**: caricamento multiplo dal gestionale (Sito → Galleria, `ridimensionaImmagine`);
  la galleria è mutabile nel context (`galleria` + `aggiungiFoto/rimuoviFoto/rinominaFoto`, seed da
  `statoSito.galleria`, campo `FotoGalleria.immagine` data URI). **Didascalia** modificabile per foto
  (`rinominaFoto`), mostrata sul sito pubblico (`SitoAnteprima`).
- **Data "oggi"**: `config.stagione.oggi` è la data REALE del dispositivo, limitata alla stagione
  (`oggiInStagione()` in `config.ts`), così i numeri (serie giornaliera/KPI) restano validi.
- **Eventi sul sito pubblico**: `SitoAnteprima` mostra sia i prossimi eventi sia quelli **conclusi**
  (badge "Concluso" + link "Rivedi le foto"); per un evento passato il modal nasconde il form di
  prenotazione e mostra l'album. (Prima filtrava solo `data >= oggi`, quindi i conclusi sparivano.)
- **Album foto evento**: `Evento.galleria?: string[]` (data URI); mutazioni context
  `aggiungiFotoEvento/rimuoviFotoEvento`; upload multiplo nella scheda evento (Drawer di `Eventi`, usa
  l'evento "live" da `eventi`); il sito pubblico mostra l'album nella scheda evento (es. foto di un torneo).
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
1. `VITE_INLINE=1 VITE_ROUTER=hash npm run build` (VITE_INLINE=1 forza un bundle unico;
   senza, la build fa code-splitting — Pages e Vercel non lo usano)
2. Inline di CSS+JS in un solo `preview.html` con `<meta charset="utf-8">`
   (senza charset → mojibake "Â·"/"â€¦"). Usare replacement in forma di
   funzione (`.replace(re, () => js)`) perché il bundle contiene `$` che
   altrimenti viene interpretato come pattern di sostituzione.
   Config: `vite.config.ts` forza `inlineDynamicImports` quando `VITE_INLINE=1`.
3. Pubblicare sullo stesso URL dell'Artifact (non crearne uno nuovo).

## Verifica visiva (Chromium)
playwright-core via `createRequire('/home/user/BeachIn/package.json')`;
binario `/opt/pw-browsers/chromium-1194/chrome-linux/chrome --no-sandbox`.
`NODE_PATH=$(npm root)` per i moduli CJS.

## Idee non ancora fatte (offerte)
- Risposte admin al cliente dalla casella di posta.
- Modifica di una prenotazione prima della conferma.
