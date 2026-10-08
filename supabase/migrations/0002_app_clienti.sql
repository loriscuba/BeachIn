-- App clienti (/comandapp): news pubblicate dal gestore e lavagnetta del giorno.
-- Policy aperte ad anon come il resto dello schema demo.
create table if not exists beachin.notizie (
  id text primary key,
  titolo text not null,
  testo text not null default '',
  data text not null,
  ts bigint not null default 0,
  foto text,
  fissata boolean not null default false
);
create table if not exists beachin.lavagnetta (
  id text primary key,
  nome text not null,
  descrizione text,
  prezzo numeric,
  ordine int not null default 0
);
grant select, insert, update, delete on beachin.notizie, beachin.lavagnetta to anon, authenticated, service_role;
alter table beachin.notizie enable row level security;
alter table beachin.lavagnetta enable row level security;
drop policy if exists "demo anon" on beachin.notizie;
drop policy if exists "demo anon" on beachin.lavagnetta;
create policy "demo anon" on beachin.notizie for all to anon using (true) with check (true);
create policy "demo anon" on beachin.lavagnetta for all to anon using (true) with check (true);
do $$
declare t text;
begin
  foreach t in array array['notizie','lavagnetta'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = t) then
      execute format('alter publication supabase_realtime add table beachin.%I', t);
    end if;
  end loop;
end $$;
