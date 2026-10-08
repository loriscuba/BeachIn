-- Impostazioni dello stabilimento modificabili dall'amministratore (anagrafica, orari, aliquote, servizi…).
-- Una riga per insieme di parametri: id='stabilimento', valori jsonb piatto "chiave.annidata" → valore.
create table if not exists beachin.impostazioni (
  id text primary key,
  valori jsonb not null default '{}'::jsonb,
  aggiornato timestamptz not null default now()
);
grant select, insert, update, delete on beachin.impostazioni to anon, authenticated, service_role;
alter table beachin.impostazioni enable row level security;
drop policy if exists "demo anon" on beachin.impostazioni;
create policy "demo anon" on beachin.impostazioni for all to anon using (true) with check (true);
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = 'impostazioni') then
    alter publication supabase_realtime add table beachin.impostazioni;
  end if;
end $$;
