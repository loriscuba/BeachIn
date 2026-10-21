-- Inviti agli eventi con QR: codice univoco per prenotazione (nella mail di conferma) e ingressi registrati dall'app admin.
alter table beachin.richieste_eventi add column if not exists codice text;
alter table beachin.richieste_eventi add column if not exists arrivati int not null default 0;
alter table beachin.richieste_eventi add column if not exists arrivo_ts bigint;

-- Le righe esistenti (e quelle inserite senza codice) ricevono un codice di 8 caratteri senza simboli ambigui.
create or replace function beachin.nuovo_codice_invito() returns text language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 8);
$$;
update beachin.richieste_eventi set codice = beachin.nuovo_codice_invito() where codice is null;
alter table beachin.richieste_eventi alter column codice set default beachin.nuovo_codice_invito();
create unique index if not exists richieste_eventi_codice on beachin.richieste_eventi (codice);
