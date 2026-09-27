-- BeachIn · tabelle Supabase per ComandApp (comande) e menu del ristorante (assistente vocale / editor menu).
-- Da eseguire una volta in Supabase → SQL Editor. Idempotente.
-- ATTENZIONE: policy aperte al ruolo anon = chiunque abbia la chiave pubblica può leggere/scrivere.
-- Va bene per la demo; in produzione servono Supabase Auth e policy per ruolo (bagnante/bar/gestore).

create table if not exists public.comande (
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

create table if not exists public.menu_sezioni (
  id text primary key,
  nome text not null,
  traduzioni jsonb,
  ordine int not null default 0
);

create table if not exists public.menu_piatti (
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

-- RLS: accesso demo per anon
alter table public.comande enable row level security;
alter table public.menu_sezioni enable row level security;
alter table public.menu_piatti enable row level security;
drop policy if exists "demo anon" on public.comande;
drop policy if exists "demo anon" on public.menu_sezioni;
drop policy if exists "demo anon" on public.menu_piatti;
create policy "demo anon" on public.comande for all to anon using (true) with check (true);
create policy "demo anon" on public.menu_sezioni for all to anon using (true) with check (true);
create policy "demo anon" on public.menu_piatti for all to anon using (true) with check (true);

-- Realtime (aggiornamenti dal vivo tra bagnante, bar e gestionale)
do $$
declare t text;
begin
  foreach t in array array['comande','menu_sezioni','menu_piatti'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
