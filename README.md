# BeachIn

Cruscotto gestionale per uno stabilimento balneare — **demo commerciale**.
Nessun database, nessun backend, nessuna autenticazione: tutti i dati sono
statici e mockati in TypeScript, ma strutturati come se arrivassero da un'API.

> ⚠️ **Dati dimostrativi.** Le modifiche fatte durante la demo restano in
> memoria e al refresh tornano allo stato iniziale.

## Avvio

```bash
npm install
npm run dev
```

L'app parte su http://localhost:5173. Serve solo Node 18+.

Altri comandi:

- `npm run build` — type-check e build di produzione
- `npm run preview` — anteprima della build

## Stack

React 18 · Vite · TypeScript · Tailwind CSS · react-router-dom · Recharts ·
lucide-react · date-fns (locale `it`). Interfaccia e dati **in italiano**,
valuta EUR, formato `it-IT`.

## Dove cambiare i dati prima della demo

- `src/data/config.ts` — parametri dello stabilimento in un solo file: nome,
  località, stagione, file e postazioni dell'arenile, orari, aliquote, numeri
  di scala. **Parti da qui.**
- `src/data/seed/*` — dati statici per dominio *(in arrivo nella Fase 2)*.

Il sistema di design è documentato in [`DESIGN.md`](./DESIGN.md).

## Stato di avanzamento

Il progetto procede per fasi (vedi il prompt). Ogni pagina raggiungibile mostra,
finché non è riempita, cosa conterrà e in quale fase.

- [x] **Fase 1** — Setup, design system, `DESIGN.md`, AppShell con navigazione
      e tutte le pagine raggiungibili
- [x] **Fase 2** — Tipi, seed completi, `api.ts` e context delle mutazioni. Serie
      giornaliera deterministica come fonte di verità: i totali riconciliano tra
      le pagine (bar, ristorante e coperti tornano al centesimo)
- [x] **Fase 3** — Arenile con pianta interattiva (vista dall'alto, ombrelloni a
      spicchi, passerelle, cabine, torrette), pannello postazione con azioni
      (assegna, libera, sposta, fuori servizio, incassa) e filtri
- [x] **Fase 4** — Cruscotto con KPI della giornata, grafico incassi per centro,
      occupazione per fila, mix ricavi, meteo a 4 giorni, scadenze e alert operativi
- [x] **Fase 5** — Tariffe (matrice editabile + simulatore preventivo + accessorie),
      Clienti (elenco, scheda, storici), Bar (vendite, listino, giacenze, conti
      aperti) e Ristorante (prenotazioni, tavoli, menù con food cost e margini)
- [x] **Fase 6** — Costi (elenco completo filtrabile, sintesi fissi/variabili,
      incidenza per categoria, calendario scadenze, form nuovo costo) e Conto
      economico (per centro, margine di contribuzione, break-even, indicatori,
      vista stagionale e mensile)
- [x] **Fase 7** — Personale (organico, costo per ruolo, ore lavorate vs
      contratto, griglia turni settimanali) ed Eventi (calendario di stagione e
      scheda evento con budget, costi, ricavi e margine)
- [ ] Fase 8 — Sito e anteprima pubblica
- [ ] Fase 9 — Rifinitura: responsive, stati di caricamento e vuoti, coerenza
      dei numeri
