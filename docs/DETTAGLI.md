# BeachIn — dettagli tecnici per modulo

Riferimento completo spostato da `CLAUDE.md` (che resta snello). Leggere solo la sezione che serve.
Aggiornare qui quando cambia un modulo.

## Shell: app staff unica su telefono, tablet e PC (26/10/2026)
- **Un'unica app per lo staff** (gestionale + ex app Admin + ex app Sala): stessa rotta, stesso login, un solo manifest
  `public/staff.webmanifest` ("BeachIn", `id` `./?app=staff`, start_url e scope `./`, scorciatoie Prenotazioni/Cameriere/Cucina),
  impostato da `AppShell` con `impostaManifest`. `/adminapp` → `/prenotazioni`, `/salaapp` → `/sala` (Navigate): link, QR e
  icone già installate continuano a funzionare (le vecchie icone aprono fuori dal loro scope: meglio reinstallare "BeachIn").
- **Forma per dispositivo** (`AppShell` + `components/layout/BarraRapida.tsx`): telefono (< `md`) barra in basso con 4 schede del
  ruolo + **Altro** (apre il menu completo); tablet (`md`–`lg`) colonna stretta a sinistra con fino a 6 schede + **Menu**; PC
  (≥ `lg`) menu laterale completo con hamburger. Variabile CSS `--barra-basso` (altezza della barra, 0 da `md`) per fondo pagina
  e pulsanti fluttuanti (DemoPlayer, WhatsApp); la barra della comanda del cameriere (portale) sta sopra la barra delle schede.
- **Schede per ruolo**: `SCHEDE_RAPIDE` e `SCHEDE_PER_RUOLO` in `config/navigazione.tsx`, hook `hooks/useNavStaff.ts`
  (`useSchedeRapide`, `useConteggiNav` per i badge, `useConHome`). Home (Panoramica) solo per amministratore o chi vede le
  Impostazioni; gli altri ruoli aprono la loro prima scheda (cameriere → Cameriere, cucina → Cucina, barista → Bar) e non vedono Panoramica nel menu.
- **Velocità**: service worker `public/sw-admin.js` registrato da `attivaCacheApp()` (`lib/notifichePush.ts`, solo build di
  produzione, non single-file): pagina dalla rete con ripiego sulla copia dopo 3 s o offline, `/assets/` con hash dalla cache,
  icone e font dalla cache aggiornata in sottofondo; dati Supabase mai in cache. `lib/precarica.ts` scarica a riposo il codice
  delle schede del ruolo (non con "risparmio dati"). In Prenotazioni menu a voce e lettore QR sono lazy (pagina 158 → 18 KB).
- **Telefono**: `Tabella` sotto `sm` diventa una lista di schede (prima colonna titolo, le altre etichetta/valore).
- **Accesso**: `AppShell` mostra `LoginGestore` finché `SessioneContext` non ha un profilo; Esci nella Topbar
  (con nome e ruolo dell'utente). Pagine pubbliche (`/sito/anteprima`, `/menu`, `/comandapp`, `/tavolo`, `/invito`) libere. Vedi "Utenti, ruoli e permessi".
  Senza Supabase utenti demo `admin`, `cameriere`, `cucina`, `barista` (password `lido`, tasti rapidi sotto il login); la sessione
  demo è per scheda (sessionStorage, ultima usata in localStorage): tre schede dello stesso browser possono essere tre utenti.
- `Sidebar`: su PC a scomparsa (hamburger nella `Topbar`, colonna che scorre fuori `lg:-ml-64`, scelta ricordata in
  localStorage `beachin.menu.v1`); su telefono e tablet pannello sopra i contenuti aperto da Altro/Menu.
- `Logo` = icona del manifest dell'app (`src/assets/logo-app.png`, copia di `public/admin-icon-192.png`) + "BeachIn" e sotto `config.nome`.
- (ott 2026) **Nuovo look + tema chiaro/scuro**: interruttore sole/luna nella `Topbar` (hook `useTema`, localStorage
  `beachin.tema.v1`, default scuro) → `data-tema` sulla radice di `AppShell`. In `styles/index.css`: sfondo a luci sfumate
  (`.shell-bg`), menu (`.shell-side`, in chiaro vetro bianco), topbar in vetro (`.shell-bar`), card `.bi-card`; in scuro le
  classi chiare più usate dentro `main` sono rimappate (testi, bordi, sfondi, badge, Recharts). QR sempre su bianco (`.bi-qr`).
- **Palette "Riviera"** (`src/config/accenti.ts`): un accento per area (sole, agrume, corallo, mare, acqua, glicine,
  bouganville) usato solo su icone del menu (`IconaVoce`), tessera icona accanto al titolo pagina e barretta `.bi-tacca`
  dei titoli card (variabile CSS `--accento` impostata da `AppShell`). Pulsanti/schede restano nel blu del marchio.
- **Cruscotto** ridisegnato (hero incasso+meteo, KPI con anello, mappa spiaggia dal vivo, "Da fare oggi", area incassi,
  ciambella mix ricavi, scadenze a card); token propri `.cz`. Ingresso pagine animato (`.bi-pagina`), rispetta reduced-motion.

## Architettura dati
- `src/context/DemoDataContext.tsx`: unico store mutabile in memoria. Le azioni
  stabili (useCallback) leggono lo stato fresco tramite ref sincronizzate in
  useEffect (`prenRef`/`richRef`/`evtRef`), non dentro gli updater di setState
  (StrictMode-safe). `nuovoId(p)` per gli id.
- **Foto** (`src/lib/immagini.ts`, `fileAImmagine(file, cartella)` → `salvaFoto`): ridimensionate e caricate nello
  Storage Supabase, bucket pubblico `beachin` (cartelle `menu/`, `notizie/`, `eventi/`, `sito/`; migrazione 0004,
  anon può solo inserire). Nei dati resta l'URL; senza Supabase o se l'upload fallisce resta il data URI.
  Eventi e galleria del sito non sono ancora sincronizzati su DB (le foto restano su Storage, i riferimenti in memoria).
- `src/data/api.ts`: getter async (150–300ms simulati) per i dati read-only.
- `src/data/types.ts`: tipi. `src/data/seed/*`: dati iniziali.
- Palette: NAVY `#0F3B4C`, CABINA `#2E7D9A`, ACQUA `#7FB7A8`, TENDA `#F2C14E`,
  BOA `#E4572E`, CALCE `#EDF1F2` (usare le classi `profondo/cabina/acqua/tenda/boa/calce`).

## Utenti, ruoli e permessi (RBAC, ott 2026)
- **Login**: con Supabase = Supabase Auth con **nome utente** (es. `lorisc`, proposto come nome + iniziale del cognome) + password;
  l'account Auth ha un'email sintetica `<nome utente>@utenti.beachin.local` (migrazione 0012, colonna `beachin.utenti.username`),
  chi scrive un'email vera (con @) entra con quella. Prima: email+password (sessione in localStorage `beachin.auth`, separata dalle altre demo
  del progetto condiviso); senza Supabase = credenziali demo `admin/lido` (`src/lib/adminapp.ts`) → profilo amministratore.
- **DB** (migrazione `0011_utenti_ruoli.sql`): `beachin.ruoli` (`permessi` jsonb sezione→livello 0 nessuno/1 lettura/2 modifica,
  `amministratore` = tutto, `di_sistema` non eliminabile) e `beachin.utenti` (id = `auth.users.id`, nome, ruolo, `attivo`,
  `ultimo_accesso`). Funzioni `beachin.livello(sezione)`, `beachin.ha_permesso(sezione, minimo)`, `beachin.e_staff()`,
  `beachin.mio_profilo()` (security definer). Trigger `verifica_amministratore`: resta sempre un amministratore attivo.
  auth.users è condiviso con altre demo: conta solo chi ha un profilo attivo in `beachin.utenti`.
