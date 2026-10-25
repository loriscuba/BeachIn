-- QR fissi per tavolo (ott 2026): il cliente ordina dal telefono solo se il cameriere ha aperto il tavolo.
-- Una riga per numero di tavolo (id = numero): codice del QR (non indovinabile), menu del tavolo, aperto/chiuso.
create table if not exists beachin.tavoli_qr (
  id text primary key,
  numero int not null unique,
  codice text not null unique,
  menu text not null default 'ristorante' check (menu in ('ristorante','bar','lavagnetta')),
  aperto boolean not null default false
);
grant select, insert, update, delete on beachin.tavoli_qr to anon, authenticated, service_role;
alter table beachin.tavoli_qr enable row level security;
drop policy if exists "demo anon" on beachin.tavoli_qr;
create policy "demo anon" on beachin.tavoli_qr for all to anon using (true) with check (true);
drop policy if exists "staff lettura" on beachin.tavoli_qr;
drop policy if exists "staff modifica" on beachin.tavoli_qr;
create policy "staff lettura" on beachin.tavoli_qr for select to authenticated using (beachin.ha_permesso('sala', 1));
create policy "staff modifica" on beachin.tavoli_qr for all to authenticated
  using (beachin.ha_permesso('sala', 2)) with check (beachin.ha_permesso('sala', 2));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = 'tavoli_qr') then
    alter publication supabase_realtime add table beachin.tavoli_qr;
  end if;
end $$;

-- comande ordinate dal telefono col QR
alter table beachin.comande_sala drop constraint if exists comande_sala_origine_check;
alter table beachin.comande_sala add constraint comande_sala_origine_check check (origine in ('cameriere','self','qr'));
