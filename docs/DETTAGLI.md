# BeachIn — dettagli tecnici per modulo

Riferimento completo spostato da `CLAUDE.md` (che resta snello). Leggere solo la sezione che serve.
Aggiornare qui quando cambia un modulo.

## Shell (menu laterale)
- `Sidebar` a scomparsa anche su desktop: hamburger nella `Topbar` sempre visibile (apre/chiude), su desktop la colonna
  scorre fuori (`lg:-ml-64`) e la scelta è ricordata in localStorage `beachin.menu.v1`; su telefono resta pannello sopra i contenuti.
- `Logo` = icona del manifest dell'app (`src/assets/logo-app.png`, copia di `public/admin-icon-192.png`) + "BeachIn" e sotto `config.nome`.

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
- **ComandApp** (rotta pubblica `/comandapp`, `src/pages/ComandApp.tsx`, fuori dallo shell): app del bagnante, login con
  credenziali demo `UTENTI_COMANDAPP` (`src/lib/comandapp.ts`, es. ombrellone12/lido → ombrellone 12), ordina dal bar,
  vede solo lo stato dei propri ordini. Stati: `in_attesa → presa_in_carico → in_preparazione → pronta` (`SUCCESSIVO` nel context).
  Sync tra schede dello stesso browser: `comande` in localStorage `beachin.comande.v1` + evento `storage` (niente backend:
  tra dispositivi diversi serve un server). Suoni Web Audio in `src/lib/suoni.ts` (`campanello`/`ding`, sblocco al primo gesto);
  la pagina Comande ha link+QR ComandApp, "Attiva suoni" e suona il campanello a ogni comanda nuova.
- **Supabase** (solo comande + menu/sezioni): `src/lib/supabase.ts` (env `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`,
  vedi `.env.example`; Pages li legge da GitHub Actions *Variables*), schema **`beachin`** (progetto Supabase condiviso tra demo; client con `db.schema`, Realtime su `SCHEMA`; va aggiunto agli *Exposed schemas* della Data API) in `supabase/schema.sql` (tabelle `comande`,
  `menu_sezioni`, `menu_piatti`, RLS aperta ad anon = solo demo, Realtime). Hook generico `src/hooks/useSyncSupabase.ts`:
  lettura iniziale (semina i seed se tabella vuota), upsert/delete delle differenze a ogni cambio di stato, ricarica su
  evento Realtime. Progetto: **Demo IPA** (`exchjppslwhbnbzuhfqs`, eu-west-1, condiviso tra demo), schema già creato via connettore MCP Supabase (migration `beachin_schema`). Senza env → tutto come prima (localStorage per le comande). Con Supabase il `reset()` non tocca menu/comande.

