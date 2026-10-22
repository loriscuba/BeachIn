-- Utenti e ruoli del gestionale (RBAC) con Supabase Auth.
-- - beachin.ruoli: permessi per sezione, livello 0 = nessuno, 1 = lettura, 2 = modifica. `amministratore` = tutto.
-- - beachin.utenti: profilo legato all'account Auth (auth.users è condiviso con altre demo: conta solo chi ha un profilo qui).
-- - beachin.ha_permesso(sezione, minimo): usata dalle policy. Utente disattivato = nessun permesso, subito.
-- Creazione account, password e disattivazione passano dalla Edge Function `beachin-utenti` (service role).
-- Fase 1: le policy "demo anon" restano (sito, ComandApp, menu QR lavorano come anon); qui si aggiungono quelle per
-- `authenticated`. La chiusura di anon alle sole azioni dei clienti è una migrazione successiva.

create table if not exists beachin.ruoli (
  id text primary key,
  nome text not null,
  descrizione text,
  permessi jsonb not null default '{}'::jsonb,
  amministratore boolean not null default false,
  di_sistema boolean not null default false,
  creato_il timestamptz not null default now()
);

create table if not exists beachin.utenti (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null,
  ruolo_id text not null references beachin.ruoli(id),
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  ultimo_accesso timestamptz
);

insert into beachin.ruoli (id, nome, descrizione, permessi, amministratore, di_sistema) values
  ('amministratore', 'Amministratore', 'Accesso completo, gestisce utenti e ruoli', '{}', true, true),
  ('responsabile', 'Responsabile', 'Gestisce tutta l''operatività, non gli utenti',
   '{"cruscotto":2,"arenile":2,"clienti":2,"tariffe":2,"bar":2,"comande":2,"ristorante":2,"costi":2,"conto-economico":2,"personale":2,"eventi":2,"sito":2,"impostazioni":1,"utenti":0}', false, false),
  ('cameriere', 'Cameriere', 'Sala del ristorante e comande',
   '{"ristorante":2,"comande":2,"bar":1,"eventi":1}', false, false),
  ('bar', 'Bar', 'Banco bar e comande dagli ombrelloni',
   '{"bar":2,"comande":2}', false, false)
on conflict (id) do nothing;

-- Livello dell'utente collegato su una sezione (0 se non collegato, senza profilo o disattivato).
create or replace function beachin.livello(sezione text) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case when r.amministratore then 2 else coalesce((r.permessi ->> sezione)::int, 0) end
    from beachin.utenti u join beachin.ruoli r on r.id = u.ruolo_id
    where u.id = auth.uid() and u.attivo
  ), 0)
$$;

create or replace function beachin.ha_permesso(sezione text, minimo int default 1) returns boolean
language sql stable security definer set search_path = '' as $$
  select beachin.livello(sezione) >= minimo
$$;

create or replace function beachin.e_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from beachin.utenti where id = auth.uid() and attivo)
$$;

-- Profilo dell'utente collegato (letto dall'app al login) + ultimo accesso.
create or replace function beachin.mio_profilo() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb;
begin
  update beachin.utenti set ultimo_accesso = now() where id = auth.uid() and attivo;
  select jsonb_build_object('id', u.id, 'email', u.email, 'nome', u.nome, 'ruolo_id', r.id, 'ruolo', r.nome,
                            'amministratore', r.amministratore, 'permessi', r.permessi)
    into p
  from beachin.utenti u join beachin.ruoli r on r.id = u.ruolo_id
  where u.id = auth.uid() and u.attivo;
  return p;
end $$;

revoke all on function beachin.livello(text), beachin.ha_permesso(text, int), beachin.e_staff(), beachin.mio_profilo() from public, anon;
grant execute on function beachin.livello(text), beachin.ha_permesso(text, int), beachin.e_staff(), beachin.mio_profilo() to authenticated;

-- Deve restare almeno un amministratore attivo (vale anche per la Edge Function, che bypassa le policy).
create or replace function beachin.verifica_amministratore() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from beachin.utenti)
     and not exists (select 1 from beachin.utenti u join beachin.ruoli r on r.id = u.ruolo_id where u.attivo and r.amministratore) then
    raise exception 'Serve almeno un amministratore attivo';
  end if;
  return null;
end $$;

drop trigger if exists verifica_amministratore on beachin.utenti;
create trigger verifica_amministratore after update or delete on beachin.utenti
  for each statement execute function beachin.verifica_amministratore();
