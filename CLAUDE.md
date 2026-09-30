# BeachIn — nota di progetto per Claude

App demo di gestione commerciale per uno **stabilimento balneare** italiano (cliente reale: **Lido dei Pini**, Savona).
Tutto in italiano. Dati finti ma strutturati come una vera API, numeri riconciliati tra le pagine.
BeachIn è l'**aggregatore di moduli**.

**Dettagli per modulo** (context, azioni, tabelle, flussi): `docs/DETTAGLI.md` — leggere solo la sezione che serve.

## Regole di lavoro
- Branch principale **`main`**: ogni push/merge fa partire il deploy.
- **Appunti**: `APPUNTI.md` in radice. Leggerlo a inizio sessione. Quando l'utente chiede di "appuntare"/"segnare"
  qualcosa, aggiungerlo lì nella sezione giusta (checklist `[ ]`, spuntare `[x]` quando fatto).
- Quando cambia un modulo, aggiornare la sua sezione in `docs/DETTAGLI.md` (non gonfiare questo file).
- **Risparmio token**: build/typecheck di norma bastano; screenshot solo se richiesti; non rileggere l'artifact
  pubblicato (è enorme); aprire solo la parte di file che serve.
- **Supabase in autonomia**: Claude può eseguire da solo, senza chiedere conferma, le operazioni sul DB via connettore
  MCP Supabase (insert, update, delete, select, migration, deploy Edge Function) sul progetto **Demo IPA**
  (`exchjppslwhbnbzuhfqs`), **solo nello schema `beachin`** (il progetto è condiviso con altre demo: non toccare altri
  schemi). Poi riportare nel repo lo schema cambiato (`supabase/schema.sql`, `supabase/functions/`) e dirlo all'utente.
  Segreti (VAPID privata, `GROQ_API_KEY`) mai nel repo.

## Deploy e anteprima
- **GitHub Pages** — https://loriscuba.github.io/BeachIn/ (`.github/workflows/pages.yml`, `VITE_BASE=/BeachIn/` + HashRouter).
- **Vercel** — anteprima per branch (BrowserRouter, `vercel.json` con rewrite SPA).
- **Artifact** — https://claude.ai/artifact/PqRRUL2ws33iz2m9qn99nV (ripubblicare sullo stesso URL;
  procedura single-file in `docs/DETTAGLI.md` → "Anteprima single-file").

## Stack
React 18 + Vite + TypeScript + Tailwind + react-router-dom (HashRouter con `VITE_ROUTER=hash`) + Recharts +
lucide-react + date-fns (locale it). `noUnusedLocals` ON: rimuovi import/variabili inutilizzati o il build fallisce.

## Mappa rapida
- Store unico: `src/context/DemoDataContext.tsx` (azioni stabili con useCallback, stato fresco via ref, `nuovoId(p)`).
  Moduli attivi: `src/context/ModuliContext.tsx` + `src/config/moduli.ts`.
- Dati: `src/data/types.ts` (tipi), `src/data/seed/*` (dati iniziali), `src/data/api.ts` (getter read-only async).
- Pagine: `src/pages` (Ristorante con sottocartella `ristorante/`; pagine pubbliche fuori dallo shell:
  `SitoAnteprima`, `MenuPubblico` `/menu`, `ComandApp` `/comandapp`, `AdminApp` `/adminapp`).
- Supabase: `src/lib/supabase.ts`, hook `src/hooks/useSyncSupabase.ts`, schema `supabase/schema.sql`,
  funzioni `supabase/functions/`. Senza env `VITE_SUPABASE_*` tutto funziona in locale.
- Config cliente: `src/config.ts`.
- Palette: NAVY `#0F3B4C`, CABINA `#2E7D9A`, ACQUA `#7FB7A8`, TENDA `#F2C14E`, BOA `#E4572E`, CALCE `#EDF1F2`
  (classi `profondo/cabina/acqua/tenda/boa/calce`).
