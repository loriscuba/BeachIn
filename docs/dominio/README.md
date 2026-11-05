# Collegare lidodeipini.it a Cloudflare Pages

Una sola app (il progetto Pages **beachin**) risponde su più indirizzi. Cosa si apre dipende dall'indirizzo:

| Indirizzo | Cosa apre |
|---|---|
| `https://lidodeipini.it/` (e `www.`) | **Sito pubblico per i clienti** sulla radice. I vecchi link `/sito/anteprima?...` diventano `/?...`. Le pagine dello staff qui non ci sono: tornano al sito. |
| `https://app.lidodeipini.it/` | **App clienti** (ComandApp), più menu, QR dei tavoli, inviti e modifica prenotazione. |
| `https://gestione.lidodeipini.it/` | **Gestionale staff**, identico a oggi. |
| `https://beachin.pages.dev/` | Invariato: tutto come prima (comodo per le prove). |

I nomi dei domini sono in `src/config/domini.ts`: se ne scegli altri (es. `staff.` invece di `gestione.`) basta cambiarli lì.
I QR e i link generati dalle app, quando si lavora su un dominio del lido, puntano a `app.lidodeipini.it` (clienti)
o a `gestione.lidodeipini.it` (staff).

---

## 1. Comprare il dominio

Cloudflare non vende i domini `.it`: compralo su un registrar italiano (Register.it, Aruba, OVH… circa 10-15 € l'anno).
Non serve nessun pacchetto hosting né email: basta il **solo dominio**.

## 2. Spostare il DNS su Cloudflare (gratis)

Serve perché la radice `lidodeipini.it` (senza `www`) funzioni su Pages.

1. Entra su https://dash.cloudflare.com → **Add a domain** (Aggiungi un dominio) → scrivi `lidodeipini.it` → piano **Free**.
2. Cloudflare mostra **due nameserver** (tipo `xxx.ns.cloudflare.com`). Copiali.
3. Nel pannello del registrar, alla voce **DNS / Nameserver** del dominio, sostituisci i nameserver con quei due.
   (Su Aruba: Pannello → Gestione domini → Modifica DNS/nameserver. Su Register.it: Dominio → DNS e nameserver.)
4. Aspetta la mail di Cloudflare "dominio attivo" (di solito pochi minuti, al massimo 24 ore).

Se sul registrar avevi già una casella email col dominio, controlla in Cloudflare → **DNS** che i record **MX** siano stati copiati.

## 3. Aggiungere i domini al progetto Pages

1. Cloudflare → **Workers & Pages** → progetto **beachin** → scheda **Custom domains** → **Set up a custom domain**.
2. Aggiungi uno alla volta, confermando ogni volta (Cloudflare crea da solo il record DNS):
   - `lidodeipini.it`
   - `www.lidodeipini.it`
   - `app.lidodeipini.it`
   - `gestione.lidodeipini.it`
3. Attendi lo stato **Active** su ognuno (il certificato HTTPS arriva in automatico, qualche minuto).

Facoltativo: per avere un solo indirizzo del sito, Cloudflare → `lidodeipini.it` → **Rules → Redirect Rules** →
modello "Redirect from WWW to root". Anche senza, `www.` apre già il sito.

## 4. Supabase (login staff e link nelle mail)

1. **Login staff**: Supabase → progetto → **Authentication → URL Configuration** → in **Redirect URLs** aggiungi
   `https://gestione.lidodeipini.it/**` (e se vuoi `https://app.lidodeipini.it/**`).
2. **Link nelle mail** (invito, modifica prenotazione, "Visita il nostro sito"): nell'editor SQL di Supabase incolla

   ```sql
   -- se il segreto esiste già lo aggiorna, altrimenti lo crea
   do $$
   declare v uuid := (select id from vault.secrets where name = 'beachin_app_url');
   begin
     if v is null then perform vault.create_secret('https://lidodeipini.it/', 'beachin_app_url');
     else perform vault.update_secret(v, 'https://lidodeipini.it/');
     end if;
   end $$;
  ```

   Le pagine `/invito` e `/prenotazione` funzionano anche sul dominio del sito, e "Visita il nostro sito" apre la radice.
   In produzione questo valore lo scrive il workflow **Deploy**: va aggiornato anche lì quando si passa in produzione.

## 5. Dopo il cambio

- **Notifiche push**: sono legate all'indirizzo. Lo staff, aprendo `gestione.lidodeipini.it`, rifà "Attiva notifiche"
  dal profilo; i clienti installano l'app da `app.lidodeipini.it`. Le app già installate da `beachin.pages.dev` continuano a funzionare.
- **Icona sul telefono**: chi vuole l'app col nuovo indirizzo la reinstalla da quello nuovo (Condividi → Aggiungi a Home).
- **Google Maps (pulsante Prenota)**: aggiorna il link in `https://lidodeipini.it/?sez=tavolo` (o `?sez=ombrellone`).
- **QR già stampati**: quelli vecchi (beachin.pages.dev) restano validi. I nuovi, stampati dal gestionale su
  `gestione.lidodeipini.it`, puntano ad `app.lidodeipini.it`.

## 6. Prova finale

1. `https://lidodeipini.it` → si vede il sito del lido.
2. `https://lidodeipini.it/?sez=tavolo` → si apre il modulo di prenotazione tavolo.
3. `https://app.lidodeipini.it` → app clienti.
4. `https://gestione.lidodeipini.it` → login staff.
5. `https://beachin.pages.dev` → tutto come prima.