drop trigger if exists verifica_amministratore on beachin.ruoli;
create trigger verifica_amministratore after update or delete on beachin.ruoli
  for each statement execute function beachin.verifica_amministratore();

-- Ruoli e utenti: nessun accesso anon.
revoke all on beachin.ruoli, beachin.utenti from anon;
grant select, insert, update, delete on beachin.ruoli to authenticated, service_role;
grant select on beachin.utenti to authenticated;
grant select, insert, update, delete on beachin.utenti to service_role;
alter table beachin.ruoli enable row level security;
alter table beachin.utenti enable row level security;

drop policy if exists "staff lettura" on beachin.ruoli;
drop policy if exists "staff inserimento" on beachin.ruoli;
drop policy if exists "staff modifica" on beachin.ruoli;
drop policy if exists "staff eliminazione" on beachin.ruoli;
create policy "staff lettura" on beachin.ruoli for select to authenticated using (beachin.ha_permesso('utenti', 1));
create policy "staff inserimento" on beachin.ruoli for insert to authenticated with check (beachin.ha_permesso('utenti', 2));
create policy "staff modifica" on beachin.ruoli for update to authenticated
  using (beachin.ha_permesso('utenti', 2)) with check (beachin.ha_permesso('utenti', 2));
create policy "staff eliminazione" on beachin.ruoli for delete to authenticated
  using (beachin.ha_permesso('utenti', 2) and not di_sistema
         and not exists (select 1 from beachin.utenti u where u.ruolo_id = ruoli.id));

drop policy if exists "staff lettura" on beachin.utenti;
create policy "staff lettura" on beachin.utenti for select to authenticated
  using (id = auth.uid() or beachin.ha_permesso('utenti', 1));

-- Tabelle esistenti: sezione → lettura (livello 1) e modifica (livello 2) per lo staff collegato.
do $$
declare
  coppia text[];
  t text; s text;
begin
  foreach coppia slice 1 in array array[
    ['articoli_bar','bar'], ['bar_sezioni','bar'], ['comande','comande'],
    ['menu_piatti','ristorante'], ['menu_sezioni','ristorante'], ['tavoli','ristorante'], ['tavoli_giorno','ristorante'],
    ['prenotazioni_ristorante','ristorante'], ['richieste_ristorante','ristorante'], ['giorni_chiusi','ristorante'],
    ['richieste_eventi','eventi'], ['notizie','sito'], ['lavagnetta','sito'], ['impostazioni','impostazioni']
  ] loop
    t := coppia[1]; s := coppia[2];
    execute format('drop policy if exists "staff lettura" on beachin.%I', t);
    execute format('drop policy if exists "staff modifica" on beachin.%I', t);
    execute format('create policy "staff lettura" on beachin.%I for select to authenticated using (beachin.ha_permesso(%L, 1))', t, s);
    execute format('create policy "staff modifica" on beachin.%I for all to authenticated using (beachin.ha_permesso(%L, 2)) with check (beachin.ha_permesso(%L, 2))', t, s, s);
  end loop;
end $$;

-- Azioni dei clienti anche per chi è collegato (es. un cameriere che apre il sito o il menu QR sullo stesso browser):
-- leggere catalogo e impostazioni, inviare comande e richieste.
do $$
declare t text;
begin
  foreach t in array array['menu_piatti','menu_sezioni','notizie','lavagnetta','impostazioni','giorni_chiusi',
                           'articoli_bar','bar_sezioni','tavoli','tavoli_giorno'] loop
    execute format('drop policy if exists "clienti lettura" on beachin.%I', t);
    execute format('create policy "clienti lettura" on beachin.%I for select to authenticated using (true)', t);
  end loop;
  foreach t in array array['comande','richieste_ristorante','richieste_eventi'] loop
    execute format('drop policy if exists "clienti invio" on beachin.%I', t);
    execute format('create policy "clienti invio" on beachin.%I for insert to authenticated with check (true)', t);
  end loop;
end $$;

-- Foto: lo staff collegato carica nel bucket come faceva anon.
drop policy if exists "beachin foto: caricamento staff" on storage.objects;
create policy "beachin foto: caricamento staff" on storage.objects
  for insert to authenticated with check (bucket_id = 'beachin' and beachin.e_staff());

-- Realtime: l'elenco utenti si aggiorna dal vivo nella pagina di gestione.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = 'utenti') then
    alter publication supabase_realtime add table beachin.utenti;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = 'ruoli') then
    alter publication supabase_realtime add table beachin.ruoli;
  end if;
end $$;