- **App admin** (rotta pubblica `/adminapp`, `src/pages/AdminApp.tsx`, mobile): login demo `admin/lido` (`src/lib/adminapp.ts`),
  tab **Prenotazioni** (richieste tavolo dal sito da confermare/rifiutare, campanello all'arrivo) e **Menu a voce**
  (`<AssistenteVocale />`). `richiesteRistorante` sincronizzate su Supabase (`beachin.richieste_ristorante`); un effect nel
  context crea la `PrenotazioneRistorante` `PR-<id>` per ogni richiesta confermata (anche da altro dispositivo).
  Link "App admin" in Ristorante → Prenotazioni.
- **Notifiche push app admin** (anche a schermo bloccato): PWA installabile (`public/admin.webmanifest`, icone
  `public/admin-icon-*.png`, manifest/meta iniettati da `preparaInstallazione()` solo su /adminapp), service worker
  `public/sw-admin.js`, logica in `src/lib/notifichePush.ts` (VAPID pubblica nel codice; privata nel **Vault** Supabase
  `beachin_vapid_private`, mai nel repo). Iscrizioni in `beachin.push_iscrizioni` (non leggibile da anon, scrittura via RPC
  `beachin.registra_push`). Trigger `notifica_nuova_richiesta` su `richieste_ristorante` → `pg_net` → Edge Function
  `beachin-push` (`supabase/functions/beachin-push`, legge DB via `SUPABASE_DB_URL`, rimuove iscrizioni 404/410).
  Tocco notifica con app aperta → SW `postMessage({tipo:"aggiorna"})` → reload; `useSyncSupabase` rilegge anche su visibilitychange/online/pageshow e alla (ri)sottoscrizione del canale (app sospesa su telefono = canale live caduto).
  iPhone: solo con app aggiunta alla Home (iOS ≥16.4). Rotte lazy con `lazyRiprova` (`src/lib/lazyRiprova.ts`): se un chunk manca dopo un deploy ricarica la pagina una volta. `main.tsx` converte `#/percorso` in path con BrowserRouter.

## Assistente vocale (menu a voce)
- iPhone con app aggiunta alla Home (e browser senza Web Speech): **Whisper su Groq** (piano free). `src/lib/trascrizione.ts`
  (`useRegistrazione`: MediaRecorder, tap per iniziare/inviare, max 12 s) → Edge Function `beachin-trascrivi`
  (`supabase/functions/beachin-trascrivi`, modello `whisper-large-v3-turbo`, lingua it, prompt = nomi dei piatti) con segreto
  `GROQ_API_KEY` (Supabase → Edge Functions → Secrets, messo dall'utente). Senza chiave risponde 503. Altrove resta Web Speech.
- **Più comandi in una frase**: `dividiComandi()` (`comandiMenu.ts`) taglia davanti a un verbo di comando preceduto da e/poi/virgola
  ("togli X e aggiungi Y a 14 €"); `gestisci` → `esegui` per ogni parte. Layout mobile: griglia `grid-cols-1 [&>*]:min-w-0`.
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

## Ristorante a sottosezioni (tab `?tab=`)
- `Ristorante.tsx`: KPI + Tabs **Prenotazioni | Menu | Magazzino** (default Prenotazioni; il vecchio `?tab=tavoli` porta lì; componenti in `src/pages/ristorante/`).
- **Menu** (`PannelloMenu`): traduzioni 5 lingue (it/en/fr/de/es, `src/lib/menuLingue.ts`: seed curato, poi MyMemory
  + glossario), correzione manuale (`impostaTraduzione`), QR (`src/components/QrCodice.tsx`, lib `qrcode`, `stampaQr`),
  **Assistente vocale incorporato** (tolto dalla sidebar; `/assistente-vocale` → redirect a `/ristorante?tab=menu`).
  `aggiungiPiatto/rinominaPiatto` ritraducono da soli (`traduzioni: {}` = in corso). Lista unica "Menu" = `EditorMenu` divisa per **sezioni dinamiche** (`sezioniMenu` nel context, `CategoriaPiatto = string` = id sezione; `aggiungiSezione/rinominaSezione/rimuoviSezione/spostaSezione`, nomi tradotti con `nomeSezioneIn`); piatti modificabili al click (nome, prezzo, traduzione, sezione, **foto** `Piatto.foto` via `modificaPiatto`), aggiunta piatto per sezione; la foto appare nel menu pubblico; assistente in riquadro piccolo (`<AssistenteVocale compatto />`, senza la sua lista menu) sotto il QR.
- **Menu pubblico**: rotta `/menu?tavolo=N&lang=xx` (`MenuPubblico.tsx`, fuori dallo shell), `urlMenu()` per i QR.
- **Disposizione tavoli per giorno**: `tavoli` = disposizione **standard** (modello); `tavoliGiorno[data]` = copia personalizzata
  (stessi id) creata alla prima modifica del giorno. `tavoliDelGiorno(data)`; le azioni tavolo accettano `giorno?` (senza = standard).
  `ripristinaDisposizione(data)` (bottone "Disposizione standard", deassegna le prenotazioni su tavoli spariti) e `salvaComeStandard(data)`.
  Nella pianta: selettore "Questo giorno | Standard" (lo standard si configura lì), badge Personalizzata/Standard.
- **Tavoli** (`Planimetria`, dentro Prenotazioni sotto il giorno scelto: occupazione per giorno+turno, `key={giorno}`): pianta del Lido (`src/lib/zoneTavoli.ts`: Veranda + Interno a sx, Ciringuito a dx; zone `veranda|interno|ciringuito`), drag&drop (`Tavolo.x/y` in %, `spostaTavolo` → `zonaDaPos`), selettore pranzo/cena, pannello tavolo: modifica numero/posti/zona (`modificaTavolo`), ospiti, "Assegna" prenotazioni confermate senza tavolo,
  QR per tavolo e stampa di tutti. **Prenotazioni**: calendario settimanale (`CalendarioPrenotazioni.tsx`, lun–dom, pranzo/cena,
  chip per prenotazione + richieste dal sito da confermare tratteggiate) → click giorno = dettaglio sotto (richieste, planimetria tavoli di quel giorno, lista prenotazioni con gestione tavoli, conferma/rifiuta
  richieste, nuova prenotazione con la data scelta). **Magazzino**: `magazzino` + `movimentaArticolo/aggiungiArticolo/rimuoviArticolo`.

## Ristorante → Prenotazioni: vista "servizio" (ott 2026)
- Si apre su **oggi** e sul **turno in corso** (pranzo prima delle 16, poi cena); frecce ‹ › per cambiare giorno, `?giorno=AAAA-MM-GG`
  apre un giorno preciso (usato dalla campanella). Tre numeri grandi: coperti (arrivati/attesi), tavoli liberi, da confermare.
- Lista del turno con bottone **Arrivati** (stato `arrivata` di `StatoPrenotazione`; vincolo DB aggiornato, migration
  `beachin_prenotazione_arrivata`) e select tavolo. Calendario settimanale dietro "Settimana", pianta tavoli dietro "Pianta tavoli",
  giorni chiusi dietro l'icona calendario. Tolti i KPI incasso/scontrino/food cost.
- (ott 2026) Campanella tolta. Le richieste dal sito da confermare, di **qualunque data**, stanno in un riquadro in cima a
  Prenotazioni (tocco sulla data = vai a quel giorno/turno) e hanno un **badge rosso** su Ristorante/Prenotazioni nel menu
  laterale e sulla scheda Prenotazioni (`BadgeConta` in `Sidebar.tsx`, `Tabs` accetta `badge`).
- Schede: **Prenotazioni | Tavoli | Menu | Magazzino | Gestione giorni** (`?tab=`). Prenotazioni e Tavoli condividono lo
  stesso giorno (stato del componente + barra giorno comune). Gestione giorni = `<GiorniChiusi />`.

## Menu laterale a sottomenu (ott 2026)
- `VoceNav.figli?: SottoVoce[]` in `src/config/navigazione.tsx` (percorsi con `?tab=`; `badge: 'richieste'`). Ordine:
  Panoramica · **Bar** (Listino, Conti, Comande) · **Ristorante** (Prenotazioni, Tavoli, Menu, Magazzino, Gestione giorni) · resto.
- `Sidebar`: voce con figli = pulsante che apre/chiude (aperto di default se ci sei dentro), righe alte per iPad.
  `AppShell` ricava titolo/sottotitolo anche dai figli (es. `/comande`).
- Il menu mostra **solo i moduli attivi** (niente voci col lucchetto; si attivano da Impostazioni → Moduli e piano).
- La `Sidebar` suona il `campanello()` a ogni richiesta tavolo nuova dal sito (non al primo caricamento; audio sbloccato al primo tocco).
- `Bar.tsx`: solo schede Listino (giacenze) e Conti (per ombrellone); tolte vendite/KPI. Modulo `bar` aggiunto al piano `ristorante_web`.

## Disponibilità tavoli + giorni chiusi
- `src/lib/disponibilita.ts`: `disponibilitaTurno(tavoli, pren, data, turno, coperti?)` (tavoli/posti liberi, prenotazioni senza
  tavolo, `pieno`, `tavoloAdatto`) e `statoGiorno(...)` → `chiuso|pieno|parziale|libero`.
- **Giorni chiusi**: context `giorniChiusi` + `chiudiGiorni(dal, al, nota?)` / `riapriGiorno(data)`, sincronizzati su Supabase
  `beachin.giorni_chiusi` (id = data; migration `beachin_giorni_chiusi`). Componente condiviso `src/components/GiorniChiusi.tsx`
  (Ristorante → Prenotazioni → "Giorni chiusi", bottone "Segna giorno chiuso" sul giorno; app admin → sezione "Giorni chiusi").
- **App admin**: sotto ogni richiesta `Disponibilita` (chiuso / pieno / tavolo adatto / serve unire tavoli + tavoli e posti liberi).
- **Sito** (`FormRistorante`): calendario del mese `src/components/sito/CalendarioDisponibilita.tsx`, giorni pieni o chiusi rossi e
  non selezionabili, un turno pieno = giallo (turno disabilitato nel select).
- **Sala su Supabase** (migration `beachin_sala_ristorante`): `beachin.tavoli` (standard, `ordine`), `beachin.tavoli_giorno`
  (id = data, `tavoli` jsonb; nel context lo stato è la lista `disposizioni`, `tavoliGiorno` è derivato),
  `beachin.prenotazioni_ristorante`. Seed già caricati nel DB. Con Supabase il `reset()` non tocca la sala e l'effect
  "richiesta confermata → PR-<id>" è spento (la crea `confermaRistorante`; le vecchie sono state riportate nel DB via SQL).

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
  (non citazioni). Menu ristorante = REALE (Menù del proprietario da restaurantguru: 25 piatti con prezzi, `seed/ristorante.ts`; food cost/allergeni stimati, bevande dimostrative). Restano dimostrativi: listino, eventi, recensioni del gestionale, numeri arenile.
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
