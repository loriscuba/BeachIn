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

---

## 5. Idee / sviluppi futuri
- Risposte dell'admin al cliente dalla casella di posta
- Modifica di una prenotazione prima della conferma