- **Policy**: per ogni tabella "staff lettura"/"staff modifica" per `authenticated` secondo la sezione (bar, comande,
  ristorante, eventi, sito, impostazioni) + "clienti lettura/invio" (catalogo e invio comande/richieste anche da collegati).
  Ruoli/utenti: niente anon; scrittura ruoli con permesso `utenti`=2, utenti solo via Edge Function.
  **Fase 1**: le policy "demo anon" restano (sito, ComandApp, menu QR). Fase 2 = chiudere anon alle sole azioni dei clienti.
- **Edge Function `beachin-utenti`**: crea (nome utente → account confermato con email sintetica + profilo), aggiorna (nome/ruolo/attivo; disattivare = blocco
  account Auth `ban_duration`), password, elimina (solo disattivati). Controlla `ha_permesso('utenti', 2)` di chi chiama.
- **App**: `src/lib/permessi.ts` (sezioni, livelli, tipi), `src/context/SessioneContext.tsx` (`profilo`, `accedi`, `esci`,
  `livello`, `puo`; profilo ricaricato al ritorno in primo piano e via Realtime sulla propria riga), `DemoDataProvider` rimontato
  a login/logout (`main.tsx`, rilegge i dati col nuovo ruolo). `Sidebar` = modulo attivo **e** permesso; `ModuloGate` →
  `AccessoNegato` (livello 0) o `SolaLettura` (livello 1: blocca clic/digitazione tranne schede `data-naviga`, select e filtri data).
  Impostazioni a schede `?tab=generali|utenti`; **Utenti e ruoli** = `src/pages/impostazioni/UtentiRuoli.tsx` (elenco utenti,
  nuovo/modifica/password/disattiva/elimina, griglia ruoli×sezioni modificabile, nuovo ruolo). `Prenotazioni` (ex AdminApp): schede secondo il
  permesso di modifica (Prenotazioni/Menu = ristorante, App = sito, Ingressi = eventi).
- **Foto profilo** (migrazione 0013, `beachin.utenti.foto`): scelta toccando il cerchio in Nuovo/Modifica utente (`SceltaFoto`,
  `fileAImmagine(file, 'utenti', 320)` → Storage `beachin/utenti/`), salvata dalla Edge Function; `Avatar` tondo (iniziali se manca)
  nell'elenco utenti e nella Topbar accanto a nome e ruolo.
- **Primo amministratore** (DB nuovo, es. produzione): creare l'utente in Auth (Studio → Authentication → Add user) e poi
  `insert into beachin.utenti (id, email, nome, ruolo_id) values ('<uuid>', '<email>', '<nome>', 'amministratore');`

## Moduli / pagine (`src/pages`)
Cruscotto, Arenile, Clienti, **Comande**, **Sala** (comande ristorante), Tariffe, Bar, Ristorante, **AssistenteVocale**, Costi, ContoEconomico,
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
  Installabile come PWA a sé: `public/comandapp.webmanifest` + `comandapp-icon-192/512.png` (logo Lido dei Pini blu su fondo
  giallo TENDA, ricolorato dalle icone admin), collegati da `impostaManifest()` in `src/lib/notifichePush.ts`.
  Banner "Aggiungi alla Home" (`src/components/PulsanteInstalla.tsx`): prompt nativo su Android/Chrome
  (`beforeinstallprompt`, registra anche `sw-admin.js`), su iPhone modal a schermo intero
  con i passi Condividi→Home + freccia (Safari non permette di aprire Condividi da codice), link "continua nel browser"
  (ricordato in sessionStorage), nei browser in-app (Instagram/Facebook…) invito ad aprire in Safari con "Copia link";
  nascosto se già installata.
- **Supabase** (solo comande + menu/sezioni): `src/lib/supabase.ts` (env `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`,
  vedi `.env.example`; Pages li legge da GitHub Actions *Variables*), schema **`beachin`** (progetto Supabase condiviso tra demo; client con `db.schema`, Realtime su `SCHEMA`; va aggiunto agli *Exposed schemas* della Data API) in `supabase/migrations/` (tabelle `comande`,
  `menu_sezioni`, `menu_piatti`, RLS aperta ad anon = solo demo, Realtime). Hook generico `src/hooks/useSyncSupabase.ts`:
  lettura iniziale (semina i seed se tabella vuota), upsert/delete delle differenze a ogni cambio di stato, ricarica su
  evento Realtime. Progetto: **Demo IPA** (`exchjppslwhbnbzuhfqs`, eu-west-1, condiviso tra demo), schema già creato via connettore MCP Supabase (migration `beachin_schema`). Senza env → tutto come prima (localStorage per le comande). Con Supabase il `reset()` non tocca menu/comande.
- **IPA Monitor**: vista `beachin.monitor_riepilogo` (migrazione 0009, solo conteggi/date, nessun grant ad anon/authenticated) letta dal collettore `ipa-collect` del cruscotto IPA Monitor (schema `ipamonitor` nello stesso progetto Demo IPA).

- **Prenotazioni operative** (`/prenotazioni` nell'app staff, `src/pages/Prenotazioni.tsx`, ex app admin `/adminapp`; `?tab=`
  prenotazioni/menu/app/ingressi; campanello globale nella `Sidebar`), tab **Prenotazioni** (richieste tavolo dal sito da confermare/rifiutare, campanello all'arrivo; **Conferma** apre
  `SceltaTavolo` a schermo intero: in orizzontale la pianta `PiantaTavoli` (estratta da `ristorante/ScegliTavolo.tsx`), in
  verticale invito a girare il telefono + elenco tavoli con consigliato; poi `confermaRistorante` + `assegnaTavolo(PR-<id>)`;
  card **Oggi al ristorante** `OggiRistorante`: coperti/posti e riempimento per turno, avvisi senza tavolo/richieste di oggi,
  lista arrivi con tavolo assegnabile e spunta "arrivato") e **Menu a voce**
  (`<AssistenteVocale />`). `richiesteRistorante` sincronizzate su Supabase (`beachin.richieste_ristorante`); un effect nel
  context crea la `PrenotazioneRistorante` `PR-<id>` per ogni richiesta confermata (anche da altro dispositivo).
  Link "Apri sul telefono" in Ristorante → Prenotazioni.
