# BeachIn — Sistema di design

> Riferimento visivo: **lo stabilimento vero**. Cabine dipinte, tele degli
> ombrelloni, boe, segnaletica di salvataggio. Non "app fintech con accento
> arancione".

Regola guida riletta e applicata: **l'audacia sta in un punto solo — la pianta
dell'arenile** (Fase 3). Tutto il resto (tabelle, form, grafici) è sobrio,
denso e ordinato. I **numeri** sono la cosa più leggibile della pagina.

---

## 1. Colore

La palette nasce dai materiali dello stabilimento, non da una dashboard
generica.

| Ruolo | Nome | HEX | Uso |
| --- | --- | --- | --- |
| Blu profondo | `profondo` | `#0F3B4C` | Testi principali, navigazione, bottone primario |
| Azzurro cabina | `cabina` | `#2E7D9A` | Accento istituzionale, icone, dettagli |
| Verde acqua bassa | `acqua` | `#7FB7A8` | Conferme, elementi positivi leggeri |
| Sfondo calce fredda | `calce` | `#EDF1F2` | Sfondo dell'app |
| Giallo tenda | `tenda` | `#F2C14E` | Evidenza puntuale, badge "demo", brand |
| Rosso boa | `boa` | `#E4572E` | Allerta, azioni distruttive, stato "occupata" |

Bianco carta `#FBFCFC` per le card. Bordi in `calce-200 #DCE4E6`.

### Colori di stato postazione

Derivati dalla palette, **leggibili in pieno sole** (saturazione alta, mai
pastelli slavati). Definiti anche come variabili CSS (`--stato-*`) per l'uso
inline nella pianta.

| Stato | HEX | Deriva da |
| --- | --- | --- |
| Libera | `#5FA891` | verde acqua, più saturo |
| Occupata | `#E4572E` | rosso boa |
| Prenotata | `#F2C14E` | giallo tenda |
| Stagionale | `#2E7D9A` | azzurro cabina |
| Fuori servizio | `#9AA7AB` | grigio spento |

Lo stato non è affidato **solo** al colore: nella pianta ogni postazione porta
anche etichetta/forma, così resta leggibile anche sotto il sole e per chi non
distingue bene i colori.

## 2. Tipografia

Una sola famiglia — **Inter** — con pesi 400/500/600/700/800. Fallback di
sistema.

- **Numeri tabellari ovunque compaiano importi o quantità** (`.num`,
  `font-variant-numeric: tabular-nums`). Gli importi sono l'informazione che
  qualcuno controllerà: devono incolonnarsi e non ballare.
- Scala tipografica compatta: `text-xs` (11–12) per etichette, `text-sm` (14)
  per il corpo, `text-lg` (18) per i titoli di pagina, KPI grandi su misura.
- Niente **maiuscolo tracciato** come stile diffuso: solo micro-etichette di
  sezione, brevi, in `uppercase tracking-wide` tenue.

## 3. Spaziatura e forma

- Griglia base **4px**. Padding delle card `16px` (`p-4`).
- Raggi: `rounded-lg` (10px) per controlli, `rounded-card` (14px) per le card,
  pieno (`rounded-full`) per badge e pallini di stato.
- **Una sola ombra**, tenue e fredda (`shadow-card`), condivisa da tutte le
  card. Niente card identiche con ombre diverse sparse a caso; niente
  gradienti decorativi.
- Densità: preferire tabelle e liste compatte a card ariose. Lo stabilimento
  gestisce centinaia di postazioni e voci: lo spazio serve ai dati.

## 4. Componenti base

Costruiti a mano (nessun UI kit): `Button`, `Card` (+ `CardHeader`,
`CardBody`), `Badge`, `PaginaSegnaposto`. In arrivo nelle fasi successive:
`Table`, `Modal`, `Drawer`, `Tabs`, `Select`, `DateRange`.

- **Button** — varianti `primario` (blu profondo pieno), `secondario` (bianco,
  bordo), `fantasma`, `pericolo` (rosso boa). Tre dimensioni.
- **Badge** — toni derivati dalla palette; opzione con pallino di stato.
- **Card** — contenitore neutro, un'unica ombra, intestazione con titolo +
  eventuale azione.

## 5. Movimento

Il movimento **serve solo a mostrare che qualcosa è cambiato**: assegnazione di
una postazione, apertura del pannello, conferma di un incasso (`anim-pop`).
Nessuna animazione di ingresso su ogni sezione. Rispetta
`prefers-reduced-motion`.

## 6. Voce dell'interfaccia

- Tutto in **italiano**, tono diretto. Verbi che dicono cosa succede:
  "Assegna postazione", "Incassa", "Pubblica listino".
- Stati vuoti che **indicano cosa fare**, non messaggi di scusa.
- Valuta EUR, formato `it-IT`, date `gg/mm/aaaa`. Un solo punto di
  formattazione: `src/lib/formatters.ts`.

## 7. Layout

- **AppShell**: sidebar scura fissa (blu profondo) a sinistra, topbar chiara
  sticky con titolo di pagina, data simulata della demo e badge **"Dati
  dimostrativi"** sempre visibile. Contenuto centrato, max `1400px`.
- **Responsive**: la sidebar diventa un drawer sotto `lg`; la topbar mostra il
  pulsante menu. Deve essere presentabile da tablet e da telefono (demo in
  piedi, in spiaggia).

## 8. Cose da evitare (checklist)

- ❌ Etichette tutte maiuscole tracciate ovunque
- ❌ Card identiche con la stessa ombra grigia sparsa
- ❌ Gradienti decorativi e animazioni d'ingresso su ogni sezione
- ❌ Frecce "→" dentro i pulsanti
- ❌ Accento arancione "fintech" come cifra dominante
- ✅ Audacia concentrata sulla pianta dell'arenile
- ✅ Numeri tabellari, densità, sobrietà
