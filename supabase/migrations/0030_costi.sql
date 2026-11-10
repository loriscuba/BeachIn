-- Costi sul database (nov 2026): prima le voci di costo erano solo dati fissi dell'app. Ora stanno in beachin.costi e
-- la pagina Costi può importare le fatture dei fornitori (PDF o XML): ogni fattura diventa una voce per categoria,
-- con le righe della fattura dentro `dati.fattura`. Al primo avvio con tabella vuota l'app inserisce le voci di esempio.
-- Dati economici: niente accesso anon, solo lo staff col permesso Costi.
create table if not exists beachin.costi (
  id text primary key,
  data text not null,
  categoria text not null,
  fornitore text not null default '',
  -- resto della voce (sottocategoria, imponibile, iva, centro, stato, scadenza, metodo, fattura importata)
  dati jsonb not null default '{}'::jsonb
);

grant select, insert, update, delete on beachin.costi to authenticated, service_role;
revoke all on beachin.costi from anon;
alter table beachin.costi enable row level security;
drop policy if exists "costi lettura" on beachin.costi;
create policy "costi lettura" on beachin.costi for select to authenticated using (beachin.ha_permesso('costi', 1));
drop policy if exists "costi modifica" on beachin.costi;
create policy "costi modifica" on beachin.costi for all to authenticated
  using (beachin.ha_permesso('costi', 2)) with check (beachin.ha_permesso('costi', 2));
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = 'costi') then
    alter publication supabase_realtime add table beachin.costi;
  end if;
end $$;