- **Notifiche push app admin** (anche a schermo bloccato): PWA installabile (`public/admin.webmanifest`, icone
  `public/admin-icon-*.png`, ora manifest unico `staff.webmanifest` dell'app staff), service worker
  `public/sw-admin.js`, logica in `src/lib/notifichePush.ts` (VAPID pubblica nel codice; privata nel **Vault** Supabase
  `beachin_vapid_private`, mai nel repo). Iscrizioni in `beachin.push_iscrizioni` (non leggibile da anon, scrittura via RPC
  `beachin.registra_push`). Trigger `notifica_nuova_richiesta` su `richieste_ristorante` → `pg_net` → Edge Function
  `beachin-push` (`supabase/functions/beachin-push`, legge DB via `SUPABASE_DB_URL`, rimuove iscrizioni 404/410).
  Tocco notifica con app aperta → SW `postMessage({tipo:"aggiorna"})` → reload; `useSyncSupabase` rilegge anche su visibilitychange/online/pageshow e alla (ri)sottoscrizione del canale (app sospesa su telefono = canale live caduto).
  iPhone: solo con app aggiunta alla Home (iOS ≥16.4). Rotte lazy con `lazyRiprova` (`src/lib/lazyRiprova.ts`): se un chunk manca dopo un deploy ricarica la pagina una volta. `src/lib/hashInPercorso.ts` (primo import di `main.tsx`, prima che il router legga l'indirizzo) converte `#/percorso` in path con BrowserRouter: start_url delle app installate.

## Comande ristorante (sala → cucina, ott 2026)
- Modulo **`sala`** "Comande ristorante" (dipende da `ristorante`: con `sala` attivo resta attivo il Ristorante; chi aveva già il
  Ristorante lo trova attivo una volta, flag `beachin.moduli.sala`). Permesso `sala` nella griglia ruoli; ruolo **Cucina** (`sala`=2).
- Manifest: Sala `id` `./?app=sala`, start_url e scope `./salaapp`; Admin `id` `./?app=admin` (con `./` coincideva con ComandApp, id `/`),
  start_url e scope `./adminapp`. Prima lo scope `./` dell'admin copriva tutto e Chrome diceva "già installata". Su GitHub Pages
  `404.html` = index e `hashInPercorso` converte il percorso in `#/…`. ComandApp `id` `./` (identità delle installazioni dei clienti), start_url e scope `./comandapp`.
  Un'app installata col vecchio scope `./` copre tutto il sito: va disinstallata e reinstallata.
- **Ex app separata `/salaapp`**: dal 26/10/2026 reindirizza a `/sala` nell'app staff (schede Cameriere/Cucina/Bar nella barra
  del telefono). Su PC in cima alla pagina il QR "Apri la sala sul telefono o sul tablet" (`urlSalaApp()` in `lib/sala.ts` → `/sala`).
  `sala.webmanifest` e `admin.webmanifest` restano solo per le vecchie installazioni.
- Telefono/tablet: dal `md` cameriere su due colonne; su telefono tavolo scelto compresso ("Cambia tavolo") e barra fissa in
  basso con riepilogo + Invia (sopra la barra delle schede); cucina su telefono una colonna alla volta (selettore).
- Uscita dei piatti (cameriere): su ogni riga i bottoni S·1·2·3 (affidabili su iPhone/Android); il trascinamento resta solo
  col mouse (`pointerType === 'mouse'`, ascolto su `window`). Su iPhone il tutto schermo c'è solo aprendo l'app dalla Home.
  GitHub Pages (HashRouter): `pages.yml` riscrive i manifest a start_url `./#/app` e scope `./`, altrimenti iPhone apriva l'app
  fuori scope (barra di Safari visibile).
- Piatti pronti uno per uno: la cucina tocca il singolo piatto (o "Uscita pronta" per tutta l'uscita); il cameriere vede
  "Pronti n su m" e sceglie "Porta subito i pronti" (segna servite solo quelle righe) o aspetta il resto.
  Campi a 16px su telefono (niente zoom di iPhone), colonne grid `minmax(0,1fr)`/`min-w-0` per non uscire dallo schermo.
- Pagina `src/pages/Sala.tsx` (rotta `/sala`, schede `?tab=cameriere|cucina|self`, voci sotto Ristorante nel menu laterale,
  badge `cucina` = comande `inviata`). Componenti in `src/pages/sala/`: `Cameriere` (tavoli del giorno → piatti del menu del
  Ristorante → Invia in cucina, coperti/note, comande già aperte del tavolo e conto), `Cucina` (colonne Da fare / In preparazione /
  Pronte, minuti di attesa, campanello), `AvvioSelf` (tavolo + PIN 4 cifre, salvati in localStorage `beachin.self.v1`) e
  `TabletSelf` (menu a tutto schermo in portale su body, verde bosco/crema/oro, foto rotonde, descrizioni, allergeni,
  carrello, "Già ordinato" con stato; si esce col PIN dal lucchetto).
- Context: `comandeSala` + `inviaComandaSala(tavolo, righe, {origine, cameriere?, coperti?, note?})` / `avanzaComandaSala`
  (inviata→in_preparazione→pronta→servita) / `annullaComandaSala`. Senza Supabase localStorage `beachin.comandesala.v1` tra schede.
- DB (migrazione `0015_comande_sala.sql`): `beachin.comande_sala` (Realtime, policy demo anon + staff secondo `sala`),
  colonna `menu_piatti.descrizione` (modificabile in Ristorante → Menu, riempita per i piatti dimostrativi da
  `src/data/seed/descrizioniMenu.ts`). Foto copertina del tablet da Unsplash (`fotoCopertinaSala` in `src/lib/sala.ts`).
- **Uscite** (migrazione `0017_uscite_sala.sql`, colonna `uscita_via`): ogni riga ha `uscita` (0 Subito, 1ª, 2ª, 3ª; proposta da
  `uscitaPredefinita(sezione)`: bevande 0, secondi/grigliata 2, dolci 3, resto 1) e `stato` (attesa/pronta/servita). Il cameriere
  trascina i piatti tra le uscite (eventi pointer + `elementFromPoint` su `[data-uscita]`, fantasma in portale; anche tocco sul piatto e poi sull'uscita, o il tasto col numero), poi su
  "Già ordinato" dà il **via** alla prossima uscita e segna **Servita** quella pronta. In Cucina i piatti sono divisi per uscita:
  tocco = pronto, "Uscita pronta" = tutta; le uscite senza via sono tratteggiate ("aspetta il via", toccabile per iniziarle comunque).
  Lo stato della comanda si ricava dai piatti (`ricalcolaStato` in `src/lib/sala.ts`). Azioni `segnaRigheSala`, `chiamaUscitaSala`.
- Foto dei piatti (migrazione `0016_foto_menu.sql`, solo dove mancano): immagini libere Unsplash scelte su nome/descrizione,
  stessi URL in `fotoMenu` del seed. Segnaposto finché il locale non carica le sue da Ristorante → Menu.

## Bar al tavolo (comande ristorante → bar, ott 2026)
- Modulo **`bar-tavolo`** "Bar al tavolo" (attivandolo restano attivi `sala`, `ristorante` e `bar`; spegnendo uno di
  questi si spegne; chi aveva già sala+bar lo trova attivo una volta, flag `beachin.moduli.bartavolo`). Permesso `bar-tavolo` nella
  griglia ruoli: serve per la scheda Bar. Migrazione `0018_bar_tavolo.sql` (ruolo **Barista**: `bar-tavolo`/`sala`/`comande` 2, `bar` 1;
  `bar-tavolo` 2 al responsabile): il barista ha anche `sala` 2 perché le policy di `comande_sala` lo chiedono.
- I due menu restano separati: menu del Ristorante (`menu_piatti`) e listino bar (`articoli_bar`, solo `disponibile`), convertito in
  forma `Piatto` da `articoliComePiatti` (`lib/sala.ts`). Riga della comanda con `reparto: 'bar'` (assente = cucina), dentro il jsonb
  `righe`: nessuna colonna nuova. Le bevande partono in uscita 0 (Subito), spostabili come i piatti.
- **Cameriere**: interruttore **Cucina | Bar** nella card Menu (filtri per categoria del listino), una sola comanda e un solo conto;
  tasto "Invia in cucina / al bar / in cucina e al bar"; icona tazza sulle righe del bar.
- **Tablet self**: un solo menu per tablet, scelto in `AvvioSelf` (`StatoSelf.menu`: `ristorante` | `bar` | `lavagnetta`, assente =
  ristorante). Lavagnetta: ogni voce ha `reparto` cucina/bar (migrazione `0019_lavagnetta_reparto.sql`, bottone Cucina/Bar
  nell'editor della lavagnetta quando `sala` è attivo); prezzo `null` = 0.
- **Stati uniformi** cucina e bar: per riga `attesa → preparazione → pronta → servita`; `ricalcolaStato` li riassume sulla comanda
  o sulla vista di un reparto (piatti chiamati non serviti: tutti da fare = inviata/Da fare, tutti pronti = pronta, altrimenti in
  preparazione). "Inizia preparazione" mette in lavorazione le righe chiamate del reparto (`azioniTavolo` in `Cucina.tsx`).
- **Cucina** (`<Cucina reparto>`): vede solo le sue righe (`perReparto`, indici originali per le azioni). Badge `daFareCucina`.
- **Coda unica bar** = `<Cucina reparto="bar" />` (stesse tre colonne Da fare / In lavorazione / Pronte) con anche le comande dagli
  ombrelloni (`ComandaCard` in `sala/ComandaOmbrellone.tsx`; nuova = Da fare, presa in carico/in preparazione = In lavorazione,
  pronta = Pronte, ultime 12 non incassate); al bar niente X sulle comande dei tavoli. `CodaBar compatta` = elenco unico in Comande. Dove: scheda **Bar** in `/sala?tab=bar` (voce "Coda bar", badge `bar`), quarta scheda dell'app
  `/salaapp`, e al posto della coda nella pagina Comande quando il modulo è attivo (`<CodaBar compatta suoni />`).

## QR tavoli e scelta tavolo per zona (ott 2026)
- **Scelta del tavolo per zona** (`src/pages/sala/TavoliPerZona.tsx`): cameriere, avvio tablet self e QR tavoli usano i tavoli del
  giorno (`tavoliDelGiorno(config.oggi)`, gli stessi di Ristorante → Tavoli) divisi per le zone di `lib/zoneTavoli.ts`.
- **QR fisso per tavolo**: tabella `beachin.tavoli_qr` (migrazione `0020_tavoli_qr.sql`: id = numero, `codice` casuale di 10 caratteri,
  `menu` ristorante/bar/lavagnetta, `aperto`; anche origine `qr` su `comande_sala`). Context `tavoliQr`, `assicuraTavoliQr(numeri)`
  (crea le righe mancanti), `impostaTavoloQr(numero, { menu?, aperto? })`; senza Supabase localStorage `beachin.tavoliqr.v1`.
- Link `urlTavoloQr(codice)` → rotta pubblica **`/tavolo?c=`** (`src/pages/TavoloQR.tsx`): se il tavolo è aperto apre `TabletSelf`
  con `qr` (niente lucchetto, comanda `origine: 'qr'`, badge "QR"), altrimenti "chiedi al cameriere". Il cameriere apre/chiude il tavolo
  dalla card del tavolo; si apre da solo alla prima comanda del cameriere.
- Scheda **QR tavoli** (`/sala?tab=qr`, `sala/QrTavoli.tsx`): menu per tavolo, apri/chiudi, "Chiudi tutti", stampa (`stampaQr`).
  Il tablet self ha il bottone telefono che mostra il QR del suo tavolo (`QrTelefono`).
- Sala → scheda **QR tavoli** (prima nell'app BeachIn Sala sotto Cameriere); sulla card del tavolo del
  cameriere il tasto QR apre `DettaglioQr` (QR, menu, apri/chiudi, stampa). `useQrTavolo(numero)` crea la riga mancante in un effect.
- **Conto del tavolo** (migrazione 0021): `TavoloQr.seduta` = conto in corso; ogni comanda nasce con la `seduta` del tavolo.
  `delConto(comande, tavolo, seduta)` (lib/sala) = comande della seduta non `pagata` (anche servite): "già ordinato" e totale nel
  cameriere e nel tablet. Tasto **Chiudi conto** (card del tavolo, con riepilogo `RiepilogoConto`) → `chiudiContoTavolo(numero)`:
  comande pagate e servite, nuova seduta, QR chiuso finché il cameriere non manda la prima comanda o tocca "Apri tavolo".
  La pagina `/tavolo` si lega alla seduta trovata aperta e la passa a `inviaComandaSala(..., { seduta })`, che rifiuta (null) se il
  conto è cambiato: la pagina mostra "Conto chiuso, inquadra di nuovo il QR".

## Comande sala con più dispositivi (migrazione 0022, stress test 25/10/2026)
- Cucina, bar e sala cambiano i piatti con la funzione del DB **`aggiorna_righe_sala(p_id, p_stati, p_uscita_via)`**
  (`p_stati` = `{ "<indice>": stato }`, via solo in avanti, ignorata se la comanda è pagata): `cambiaComandaSala` aggiorna lo stato
  locale, chiama la funzione e con `allinea` dice a `useSyncSupabase` di non riscrivere la riga intera. Lo stato riassunto è
  ricalcolato da `stato_comanda_sala` (stessa regola di `ricalcolaStato`, verificata su 80 casi). Chiudi conto e invio restano upsert.
- Trigger `comanda_sala_sul_conto` (solo comande nuove): la comanda va sempre sulla `seduta` in corso di `tavoli_qr`; con origine `qr`
  è rifiutata se il tavolo è chiuso o il conto è cambiato. Prima di inviare, la pagina QR chiede al DB (`verificaContoTavolo`).
  Una scrittura rifiutata fa rileggere la tabella (`useSyncSupabase`).
- Trigger `tavolo_qr_codice_fisso`: il `codice` non cambia mai; `tavoli_qr` crea le righe nuove con «inserisci se manca»
  (`nuoveSenzaSovrascrivere`) e poi rilegge.
- **Comande leggere** (25/10): `comande` e `comande_sala` si scaricano solo non pagate o di oggi (`FILTRO_COMANDE` nel context,
  opzione `filtro` di `useSyncSupabase`) e con `perRiga` le modifiche dal vivo aggiornano la sola riga arrivata col Realtime invece
  di rileggere la tabella (solo tabelle senza ordine salvato). Le righe fuori filtro restano nel DB e non vengono mai cancellate.
  Bar → Dettaglio del giorno legge i giorni passati dal DB (`leggiComandeGiorno`, `giorniComande`). Le altre 13 tabelle rileggono
  ancora tutto a ogni modifica (sono piccole); il caricamento per pagina è negli APPUNTI come cosa da fare prima della produzione.
- **Pagine dei clienti leggere** (25/10): `PAGINE_CLIENTI` nel context dice cosa scarica ogni pagina pubblica (`/tavolo`, `/menu`,
  `/comandapp`, `/sito/anteprima`, `/invito`); il resto resta spento. Modi di `useSyncSupabase` (`accesso`): `completo`, `lettura`,
  `nuove` (legge e salva solo righe nuove), `scrittura` (salva solo righe nuove, non legge), `spento`. Prenotazioni e richieste sul
  sito solo con le colonne della disponibilità (niente nomi, telefoni, email); l'invito legge solo la sua richiesta (`codice`).
  `main.tsx` passa la pagina al provider e lo rimonta quando si passa tra pagine diverse. Non è sicurezza: anon può ancora leggere
  tutto (policy "demo anon") e il Realtime manda la riga intera: va chiuso con la Fase 2 delle policy (APPUNTI).
- Cucina: le comande che aspettano solo il via (`aspettaVia` in lib/sala) stanno in fondo a Da fare sotto «Aspettano il via»,
  non contano nel numero della colonna e non suonano.

## Grafica menu Lido dei Pini (ott 2026)
- Componenti comuni in `src/components/menu/MenuLido.tsx` (`PaginaMenu`, `CopertinaMenu`, `ChipSezioni`, `TitoloSezione`,
  `SchedaVoce`, `Stepper`, `TendaRighe`, `PiedeMenu`), usati da **tablet self / QR tavolo** (`sala/TabletSelf.tsx`, `TavoloQR.tsx`),
  **Ombrellone** dell'app clienti (`ComandApp` → `Area`) e **menu pubblico** `/menu`.
- Ispirata alle foto del lido: fondo sabbia `#F6EFE3`, inchiostro marrone del logo `#3B2A20`, logo vero nel medaglione,
  foto vera in copertina con onda, tenda a righe a festoni (ombrelloni) come motivo, titoli Fraunces corsivo + numeri Caveat.
- Colore per menu (`TEMI`, variabile CSS `--acc`): ristorante mare `#1F6A84` (foto sala), bar e ombrellone spritz `#D9622B`
  (stesso listino e stessa grafica: foto spritz / ombrelloni), lavagnetta pineta `#2F6B4F` (tramonto).
- **Foto listino bar**: `ArticoloBar.foto` (colonna `articoli_bar.foto`, migrazione `0023_foto_bar.sql`), Unsplash libere per
  tutte le 60 voci (`fotoBar` in `seed/bar.ts`); il gestore le cambia da Bar → Listino (miniatura cliccabile).

## App clienti (`/comandapp`, ott 2026)
- `ComandApp.tsx` è ora l'**app del Lido** (PWA, manifest `comandapp.webmanifest` nome "Lido dei Pini"): barra in basso a
  sezioni `?sez=` **News · Ombrellone · Prenota · Eventi · Lavagna · Contatti** (nascoste se il modulo è spento: `comande`,
  `ristorante`, `eventi`). Default: Ombrellone se loggato, altrimenti News; pallino sulle news non viste (`comandapp.news.vista`).
- **Grafica** (ott 2026, spunto da app di viaggio su Pinterest): fondo chiaro `carta`, header bianco con data, card bianche
  `rounded-3xl` con ombra morbida, colore principale `laguna` (petrolio) per tasti, schede attive e voce attiva della barra.
  Ordine barra: News · Eventi · Lavagna · Prenota · Ombrellone · Contatti. Home = foto vera del lido (`fotoSito.spiaggiaDrone`) + **scorciatoie** colorate alle sezioni (`tinta(i)`: tenda/acqua/rosa/cielo) e news in card (in evidenza su
  petrolio). Eventi in card con foto grande e data in sovrimpressione. Titoli sans con parola `accento` in petrolio.
  Colori `carta/laguna/corallo/rosa/cielo` in `tailwind.config.js`. Form ristorante ed EventoModal restano quelli di `SitoAnteprima`.
- **Ombrellone** = vecchia ComandApp (login demo, ordini, stato); la barra "Ordina" sta sopra la nav.
- **Prenota** Ristorante/Eventi riusa `FormRistorante`, `EventoModal`, `Sospese` esportati da `SitoAnteprima` (stessi flussi
  del sito, rispetta `canaliPrenotazione`). `FormRistorante` ora parte da `config.oggi` (ristorante aperto tutto l'anno).
- **News** (`notizie`: `pubblicaNotizia/modificaNotizia/eliminaNotizia`, `fissata` = in evidenza, foto su Storage) e
  **Lavagnetta** (`lavagnetta`: `aggiungi/modifica/rimuovi/spostaVoceLavagnetta`, prezzo `null` = senza prezzo) nel context,
  seed `src/data/seed/app.ts`, sync Supabase `beachin.notizie` / `beachin.lavagnetta` (migrazione `0002_app_clienti.sql`).
  Client Supabase senza sessione Auth (`persistSession:false`, `storageKey` proprio): su github.io altre demo dello stesso
  progetto lasciano un login in localStorage che faceva partire le richieste come `authenticated` (policy solo anon → tutto vuoto).
- **Notifiche push clienti** (migrazione `0005_push_clienti.sql`): finestra `InvitoNotifiche` all'entrata dell'app
  (`src/components/AttivaNotifiche.tsx`; "Non ora" la nasconde 3 giorni, `beachin.push.clienti.rimandata`). `push_iscrizioni` ha colonna `app` (PK endpoint+app:
  stesso telefono = stesso SW per le due app), RPC `registra_push(..., p_app)`. Trigger `notifica_app_clienti`: insert su `notizie`
  → "📰 titolo"; insert/modifica di nome/descrizione/prezzo su `lavagnetta` → "Lavagna del giorno aggiornata", max 1 ogni 15 min
  (`beachin.push_invii`). `beachin-push` riceve `tipo` e filtra le iscrizioni per app; SW apre/porta in primo piano la pagina giusta.
  Il gestore li scrive da **Sito → App clienti** (`?tab=app`, con QR dell'app) e dall'**app admin** (tab "App"), componenti
  `src/components/app/GestioneAppClienti.tsx`. Lavagna in stile ardesia con font Caveat (`font-gesso`).
- **Contatti**: da `config` (telefono, WhatsApp, email se c'è, indirizzo/Maps, Facebook, orari).

## Assistente vocale (menu a voce)
- iPhone con app aggiunta alla Home (e browser senza Web Speech): **Whisper su Groq** (piano free). `src/lib/trascrizione.ts`
  (`useRegistrazione`: MediaRecorder, tap per iniziare/inviare, max 12 s) → Edge Function `beachin-trascrivi`
  (`supabase/functions/beachin-trascrivi`, modello `whisper-large-v3-turbo`, lingua it, prompt = nomi dei piatti) con segreto
  `GROQ_API_KEY` (Supabase → Edge Functions → Secrets, messo dall'utente). Senza chiave risponde 503. Altrove resta Web Speech.
- **Più comandi in una frase**: `dividiComandi()` (`comandiMenu.ts`) taglia davanti a un verbo di comando preceduto da e/poi/virgola
- **Parlato naturale**: `normalizzaComando()` stacca i pronomi dai verbi («toglimi», «inseriscimi», «leggimi», «toglimelo»), toglie cortesie («per favore», «puoi…», «vorrei…») e la punteggiatura finale; accetta anche gli infiniti (togliere, cambiare…). «annulla X» = togli; **«sostituisci/rimpiazza/cambia X con Y [a N euro]»** e «metti Y al posto di X» → azione `sostituisci` (rinomina + prezzo, stessa sezione/posizione; anche nel prompt LLM con esempi few-shot); prezzo anche come «al prezzo di 15 euro»; in un «aggiungi» la coda «…, però spostalo/mettilo nei secondi» imposta la categoria (preposizioni: nei/negli/nel/nella/in/tra/fra/come/categoria).
- **Prezzi detti in ogni modo** (`estraiPrezzo`): «6,50 €», «€12», «6 euro e 50 (centesimi)», «12 e mezzo», in lettere («sei e cinquanta», «ventidue euro», «un euro e venti»: `numeroInLettere` + `cifreNeiPrezzi`, solo in posizione di prezzo, così «pizza quattro formaggi» resta com'è); priorità: con valuta > dopo «a/costa/prezzo» > numero in fondo (quindi «pizza 4 stagioni» senza prezzo non prende 4). Toglie «a persona/cadauno». Prezzo anche con «X costa N», «il prezzo di X è N», «aumenta/abbassa X a N»; «metti nel menu X» = aggiungi. Articoli con apostrofo («l'orata», «dell'acqua»), «menù», virgole e «ok/allora» iniziali gestiti.
- **Piatto ambiguo**: `risolviPiatto` (AssistenteVocale) chiede «quale?» se due piatti hanno punteggi entro 0,06 («togli la tartare», «vino della casa»). Doppione all'aggiunta solo con `quasiUguale` (fuzzy.ts, nome intero ≥0,85): «Tiramisù al pistacchio» non è più bloccato da «Tiramisù».
- **Test**: `npm run test:dettatura` (`scripts/verifica-dettatura.mjs`, ~100 frasi realistiche; incluso in `npm test`).
- **Piano B con LLM**: se una parte della frase resta `sconosciuto`, `gestisci()` manda l’intera frase a `interpretaConAI()` (`src/lib/interpretaComando.ts`) → Edge Function `beachin-interpreta` (Groq, `llama-3.3-70b-versatile`, piano gratuito, JSON) che riceve nomi piatti + sezioni e restituisce `ComandoMenu[]` (validati lato client). Badge «Interpreto…» durante l’attesa. Senza Supabase resta solo il parser a regole.
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

## Email al cliente (Brevo)
- Edge Function `supabase/functions/beachin-email`, chiamata da 2 trigger su `beachin.richieste_ristorante` e
  `beachin.richieste_eventi` (il body porta `tabella`; insert `da_confermare` → "richiesta ricevuta"; cambio stato → "confermata"/"rifiutata"). Salta se manca l'email.
- Segreti nel Vault: `beachin_brevo_key`, `beachin_email_mittente` (mittente verificato su Brevo). Senza: nessun invio.
- **Grafica** (ott 2026): testata blu col logo bianco, foto grande, barra colorata per stato (acqua confermata, tenda in attesa,
  boa rifiutata), titolo, testo, scheda riepilogo (data/ora/coperti o evento/persone), firma e piè di pagina col link al sito.
  Immagini in `public/email/` (`logo.png`, `ristorante.jpg` dal sito, `evento.jpg` di riserva) servite da `<app>/email/`;
  Vault `beachin_email_img` (facoltativo) sostituisce la cartella. Foto evento: `RichiestaEvento.eventoFoto` → colonna
  `evento_foto` (migrazione `0008_foto_evento_mail.sql`), URL assoluto della foto dell'evento preso alla creazione della
  richiesta (`fotoEvento` nel context; le foto in data URI sono scartate → si usa `evento.jpg`).
- La "posta" simulata in app (`pushMail` nel context) resta per la demo locale. Eventi sincronizzati su `richieste_eventi`; ombrellone non è su Supabase → niente mail reali.

## Eventi: invito con QR e presenze (ott 2026)
- Futuri/passati ovunque (gestionale, sito, app clienti) con la data **reale** `config.oggi`, non `config.stagione.oggi`
  (quella resta solo per i dati spiaggia). Seed: "Degustazione al tramonto" sempre a oggi+10 giorni (`fraGiorni`), così la demo
  ha sempre un evento prenotabile.
- Ogni `RichiestaEvento` ha `codice` (8 caratteri senza ambigui, `nuovoCodiceInvito` in `src/lib/invitiEventi.ts`; sul DB default
  `beachin.nuovo_codice_invito()`), `arrivati` e `arrivoTs`. Migrazione `0006_inviti_eventi.sql` (indice unico sul codice).
- **Mail di conferma** (`beachin-email`): per gli eventi confermati blocco "Il tuo invito" con QR (immagine da api.qrserver.com,
  le immagini `data:` sono bloccate dai client di posta), codice e bottone. Il QR contiene `<app>/invito?c=CODICE`; base da Vault
  `beachin_app_url` (default https://beachin.pages.dev/; in produzione lo imposta il workflow Deploy). Posta/WhatsApp simulati
  in app portano lo stesso link.
- **Pagina pubblica** `/invito?c=` (`src/pages/InvitoEvento.tsx`): QR grande + codice + dettagli; dice se l'ingresso è registrato.
- **App admin → Ingressi** (tab visibile col modulo `eventi`, `src/components/eventi/IngressiEventi.tsx`): scelta evento (default
  oggi/prossimo, `eventoPredefinito`), contatori entrate/attese, `ScannerQr` (getUserMedia + `jsqr`, fotocamera posteriore `ideal`, ripiego `video:true`; errore spiegato per tipo
  con Riprova) o codice a mano → `verificaInvito`: valido (scelta "entrano N", ding) / già entrato (con annulla) / altro evento / non confermata / sconosciuto
  (campanello). Lista invitati con "Entrati" e ↺. Azione context `segnaArrivoEvento(id, n)` (0 = annulla).
- **Gestionale Eventi** a sottomenu `?tab=calendario|presenze`: Presenze (`src/components/eventi/PresenzeEventi.tsx`) con KPI
  (inviti, attese, entrate, mancanti) e tabella invitati: codice (link all'invito), stato, segna/annulla a mano.
  **Reinvia invito** (se c'è l'email): `reinviaInvito(id)` imposta `invioTs` → colonna `invio_ts` (migrazione `0007_reinvia_invito.sql`),
  trigger `email_reinvio_invito` → `beachin-email` manda "Il tuo invito — evento" con lo stesso blocco QR.

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

- (ott 2026, layout "panoramica del servizio" ispirato al mockup Lovable) Titolo + barra: giorno ‹ Oggi ›, Pranzo/Cena,
  **Nuova prenotazione** (apre il form a tutta larghezza, con **orario**). Tre schede: Coperti previsti · Tavoli
  liberi (su N) · Da sistemare (senza tavolo). Due colonne: a sx **In arrivo** (schede con orario a sinistra, tavolo·zona,
  note, Arrivati, select tavolo) e **Suggerimenti tavoli** (`suggerisciTavoli` in `src/lib/disponibilita.ts`: libero, più
  piccolo che basta, zona preferita letta dalle note con `zonaPreferita`; bottone Assegna); a dx **calendario del mese**
  (`src/pages/ristorante/CalendarioMese.tsx`, pallino = prenotazioni, rosso = da confermare/chiuso) e **Disponibilità tavoli**.
- (ott 2026) Tolta la vista settimanale (`CalendarioPrenotazioni` eliminato). Il tavolo si sceglie **sempre dalla pianta in un
  modal** (`src/pages/ristorante/ScegliTavolo.tsx`): dalla scheda prenotazione, da "Assegna" dei suggerimenti (tavolo consigliato
  cerchiato) e dal form nuova prenotazione. Occupati grigi col nome, troppo piccoli bordati di giallo, "Togli il tavolo".
- Prenotazioni senza tavolo evidenziate (bordo e colonna orario gialli, etichetta "Da sistemare"); il riquadro
  **Da sistemare** è cliccabile e apre la pianta per la prima prenotazione senza tavolo del turno.
- `PrenotazioneRistorante.ora?` ("HH:mm"): colonna `ora` in `beachin.prenotazioni_ristorante` (migration
  `beachin_prenotazione_ora`, righe esistenti riempite con orari di esempio); la lista è ordinata per orario.

## Menu laterale a sottomenu (ott 2026)
- `VoceNav.figli?: SottoVoce[]` in `src/config/navigazione.tsx` (percorsi con `?tab=`; `badge: 'richieste'`). Ordine:
  Panoramica · **Bar** (Listino, Conti, Comande) · **Ristorante** (Prenotazioni, Tavoli, Menu, Magazzino, Gestione giorni) · resto.
- `Sidebar`: voce con figli = pulsante che apre/chiude (aperto di default se ci sei dentro), righe alte per iPad.
  `AppShell` ricava titolo/sottotitolo anche dai figli (es. `/comande`).
- Il menu mostra **solo i moduli attivi** (niente voci col lucchetto; si attivano da Impostazioni → Moduli e piano).
- La `Sidebar` suona il `campanello()` a ogni richiesta tavolo nuova dal sito (non al primo caricamento; audio sbloccato al primo tocco).
- `Bar.tsx`: solo schede Listino (giacenze) e Conti (per ombrellone); tolte vendite/KPI. Modulo `bar` aggiunto al piano `ristorante_web`.
- Dipendenza moduli (`ModuliContext`): Comande usa il listino del Bar, quindi con `comande` attivo anche `bar` resta attivo; disattivare `bar` spegne anche `comande`.
- **Listino bar condiviso** (ott 2026): `sezioniBar` + `articoliBar` nel context, sync Supabase `beachin.bar_sezioni` /
  `beachin.articoli_bar` (semina dai seed). Usati da Bar → Listino, ComandApp e Comande (non più `getArticoliBar`, che resta
  solo per il Cruscotto). Listino tutto modificabile: articolo (modal: nome, categoria, prezzo, costo, giacenza, soglia, unità,
  disponibile), categorie (rinomina, ordine = schede ComandApp, aggiungi, elimina solo se vuota), toggle Disponibile/Esaurito
  (gli esauriti spariscono da ComandApp/Comande). `CategoriaBar` ora è `string`.
- **Conti** = comande non pagate raggruppate per ombrellone (clienti, righe, dettaglio comande); **Incassa** →
  `incassaOmbrellone()` segna `pagata` (colonna `beachin.comande.pagata`). I vecchi conti finti (`seed/bar.ts`) non sono più
  caricati (`conti` parte vuoto, usato ancora da arenile/demo).
  Conti: bottone **Dettaglio** per ombrellone (ogni comanda con giorno, ora, origine, stato, righe, note, totale) e card
  **Dettaglio del giorno** (`Giornata`: tutte le comande del giorno scelto, incassate e no, con totale/incassato/da incassare).
  Badge `comande` in Sidebar (Bar → Comande e voce Bar chiusa) = comande `in_attesa`.

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

## Risposta WhatsApp simulata (ott 2026)
- Ogni conferma/rifiuto (ombrellone, tavolo ristorante, evento) chiama `pushWa` nel `DemoDataContext` → stato `whatsapp`
  (`MessaggioWhatsApp`: nome, telefono, testo con `*grassetto*`, esito) + `chiudiWhatsapp`.
- `src/components/AnteprimaWhatsApp.tsx` (montato in `AppShell`): telefono in basso a destra con chat,
  "sta scrivendo…", messaggio, `ding()`, spunte grigie → blu. Pulsante "Invia davvero su WhatsApp" = link `wa.me`
  con numero (prefisso 39 se manca) e testo già compilati. Nessun invio automatico reale (servirebbe WhatsApp Business API).

## Prenotazione tavolo dal sito: orario e posti (ott 2026)
- `src/lib/disponibilita.ts`: `ORARI_TURNO` (pranzo 12:00–14:00, cena 19:00–21:30, ogni 30'), `COPERTI_PER_ORARIO` (16 coperti in
  arrivo per mezz'ora), `MAX_COPERTI_SITO` (12). `sistemazionePer(liberi, coperti)` = un tavolo solo o 2–3 tavoli uniti (meno posti
  sprecati, stessa zona). `prenotabilita(...)` siede prima prenotazioni senza tavolo e richieste `da_confermare`, poi dà i coperti
  prenotabili (con sistemazione) e i posti per orario.
- Sito `FormRistorante`: select Persone solo con i gruppi che ci stanno, chip Orario (barrati se pieni), testo "tavoli da 3 + 2 uniti";
  turno pieno se nessun gruppo ci sta.
- `RichiestaRistorante.ora` (Supabase `beachin.richieste_ristorante.ora`, migration `beachin_richieste_ristorante_ora`), passa alla
  `PrenotazioneRistorante` alla conferma; orario in mail locali, Edge Function `beachin-email` (v3) e WhatsApp.
- App admin `Disponibilita`: se manca un tavolo adatto propone i tavoli da unire.
- WhatsApp simulato anche alla **ricevuta** della richiesta (ombrellone, tavolo, evento; `esito:'richiesta'`), anteprima montata anche in `SitoAnteprima`.
- Sito pubblico: tolta la casella "La mia posta" (pulsante + drawer); i messaggi dicono dove abbiamo scritto (`doveScritto`: email se valida, WhatsApp se c'è il cellulare, entrambi se entrambi). Nel context `pushMail` cliente salta senza email e `pushWa` salta senza cellulare. `postaCliente` resta nel context.

## Moduli commerciali (vendita a moduli)
- BeachIn si vende a moduli: sorgente unica `src/config/moduli.ts` (`ModuloId`, `MODULI` con testi di
  upsell, `PIANI` bundle, `MODULI_CORE`). Stato "attivi" nel `src/context/ModuliContext.tsx`
  (in memoria + localStorage `beachin.moduli.v1`; domani = campo per-cliente dal DB).
- "Richiedi attivazione" (`ModuloBloccato`) scrive a `config.emailBeachIn` (contatto commerciale BeachIn); vuoto = pulsante nascosto.
- Core sempre attivi: `panoramica` (home ridotta, rotta `/`) e `impostazioni`.
- **Panoramica** (`src/pages/Panoramica.tsx`): KPI meteo oggi (reale da Open-Meteo per Savona, hook
  `src/hooks/useMeteoOggi.ts`, riserva = `giornoOggi` della demo) · coperti oggi · dal sito da confermare · visite sito ieri
  (vs media 7 gg, da `statoSito.visite`) · giorni alla prossima chiusura estiva (`prossimaChiusuraEstiva`: ultima domenica di
  settembre, dell'anno dopo se già passata; non tocca `config.stagione.fine` dei dati demo). Il prossimo evento sta solo nella card. Card: Ristorante oggi, Sito da confermare,
  Prossimo evento (countdown; se nessuno, l'ultimo passato), Magazzino sotto scorta (`quantita < scortaMinima`).
- Gating: ogni voce nav ha `modulo`; `src/components/ModuloGate.tsx` protegge le rotte → se il modulo
  non è attivo mostra `src/pages/ModuloBloccato.tsx` (pagina di upsell, deep-link non fa 404). La Sidebar
  mostra i moduli bloccati col lucchetto. Il Cruscotto completo è ora rotta `/cruscotto` (modulo `cruscotto`).
- Piano di default: `ristorante_web` (Panoramica, Ristorante, Assistente vocale, Comande, Eventi, Sito, Impostazioni).
- Attivazione dal vivo (demo/vendita) da **Impostazioni → Moduli e piano** (`applicaPiano`, `toggle`).

- (ott 2026) **Colori parlanti** sugli stati (toni `verde/giallo/rosso` di `Badge`): giallo *Da accogliere* (+ bottone
  verde **Accogli**), verde *Arrivati* (badge, scheda verdina, piccola ↺ per annullare l'arrivo), rosso *Annullata* con
  bottone **Recupera** (torna `confermata`). Riepilogo "In arrivo" con badge giallo/verde.

- (ott 2026) Nelle schede **In arrivo** senza tavolo compare il bottone verde **Consigliato: tavolo N** (primo libero
  adatto da `suggerisciTavoli`) che lo assegna con un tocco; la pianta resta accanto.
- QR (menu, tavoli, ComandApp, AdminApp) usano `urlPubblico()` (`src/lib/urlPubblico.ts`): fuori da GitHub Pages/Vercel
  (artifact, localhost) puntano a GitHub Pages, altrimenti il telefono riceveva un indirizzo non apribile.

## Cruscotto completo (ott 2026)
- `src/pages/Cruscotto.tsx`: riga di 4 `KpiTile` (incasso, occupazione, coperti, scontrino bar) con numero grande, `Sparkline`
  SVG degli ultimi 30 giorni (`kpi.ultimi30`, ultimo punto = valore dal vivo) e badge di variazione: occupazione in punti vs
  anno scorso, gli altri vs media dei 7 giorni prima (`media7`/`variazione`). Incasso con barra di ripartizione per centro.
- Testi minimi `text-xs` (niente più 10–11 px). **Alert operativi** cliccabili (`Link`): fuori servizio → Arenile,
  scorte → Bar listino, saldi → Clienti, prenotazioni → Sito prenotazioni.

## Sito → Sito e marketing (ott 2026)
- Tab `marketing` di `Sito.tsx` (le sezioni di Sito ora stanno in `?tab=`; sottomenu Panoramica / Sito e marketing).
  UI `src/pages/sito/Marketing.tsx` (Recharts `ComposedChart`, gauge SVG, bolle SVG), dati `src/data/marketing.ts`.
- Dati: serie giornaliera 1/6–30/9 per 2026 e 2025 (`creaRng`), picco a Ferragosto (salita σ 32 gg, discesa σ 17),
  weekend ×1,28, lunedì ×0,85. Ogni mese deriva da totali (ripartizione a resto massimo, nessuna unità persa);
  la stagione è la somma dei mesi. Vincoli in testa al file, verificati da `npm test`.
- Tripadvisor: voto/recensioni da `config.tripadvisor`, distribuzione che torna a 4,4. Salute del sito: fissa.

## Stato funzionalità Sito + Eventi (ultimo lavoro)
- **Prenotazione ombrellone sul sito = doppio controllo**: `prenotaOmbrelloni = moduloAttivo('arenile') && canaliPrenotazione.ombrelloni`
  (`SitoAnteprima`): se falso spariscono sezione Prenota, voce nav, CTA hero e bottone flottante (niente più box "sospese").
  Listino/disponibilità dipendono solo dal modulo Arenile. In Sito → Prenotazioni l'interruttore Ombrelloni, le richieste
  ombrelloni e le righe disponibilità/listino compaiono solo con Arenile attivo.
- Sito gestionale: panoramica, **prenotazioni** (Ombrelloni/Ristorante/Eventi con
  Conferma/Rifiuta), **posta** admin, contenuti, recensioni/messaggi.
- **Galleria foto**: caricamento multiplo dal gestionale (Sito → Galleria, `ridimensionaImmagine`);
  la galleria è mutabile nel context (`galleria` + `aggiungiFoto/rimuoviFoto/rinominaFoto`, seed da
  `statoSito.galleria`, campo `FotoGalleria.immagine` data URI). **Didascalia** modificabile per foto
  (`rinominaFoto`), mostrata sul sito pubblico (`SitoAnteprima`).
- **Data "oggi"**: `config.stagione.oggi` è la data REALE del dispositivo, limitata alla stagione
  (`oggiInStagione()` in `config.ts`), così i numeri (serie giornaliera/KPI) restano validi: si usa solo
  per i dati spiaggia. `config.oggi` è la data reale NON limitata: Topbar, Ristorante/prenotazioni (seed
  generato da oggi), AdminApp, Eventi, Panoramica, giorni chiusi, `ricevutaIl` delle richieste.
- **Topbar**: data di oggi + meteo attuale di Savona (`useMeteoOggi`, una fetch condivisa con cache 30 min).
- **Ristorante → annulla/elimina prenotazione**: chiede conferma con `Modal` (stato `daCancellare`).
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
- (ott 2026) Form prenotazione (ombrellone, tavolo, evento): obbligatorio **email o cellulare** (`contattoValido`) e
  checkbox **consenso GDPR** con informativa art. 13 in finestra (`ConsensoPrivacy`). Pulsanti "Prenota" portano al form
  (`#prenota` o `#prenota-tavolo`); `scrollTo` ricorregge a fine corsa (foto lazy/reveal spostavano il bersaglio).
- Foto in `src/assets/sito/` (JPEG ottimizzati max 1400px, export `fotoSito` da `index.ts`). (ott 2026) Quasi tutte
  sostituite con scatti reali dall'Instagram del lido (Drive, cartella "LidoDeiPiniInstagram"): hero drone, ombrelloni
  all'alba, pattino "Salvataggio" (`bagnino`), tramonto, tavola vista mare (`ristorante`), spritz (`barDistillati`),
  beach volley, torneo, staff (`famiglia`), drone onde (`pineta`), golfo (`marePini`). I nomi file sono rimasti
  quelli vecchi per non toccare i seed.
- Servizi: **Cabine / Docce e servizi / Area relax** ora sono `TesseraFoto` (non più tessere a icona; `TesseraIcona`
  rimossa) con foto Wikimedia Commons CC BY-SA (`cabine.jpg`, `docce.jpg`, `area-relax.jpg`); crediti obbligatori
  in piccolo nel footer. Da sostituire con foto reali del lido quando arrivano.
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

## Impostazioni stabilimento (DB)
- `config.ts` = **predefiniti**; i parametri modificabili (anagrafica, WhatsApp, orari + nota, servizi arenile, aliquote,
  prezzo medio, Tripadvisor) sono in `src/lib/impostazioni.ts` (`GRUPPI`, chiavi "a.b") e salvati in
  `beachin.impostazioni` (riga `id='stabilimento'`, `valori` jsonb piatto; migrazione `0003`). Senza riga = predefiniti.
- `main.tsx` aspetta `caricaImpostazioni()` (max 2,5 s) prima del render; il salvataggio (Impostazioni → "Parametri
  dello stabilimento") e il Realtime mutano `config` e **rimontano il router** (`key=versione`): le pagine leggono `config` diretto.
- Non modificabili (strutturali, da loro dipendono i seed): file/postazioni/gazebo dell'arenile e date di stagione.

## Cliente reale: Lido dei Pini (Savona)
- `config.ts` ha i dati reali da fonti pubbliche (Tripadvisor/spiagge.it/TheFork): Via Nizza 85/R Savona,
  tel +39 349 574 5156 (online compare anche +39 340 159 9851), ristorante 12:00–14:30 / 19:00–22:00 tutto l'anno,
  spiaggia maggio–settembre, Tripadvisor 4,4 su 234 recensioni (#34/303), prezzo medio ~32 €, Facebook.
  `email`/`sito`/`partitaIva` vuoti = da comunicare (il sito li nasconde). Chiusura spiaggia 19:30 da confermare.
- Servizi reali: ombrellone/lettini, cabine, bar, ristorante, animazione bimbi, area relax, docce calde/fredde,
  beach volley, ping pong (niente noleggi/parcheggio). Recensioni sul sito = temi riassunti + badge Tripadvisor
  (non citazioni). Menu ristorante = REALE (Menù del proprietario da restaurantguru: 25 piatti con prezzi, `seed/ristorante.ts`; food cost/allergeni stimati, bevande dimostrative). Restano dimostrativi: listino, eventi, recensioni del gestionale, numeri arenile.
- Tripadvisor e gli altri siti sono bloccati dalla rete dell'ambiente: dati presi via WebSearch.

## Deploy produzione (Oracle: prod-web + prod-db)
- **Ambienti**: *demo* = Pages/Vercel da `main` + Supabase Cloud Demo IPA (schema `beachin`); *produzione* = VM Oracle
  `prod-web` (web, Caddy, IP riservato 158.178.144.127 → https://158-178-144-127.sslip.io) + VM `prod-db` (Supabase
  self-hosted in Docker, IP riservato 141.148.241.169, API su https://api-141-148-241-169.sslip.io). Compartment demo, eu-amsterdam-1, A1.Flex 2 OCPU/12 GB/100 GB
  ciascuna (= tetto Always Free). VCN `prod-vcn` 10.1.0.0/16, ingress 22/80/443. Bucket privato `prod-backup`
  (namespace `axll6zmc6b9c`): `keys/prod-web` (chiave SSH di entrambe le VM), `releases/`, `db/` (dump notturni).
- **prod-db** nasce da `deploy/prod-db-cloud-init.sh` (sostituire `__DOMINIO__` e `__PAR_BACKUP__`): installa Docker +
  compose ufficiale Supabase in `/opt/supabase/docker`, genera i segreti sulla VM (`.env`, mai fuori), Caddy espone solo
  `/rest /auth /realtime /storage /functions /graphql` (Studio solo via tunnel SSH su `localhost:8000`, utente `beachin`,
  password in `.env`), `beachin-psql` (psql nel container), backup `pg_dump` alle 02:17 UTC nel bucket. In console stampa
  `BEACHIN-STATO`, `BEACHIN-REST` e `BEACHIN-ANON` (chiave anon, pubblica).
- **Migrazioni**: `supabase/migrations/NNNN_*.sql`, applicate in ordine da `scripts/migra.sh` (tabella `beachin.migrazioni`,
  una transazione per file, `--baseline` = registra senza eseguire; `DB_URL` per Supabase Cloud, `PSQL_CMD` per prod-db).
  Demo: baseline 0001 registrata il 5/10/2026. Migrazioni *compatibili all'indietro*: il DB va online prima del web.
- **Produzione sospesa** (21/10/2026): il job `produzione` parte solo se la variabile di repository `PRODUZIONE_ATTIVA` = `si`;
  altrimenti gira `produzione-sospesa`, che lascia solo un avviso.
- **Workflow `.github/workflows/deploy.yml`** (solo manuale, sceglie ambiente + ref):
  demo → migrazioni + `supabase functions deploy`; produzione → SSH su prod-db: migrazioni, Vault (`beachin_functions_url`
  = `http://api-gw:8000/functions/v1`, `beachin_anon_key`, `beachin_vapid_private`, `beachin_brevo_key`, `beachin_email_mittente`), copia funzioni in
  `volumes/functions` + `GROQ_API_KEY` nel `.env` + riavvio container `functions`; poi build + `deploy/rilascio.sh` su
  prod-web. `rollback.yml` = versione web precedente (sulla VM 5 versioni in `/var/www/rilasci`).
- **Settings → Environments**:
  - `produzione` (*Required reviewers*): Variables `PROD_HOST`=158.178.144.127, `PROD_HOST_FINGERPRINT`=
    `SHA256:v6Rfu25peR4w1/rUTwgmdw56NdJ9I+zLeAbgt4ekYPI`, `PROD_DB_HOST`=141.148.241.169, `PROD_DB_HOST_FINGERPRINT`=
    `SHA256:V9zLcj7PRO/qbRBZ5XH3FP4NHpmRMiEmY5aoUU7+39U`, `VITE_SUPABASE_URL`=https://api-141-148-241-169.sslip.io, `VITE_SUPABASE_ANON_KEY` (= `BEACHIN-ANON`); `EMAIL_MITTENTE`; Secrets
    `PROD_SSH_KEY` (= `keys/prod-web`), `VAPID_PRIVATE_KEY`, `GROQ_API_KEY`, `BREVO_API_KEY`.
  - `demo`: Variables `SUPABASE_PROJECT_REF`; Secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL` (Session pooler IPv4).
- I trigger push (`notifica_nuova_richiesta`) ed email (`email_richiesta`) leggono URL funzioni e chiave anon dal Vault: senza segreti non invia nulla.

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
