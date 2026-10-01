-- BeachIn · tabelle Supabase per ComandApp (comande) e menu del ristorante (assistente vocale / editor menu).
-- Tutto nello schema dedicato `beachin` (progetto Supabase condiviso tra più demo).
-- 1) Eseguire una volta in Supabase → SQL Editor (idempotente).
-- 2) Esporre lo schema all'API: Project Settings → Data API (API settings) → "Exposed schemas" → aggiungere `beachin`.
-- ATTENZIONE: policy aperte al ruolo anon = chiunque abbia la chiave pubblica può leggere/scrivere.
-- Va bene per la demo; in produzione servono Supabase Auth e policy per ruolo (bagnante/bar/gestore).

create schema if not exists beachin;
grant usage on schema beachin to anon, authenticated, service_role;
alter default privileges in schema beachin grant select, insert, update, delete on tables to anon, authenticated, service_role;

create table if not exists beachin.comande (
  id text primary key,
  ombrellone text not null,
  righe jsonb not null default '[]',
  totale numeric(10,2) not null default 0,
  stato text not null default 'in_attesa' check (stato in ('in_attesa','presa_in_carico','in_preparazione','pronta')),
  ora text not null,
  note text,
  origine text check (origine in ('app','bar')),
  cliente text,
  ts bigint not null default (extract(epoch from now()) * 1000)::bigint,
  creata_il timestamptz not null default now()
);

create table if not exists beachin.menu_sezioni (
  id text primary key,
  nome text not null,
  traduzioni jsonb,
  ordine int not null default 0
);

create table if not exists beachin.menu_piatti (
  id text primary key,
  nome text not null,
  categoria text not null,
  prezzo numeric(10,2) not null default 0,
  food_cost numeric(10,2) not null default 0,
  allergeni jsonb not null default '[]',
  venduti_stagione int not null default 0,
  traduzioni jsonb,
  foto text,
  ordine int not null default 0
);

grant select, insert, update, delete on all tables in schema beachin to anon, authenticated, service_role;

-- RLS: accesso demo per anon
alter table beachin.comande enable row level security;
alter table beachin.menu_sezioni enable row level security;
alter table beachin.menu_piatti enable row level security;
drop policy if exists "demo anon" on beachin.comande;
drop policy if exists "demo anon" on beachin.menu_sezioni;
drop policy if exists "demo anon" on beachin.menu_piatti;
create policy "demo anon" on beachin.comande for all to anon using (true) with check (true);
create policy "demo anon" on beachin.menu_sezioni for all to anon using (true) with check (true);
create policy "demo anon" on beachin.menu_piatti for all to anon using (true) with check (true);

-- Realtime (aggiornamenti dal vivo tra bagnante, bar e gestionale)
do $$
declare t text;
begin
  foreach t in array array['comande','menu_sezioni','menu_piatti'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = t) then
      execute format('alter publication supabase_realtime add table beachin.%I', t);
    end if;
  end loop;
end $$;

-- Richieste tavolo dal sito (confermate/rifiutate dall'app admin `/adminapp`)
create table if not exists beachin.richieste_ristorante (
  id text primary key,
  ricevuta_il text not null,
  nome text not null,
  email text not null default '',
  telefono text not null default '',
  data text not null,
  turno text not null check (turno in ('pranzo','cena')),
  coperti int not null default 2,
  stato text not null default 'da_confermare' check (stato in ('da_confermare','confermata','rifiutata')),
  note text,
  ts bigint not null default (extract(epoch from now()) * 1000)::bigint
);
grant select, insert, update, delete on beachin.richieste_ristorante to anon, authenticated, service_role;
alter table beachin.richieste_ristorante enable row level security;
drop policy if exists "demo anon" on beachin.richieste_ristorante;
create policy "demo anon" on beachin.richieste_ristorante for all to anon using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='beachin' and tablename='richieste_ristorante') then
    alter publication supabase_realtime add table beachin.richieste_ristorante;
  end if;
end $$;

-- Notifiche push app admin (vedi supabase/functions/beachin-push). La chiave privata VAPID va nel Vault:
--   select vault.create_secret('<chiave privata VAPID>', 'beachin_vapid_private');
create extension if not exists pg_net with schema extensions;
create table if not exists beachin.push_iscrizioni (
  endpoint text primary key, p256dh text not null, auth text not null, url text,
  creata_il timestamptz not null default now()
);
alter table beachin.push_iscrizioni enable row level security;
revoke all on beachin.push_iscrizioni from anon, authenticated;
create or replace function beachin.registra_push(p_endpoint text, p_p256dh text, p_auth text, p_url text)
returns void language sql security definer set search_path = '' as $$
  insert into beachin.push_iscrizioni (endpoint, p256dh, auth, url) values (p_endpoint, p_p256dh, p_auth, p_url)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, url = excluded.url;
