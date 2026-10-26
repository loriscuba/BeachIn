# Logo del mittente nelle email (al posto della "L" in Gmail)

Oggi le mail partono da `loriscuba@12251980.brevosend.com`: un dominio **condiviso** di Brevo. Gmail mostra il logo
del mittente solo se il dominio è **tuo** e autenticato, quindi con l'indirizzo attuale la "L" resta.
Non è una cosa che si risolve nel codice: serve un dominio e qualche record DNS.

Logo già pronto (formato BIMI "SVG Tiny PS", quadrato, fondo blu, logo bianco): `public/bimi/logo.svg`,
pubblicato su https://beachin.pages.dev/bimi/logo.svg dopo il merge.

## Passo 1 — Dominio proprio (obbligatorio per tutte le strade)
1. Usa/compra un dominio (es. `lidodeipini.it`, ~10 €/anno su Aruba, Register, Cloudflare…).
2. Brevo → **Impostazioni → Mittenti, domini e IP dedicati → Domini → Aggiungi un dominio**.
   Scegli l'autenticazione manuale: Brevo mostra i record esatti da copiare nel DNS del dominio, di solito:

   | Tipo  | Nome                    | Valore                                   |
   |-------|-------------------------|------------------------------------------|
   | TXT   | `@`                     | `brevo-code:xxxxxxxx` (dato da Brevo)    |
   | CNAME | `brevo1._domainkey`     | `b1.<dominio>.dkim.brevo.com` (dato da Brevo) |
   | CNAME | `brevo2._domainkey`     | `b2.<dominio>.dkim.brevo.com` (dato da Brevo) |
   | TXT   | `_dmarc`                | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

   (Usa i valori che ti dà Brevo: quelli in tabella sono solo l'esempio della forma.)
3. Brevo → **Mittenti** → aggiungi `prenotazioni@<dominio>` (nome "Lido dei Pini").
4. Cambiare il segreto `beachin_email_mittente` nel Vault con il nuovo indirizzo (lo fa Claude sul Demo).

Già solo così le mail risultano "da Lido dei Pini <prenotazioni@…>", senza "brevosend" e con meno rischio spam.

## Passo 2a — Strada economica: profilo Google sull'indirizzo
Crea un account Google con l'indirizzo `prenotazioni@<dominio>` ("Usa il mio indirizzo email attuale" in fase di
registrazione) e metti il logo come foto profilo. Gmail spesso mostra quella foto ai destinatari. Gratis, non garantito.

## Passo 2b — Strada ufficiale: BIMI (logo garantito in Gmail, Apple Mail, Yahoo)
1. Dopo 2-3 settimane con DMARC `p=none` senza errori, rendere DMARC più severo:
   `_dmarc` TXT → `v=DMARC1; p=quarantine; pct=100; rua=mailto:rua@dmarc.brevo.com`
2. Certificato del logo (Gmail lo richiede):
   - **VMC**: serve il marchio registrato (UIBM/EUIPO). ~1.000-1.500 €/anno (DigiCert, Sectigo).
   - **CMC**: niente marchio, basta che il logo sia usato pubblicamente da almeno 12 mesi. Prezzo simile.
   Al certificatore si dà `public/bimi/logo.svg`; lui rilascia un file `.pem` da pubblicare via https.
3. Record BIMI:
   `default._bimi` TXT → `v=BIMI1; l=https://beachin.pages.dev/bimi/logo.svg; a=https://<dominio>/bimi/certificato.pem`

Senza certificato (`a=` vuoto) il logo compare solo su Yahoo/AOL, non su Gmail.
