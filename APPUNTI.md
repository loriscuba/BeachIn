# Appunti di progetto — BeachIn / Lido dei Pini

Note per lo sviluppo e per il passaggio in produzione. Aggiungere le voci nuove
nella sezione giusta, con la data. Le cose fatte si spuntano (`[x]`), non si cancellano.

---

## 1. Recensioni Tripadvisor

Oggi sul sito: voto 4,4 · 234 recensioni · #34 su 303 (dati reali ma **fissi**, presi a settembre 2026)
+ temi ricorrenti **riassunti** (non citazioni). Scheda Tripadvisor del locale: ID **2464057**.

### Opzione A — Widget ufficiale di Tripadvisor (gratis, 10 minuti)
- Il locale (o tu, con il suo account) va su *Tripadvisor per le aziende*, si fa riconoscere come
  gestore della scheda e da lì genera il widget: voto, recensioni recenti, badge. Tripadvisor fornisce
  un pezzo di codice da incollare.
- Lo si inserisce nella fascia al tramonto al posto dei riassunti.
- **Pro:** sempre aggiornato, nessun costo, nessun server.
- **Contro:** la grafica è quella di Tripadvisor, poco personalizzabile e un po' "stonata" rispetto al resto del sito.

### Opzione B — Tripadvisor Content API (integrazione vera, con la nostra grafica)
- Account sviluppatore Tripadvisor → chiave API (serve carta di credito; c'è una quota gratuita di
  chiamate — condizioni e prezzi da verificare al momento dell'iscrizione).
- Con l'ID 2464057 l'API restituisce voto, numero recensioni, classifica e le **ultime 5 recensioni**
  (testo, autore, data, voto). Non tutte le 234.
- Regole Tripadvisor: logo e link visibili, dati non conservati a lungo.
- La chiave **non** può stare nel sito: serve una funzione lato server, es. su Vercel `/api/recensioni`
  (chiave nelle variabili d'ambiente, risposta in cache qualche ora). Il sito legge da lì; se fallisce
  usa i dati fissi attuali come riserva.
- GitHub Pages è solo statico: il sito "vero" andrebbe servito da Vercel, oppure Pages chiama la funzione su Vercel.

**Consiglio:** per la demo va bene com'è; in produzione B è il risultato migliore, A se non si vogliono
gestire chiavi e costi.

- [ ] Decidere A o B con il cliente
- [ ] (A) Farsi mandare il codice del widget
- [ ] (B) Creare account API + chiave, poi funzione Vercel `/api/recensioni`

---

## 2. Dati del cliente da confermare
- [ ] **Menu completo reale**: Tripadvisor/TheFork bloccano il download automatico. Inseriti solo 3 piatti veri
  (tartare di pescato con fragole 10 €, spaghetti gamberoni/asparagi di mare/lime 15 €, fusilli scampi/ricotta/taggiasche,
  prezzo da confermare) + fritto misto. Il resto è dimostrativo: farsi dare il menu (foto o PDF) e sostituirlo.
- [ ] Telefono: online compaiono **+39 349 574 5156** (usato ora) e **+39 340 159 9851** — quale è giusto?
- [ ] Email, sito web, Partita IVA (ora vuoti: sul sito non compaiono)
- [ ] Orario di chiusura della spiaggia (ora 19:30, da confermare)
- [ ] Menu e prezzi reali del ristorante (ora dimostrativi)
- [ ] Listino ombrelloni reale (ora dimostrativo)
- [ ] Numero di ombrelloni e file dell'arenile (ora 180 su 9 file, di prova)
- [ ] Eventi reali della stagione (ora di esempio)

---

## 3. Foto e video
- [x] Hero: spiaggia vista dall'alto (foto reale)
- [x] Ristorante: sala sotto il canniccio con vista mare (foto reale)
- [x] Logo Lido dei Pini su barra e footer del sito
- [ ] Sostituire le immagini ancora generate: tramonto (fascia recensioni), famiglia, pineta, mare tra i pini
- [ ] Foto delle cabine (il riquadro "Cabine" ha solo l'icona)
- [ ] Video per lo sfondo dell'hero: versione leggera (< 10 MB) su Drive, oppure `src/assets/sito/hero.mp4`
- Le foto di Tripadvisor non si possono scaricare in automatico (protezione anti-bot): salvarle a mano
  e metterle su Drive, cartella **BeachIN**. Preferire quelle pubblicate dal locale.

---

## 4. Produzione / infrastruttura
- [ ] **Menu QR condiviso tra dispositivi**: oggi il menu vive nel browser del gestore; chi scansiona il QR vede il
  menu iniziale. In produzione serve un database (es. Supabase) da cui leggono gestionale e `/menu`.
- [ ] **Traduzioni**: oggi servizio gratuito MyMemory (limite ~5.000 caratteri/giorno) + glossario di riserva.
  In produzione: DeepL/Google o un LLM lato server (stessa funzione `traduciNome` in `src/lib/menuLingue.ts`).
- Deploy: GitHub Pages parte a ogni merge su `main` → https://loriscuba.github.io/BeachIn/
- [ ] Dominio del cliente (es. lidodeipini.it?) da collegare a Pages o Vercel
- [ ] Oggi i dati sono in memoria (demo): per l'uso reale servono database e login per il gestionale
- [ ] Email vere per le prenotazioni (oggi la "posta" è simulata dentro l'app)
  - [x] Edge Function `beachin-email` (Brevo) + trigger su `richieste_ristorante`: mail al cliente su richiesta ricevuta / confermata / rifiutata
  - [x] Account Brevo + segreti nel Vault (prova inviata e arrivata)
  - [ ] Mittente sul dominio del cliente (oggi Gmail → rischio spam)
  - [x] Eventi: tabella `richieste_eventi` su Supabase + mail
  - [ ] Ombrellone: oggi solo in memoria, serve tabella Supabase per mandare mail anche lì

---

## 5. Idee / sviluppi futuri
- Risposte dell'admin al cliente dalla casella di posta
- Modifica di una prenotazione prima della conferma

## 6. App su App Store / Google Play (Capacitor)
**Costi**: Apple Developer 99 €/anno (per l'azienda serve D-U-N-S, gratis) · Google Play 25 $ una tantum.
Commissioni 15–30% solo su beni digitali; prenotazioni e cibo sono servizi fisici → Stripe/SumUp/Nexi (~1,5–3%).
Per iOS serve un Mac (o Codemagic/EAS in cloud). Google: account personali nuovi → test chiuso 12 tester × 14 giorni.
Apple rifiuta le app "sito impacchettato" (linea guida 4.2) → servono funzioni native (push, QR, fotocamera).

**Capacitor** (Ionic, gratis): impacchetta `dist/` di Vite in app iOS/Android native con WebView + plugin.
```
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Lido dei Pini" it.lidodeipini.app --web-dir dist
npx cap add ios && npx cap add android
npm run build && npx cap sync && npx cap open ios
```
- [ ] Build app con `VITE_BASE=./` e `VITE_ROUTER=hash`
- [ ] Push native: `@capacitor/push-notifications` + FCM (le push web VAPID non vanno in WebView iOS) → adattare Edge Function
- [ ] Tasto indietro Android con `@capacitor/app`
- [ ] Plugin utili: scanner QR ombrellone → menu/ordine, camera, geolocation (check-in), haptics/status-bar/splash
- [ ] Live update (Capgo ~14 €/mese o Capawesome) per aggiornare JS/HTML senza revisione store
- [ ] Solo app clienti pubblica; ComandApp/AdminApp via TestFlight/distribuzione unlisted e test interno Google (o PWA)
- [ ] Scheda store: icone, screenshot, privacy policy
- Stima: prototipo su telefono 1–2 giorni; più lunghe push native e scheda store.

### Download diretto (senza store)
- **Android**: APK scaricabile dal sito (utente abilita "installa app sconosciute", avviso di sicurezza; aggiornamenti
  da gestire con avviso in-app o live update). Dal 2026–27 Google richiede verifica sviluppatore anche fuori Play: da ricontrollare.
- **iPhone**: Web Distribution UE (DMA) solo con 2+ anni di account e >1 milione di installazioni/anno in UE → non fattibile.
  Alternative: TestFlight (link pubblico, build 90 gg, per test), Ad Hoc (100 dispositivi/anno), app *unlisted* sull'App Store
  (solo con link), Enterprise (299 $/anno, solo dipendenti, difficile).
- **PWA** = vero "download dal sito" su iPhone (Condividi → Aggiungi a Home): gratis, push, aggiornamenti immediati.
- [ ] Clienti: PWA con QR all'ingresso/ombrelloni (app store più avanti se serve)
- [ ] Staff Android: APK dal sito · Staff iPhone: app unlisted / Ad Hoc / PWA