$$;
revoke all on function beachin.registra_push(text, text, text, text) from public;
grant execute on function beachin.registra_push(text, text, text, text) to anon, authenticated;
create or replace function beachin.notifica_nuova_richiesta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://exchjppslwhbnbzuhfqs.supabase.co/functions/v1/beachin-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <chiave anon>'),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end $$;
drop trigger if exists notifica_nuova_richiesta on beachin.richieste_ristorante;
create trigger notifica_nuova_richiesta after insert on beachin.richieste_ristorante
  for each row when (new.stato = 'da_confermare') execute function beachin.notifica_nuova_richiesta();

-- Giorni di chiusura del ristorante (segnati da Prenotazioni / app admin, letti dal sito pubblico)
create table if not exists beachin.giorni_chiusi (
  id text primary key,          -- = data ISO (yyyy-mm-dd)
  data text not null,
  nota text
);
grant select, insert, update, delete on beachin.giorni_chiusi to anon, authenticated, service_role;
alter table beachin.giorni_chiusi enable row level security;
drop policy if exists "demo anon" on beachin.giorni_chiusi;
create policy "demo anon" on beachin.giorni_chiusi for all to anon using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='beachin' and tablename='giorni_chiusi') then
    alter publication supabase_realtime add table beachin.giorni_chiusi;
  end if;
end $$;

-- Sala del ristorante: disposizione standard, disposizioni per giorno e prenotazioni (condivise tra gestionale, app admin e sito)
create table if not exists beachin.tavoli (
  id text primary key,
  numero int not null,
  posti int not null default 2,
  zona text not null,
  x numeric, y numeric,
  forma text,
  ordine int not null default 0
);
create table if not exists beachin.tavoli_giorno (
  id text primary key,          -- = data ISO
  tavoli jsonb not null default '[]'
);
create table if not exists beachin.prenotazioni_ristorante (
  id text primary key,
  data text not null,
  turno text not null check (turno in ('pranzo','cena')),
  ora text,
  nome text not null,
  coperti int not null default 2,
  tavolo_id text,
  stato text not null default 'confermata' check (stato in ('confermata','in_attesa','annullata','arrivata')),
  note text,
  telefono text,
  origine text check (origine in ('manuale','sito'))
);
alter table beachin.prenotazioni_ristorante add column if not exists ora text;
do $$
declare t text;
begin
  foreach t in array array['tavoli','tavoli_giorno','prenotazioni_ristorante'] loop
    execute format('grant select, insert, update, delete on beachin.%I to anon, authenticated, service_role', t);
    execute format('alter table beachin.%I enable row level security', t);
    execute format('drop policy if exists "demo anon" on beachin.%I', t);
    execute format('create policy "demo anon" on beachin.%I for all to anon using (true) with check (true)', t);
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='beachin' and tablename=t) then
      execute format('alter publication supabase_realtime add table beachin.%I', t);
    end if;
  end loop;
end $$;

-- Listino bar condiviso (gestionale Bar → Listino, ComandApp, Comande) + conto per ombrellone dalle comande
alter table beachin.comande add column if not exists pagata boolean not null default false;

create table if not exists beachin.bar_sezioni (
  id text primary key,
  nome text not null,
  ordine int not null default 0
);

create table if not exists beachin.articoli_bar (
  id text primary key,
  nome text not null,
  categoria text not null,
  prezzo_vendita numeric(10,2) not null default 0,
  costo_acquisto numeric(10,2) not null default 0,
  giacenza int not null default 0,
  soglia_riordino int not null default 0,
  unita text not null default 'pz',
  disponibile boolean not null default true,
  ordine int not null default 0
);

grant select, insert, update, delete on beachin.bar_sezioni, beachin.articoli_bar to anon, authenticated, service_role;
alter table beachin.bar_sezioni enable row level security;
alter table beachin.articoli_bar enable row level security;
drop policy if exists "demo anon" on beachin.bar_sezioni;
drop policy if exists "demo anon" on beachin.articoli_bar;
create policy "demo anon" on beachin.bar_sezioni for all to anon using (true) with check (true);
create policy "demo anon" on beachin.articoli_bar for all to anon using (true) with check (true);

do $$
declare t text;
begin
  foreach t in array array['bar_sezioni','articoli_bar'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = t) then
      execute format('alter publication supabase_realtime add table beachin.%I', t);
    end if;
  end loop;
end $$;
