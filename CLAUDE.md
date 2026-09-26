# BeachIn — nota di progetto per Claude

App demo di gestione commerciale per uno **stabilimento balneare** italiano.
Tutto in italiano. Dati finti ma strutturati come una vera API, numeri
riconciliati tra le pagine. BeachIn è l'**aggregatore di moduli**.

## Come riprendere il lavoro (per Claude)
- Branch principale: **`main`** (il deploy GitHub Pages parte a ogni push/merge su main). Ultimo lavoro: PR #3
  (restyling sito + dati Lido dei Pini). Prima: PR #2 — app completa consolidata + Assistente vocale. (Storico: `claude/prompt-fase-1-5hlkom`, PR #1.)
- Anteprima web (Artifact): https://claude.ai/artifact/PqRRUL2ws33iz2m9qn99nV — ripubblicare sullo stesso URL.
- Deploy pubblico (microfono reale), due canali automatici sul push:
  - **GitHub Pages** — https://loriscuba.github.io/BeachIn/ (workflow `.github/workflows/pages.yml`,
    build Vite con `VITE_BASE=/BeachIn/` + HashRouter; Pages attivo su Source: GitHub Actions).
  - **Vercel** — anteprima per branch (BrowserRouter, `vercel.json` con rewrite SPA verso `/index.html`).
- **Appunti del progetto**: `APPUNTI.md` (in radice). Quando l'utente chiede di "appuntare"/"segnare" qualcosa,
  aggiungerlo lì nella sezione giusta (checklist `[ ]`, spuntare `[x]` quando fatto). Leggerlo a inizio sessione.
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

## Grafica sito pubblico (SitoAnteprima) — restyling "wow"
- Foto in `src/assets/sito/` (JPEG ottimizzati, export `fotoSito` da `index.ts`): reali dello stabilimento
  (drone, ombrelloni, bagnino, beach volley, torneo, bar) + concept del mockup Lovable (ristorante, famiglia,
  pineta, mare-pini, tramonto) da sostituire con scatti reali. Sorgente: Drive, cartella "BeachIN".
- Le foto alimentano anche i seed: galleria (`seed/sito.ts`, campo `immagine`) ed eventi (`foto`/`galleria`).
- Layout: hero a tutto schermo (Ken Burns + parallasse + onde SVG animate), nastro scorrevole, "Lo stabilimento"
  con contatori animati, servizi a bento con foto, ristorante stile menu (legge `menu` dal context), fascia tramonto
  con recensioni a rotazione, prenota con anello di occupazione, listino a heatmap, eventi a card verticali,
  galleria a mosaico con lightbox, contatti. Font display **Fraunces** (`font-display`), classi animazione in
  `styles/index.css` (`.reveal/.visibile`, `kenburns`, `onda`, `scorri`, `dissolvi`, rispettano reduced-motion).
- `vite.config.ts`: con `VITE_INLINE=1` anche le immagini sono inlinate (`assetsInlineLimit`).
- Foto reali dal cliente (chat): **hero** = `spiaggia-alto.jpg` (vista dall'alto), **ristorante** = `ristorante.jpg`
  (sala sotto il canniccio, sostituisce il concept). **Logo** = `logo-lido.png` (tratto estratto dalla grafica
  ufficiale, trasparente; sul sito reso bianco con `brightness-0 invert`) al posto del logo BeachIn in navbar e footer.
- **Ombrelloni ↔ modulo `arenile`**: se spento (default del piano ristorante_web) il sito pubblico nasconde ogni
  riferimento agli ombrelloni: voci nav Prenota/Listino, CTA hero (diventa "Prenota un tavolo" + "Scopri gli eventi"),
  disponibilità, nastro, testo e numeri, tessera servizi (→ "La spiaggia"), sezioni prenota+listino, bottone flottante.
  Verificato in Chromium (0 occorrenze di "ombrell" nel testo e negli alt). Il canale Sito→Ombrelloni resta il
  "sospendi prenotazioni" (mostra l'avviso) quando il modulo è attivo.
- Video hero opzionale: `src/assets/sito/hero.mp4|webm` (via `import.meta.glob`, export `videoHero`); se manca → foto.

## Cliente reale: Lido dei Pini (Savona)
- `config.ts` ha i dati reali da fonti pubbliche (Tripadvisor/spiagge.it/TheFork): Via Nizza 85/R Savona,
  tel +39 349 574 5156 (online compare anche +39 340 159 9851), ristorante 12:00–14:30 / 19:00–22:00 tutto l'anno,
  spiaggia maggio–settembre, Tripadvisor 4,4 su 234 recensioni (#34/303), prezzo medio ~32 €, Facebook.
  `email`/`sito`/`partitaIva` vuoti = da comunicare (il sito li nasconde). Chiusura spiaggia 19:30 da confermare.
- Servizi reali: ombrellone/lettini, cabine, bar, ristorante, animazione bimbi, area relax, docce calde/fredde,
  beach volley, ping pong (niente noleggi/parcheggio). Recensioni sul sito = temi riassunti + badge Tripadvisor
  (non citazioni). Restano dimostrativi: listino, menu (prezzi), eventi, recensioni del gestionale, numeri arenile.
- Tripadvisor e gli altri siti sono bloccati dalla rete dell'ambiente: dati presi via WebSearch.

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
