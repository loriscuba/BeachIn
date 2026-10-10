# Copione della prova generale — giro completo di BeachIn

Da fare **il giorno prima della demo**, sulla stessa rete Wi-Fi che avrai dal cliente.
Tempo: circa 45 minuti. Spunta ogni casella; se qualcosa non va, segnalo in `APPUNTI.md`.

Indirizzo base: https://loriscuba.github.io/BeachIn/ (le pagine sono `#/percorso`).

## 0. Preparazione (5 min)
- [ ] **Portatile** (gestionale) a schermo intero, zoom del browser al 100%.
- [ ] **Telefono A, "gestore"**: `#/adminapp` → login `admin` / `lido` → aggiunta alla Home → notifiche **consentite**.
- [ ] **Telefono B, "bagnante"**: `#/comandapp` → aggiunta alla Home → sezione Ombrellone, login `ombrellone12` / `lido`.
- [ ] Telefoni carichi, suoneria accesa, modalità "non disturbare" spenta.
- [ ] Gestionale → **Impostazioni → Moduli e piano → Suite completa** (tutti i moduli visibili).
- [ ] Gestionale → **Comande** → tocca **Attiva suoni**.
- [ ] Tieni aperte nel portatile due schede: gestionale e `#/sito/anteprima`.

## 1. Panoramica e Cruscotto (3 min)
- [ ] **Panoramica** (`#/`): meteo di oggi su Savona, coperti, richieste dal sito, prossimo evento, scorte basse.
- [ ] **Cruscotto completo**: KPI, grafico incassi 30 giorni, meteo dei prossimi giorni, occupazione per fila, scadenze, alert.

## 2. Ristorante: prenotazione dal sito → conferma (momento 1 della demo, 6 min)
- [ ] Nel sito pubblico: **Prenota un tavolo** → stasera, 2 persone, orario libero, nome del titolare → **Invia richiesta**.
- [ ] Il **telefono A** riceve la notifica push (prova anche a schermo bloccato).
- [ ] Nell'app admin: **Prenotazioni** → **Conferma** → gira il telefono in orizzontale → scegli il **tavolo consigliato**.
- [ ] Gestionale → **Ristorante → Prenotazioni**: la prenotazione c'è, con il tavolo.
- [ ] Nella scheda "In arrivo": **Accogli** (diventa verde), poi ↺ per annullare l'arrivo.
- [ ] Annulla una prenotazione (rossa) e poi **Recupera**.
- [ ] **Tavoli**: la pianta del giorno. **Gestione giorni**: chiudi un giorno e controlla che sul sito non sia più prenotabile, poi riaprilo.
- [ ] **Magazzino**: c'è almeno un prodotto sotto scorta (deve comparire anche in Panoramica).

## 3. Menù a voce (momento 2, 4 min)
- [ ] Telefono A → tab **Menu a voce** → di': «Togli il fritto misto e aggiungi la frittura di paranza a 16 euro nei secondi».
- [ ] Senti la conferma vocale; prova anche un cambio prezzo e un «leggi il menù».
- [ ] Apri `#/menu` (menù QR): le modifiche ci sono.
- [ ] Gestionale → **Ristorante → Menu**: stessa cosa.
- [ ] Piano B: scrivi il comando nel campo testo invece di parlare.
- [ ] Rimetti il menù com'era (a voce o dall'editor).

## 4. App del Lido (momento 3, 4 min)
- [ ] Telefono A → tab **App** → pubblica una news (con foto) e mettila **in evidenza**.
- [ ] Telefono B → **News**: compare con il pallino.
- [ ] Aggiungi una voce alla **Lavagna** (con prezzo e senza) e spostala nell'ordine.
- [ ] Telefono B: sezioni **Prenota**, **Eventi**, **Contatti** (telefono, WhatsApp, Maps, Facebook).
- [ ] Cancella la news di prova.

## 5. Comande dall'ombrellone (momento 4, 4 min)
- [ ] Telefono B → **Ombrellone** → ordina 2 caffè → **Ordina**.
- [ ] Il portatile (**Comande**) suona il campanello; la comanda riporta ombrellone 12.
- [ ] Avanza lo stato: presa in carico → in preparazione → pronta. Il telefono B si aggiorna a ogni passo.
- [ ] Componi una comanda dal gestionale e annullane una.
- [ ] Il QR della ComandApp nella pagina Comande si apre dal telefono.

## 6. Sito, recensioni e numeri (momento 5, 5 min)
- [ ] `#/sito/anteprima`: scorri tutto (hero, servizi, ristorante col menù vero, recensioni 4,4 / 234 / #34, eventi, galleria, contatti).
- [ ] Prenota un **evento** dal sito; nel gestionale **Sito → Panoramica / Prenotazioni** confermalo.
- [ ] **Sito → Posta**, **Contenuti** (nella Galleria carica una foto e poi rimuovila), **Recensioni e messaggi**.
- [ ] **Sito e marketing**: visite 2026 contro 2025, picco di Ferragosto, Tripadvisor.
- [ ] **App clienti**: c'è il QR dell'app.

## 7. Moduli "Suite completa" (5 min, da mostrare solo se c'è interesse)
- [ ] **Arenile**: pianta, clic su un ombrellone, assegna / sposta, conto bar della postazione.
- [ ] **Clienti**: scheda con presenze, saldo, postazione preferita.
- [ ] **Tariffe**: matrice prezzi e simulatore preventivo.
- [ ] **Bar**: Listino (giacenze) e Conti aperti.
- [ ] **Costi** (scadenze), **Conto economico** (margine per centro, break-even), **Personale** (turni, costo).
- [ ] **Eventi**: calendario, budget/ricavi, partecipanti.

## 8. Vendita a moduli (2 min)
- [ ] **Impostazioni → Moduli e piano** → piano **Ristorante & Web**: nel menù laterale compaiono i lucchetti.
- [ ] Clic su un modulo bloccato → pagina di presentazione del modulo.
- [ ] Rimetti **Suite completa** per la demo.

## 9. Riordino finale
- [ ] **Impostazioni → Ripristina dati demo** (non tocca menù e comande, che stanno su Supabase: quelle cancellale a mano), poi cancella news e foto di prova.
- [ ] Lascia aperte sul portatile solo le schede che servono, nell'ordine della demo.
- [ ] Annota qui sotto cosa non ha funzionato e il piano B scelto.

### Piani B rapidi
- **Niente rete**: hotspot del tuo telefono; in alternativa, mostra le richieste già presenti in Sito → Prenotazioni.
- **La notifica non arriva**: apri a mano l'app admin, la richiesta compare comunque.
- **Il microfono non capisce**: scrivi il comando.
- **Il campanello non suona**: tocca di nuovo "Attiva suoni" (il browser lo richiede dopo ogni ricarica).
