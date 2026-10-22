-- Accesso con nome utente (es. "lorisc") invece dell'email.
-- Supabase Auth vuole comunque un'email: per gli utenti creati dal gestionale è sintetica,
-- `<nome utente>@utenti.beachin.local` (nessuna mail viene mai spedita lì). L'app la ricava dal nome utente.
alter table beachin.utenti add column if not exists username text;
create unique index if not exists utenti_username on beachin.utenti (username);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'utenti_username_formato') then
    alter table beachin.utenti add constraint utenti_username_formato check (username ~ '^[a-z0-9._-]{3,30}$');
  end if;
end $$;

create or replace function beachin.mio_profilo() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb;
begin
  update beachin.utenti set ultimo_accesso = now() where id = auth.uid() and attivo;
  select jsonb_build_object('id', u.id, 'email', u.email, 'username', u.username, 'nome', u.nome, 'ruolo_id', r.id,
                            'ruolo', r.nome, 'amministratore', r.amministratore, 'permessi', r.permessi)
    into p
  from beachin.utenti u join beachin.ruoli r on r.id = u.ruolo_id
  where u.id = auth.uid() and u.attivo;
  return p;
end $$;
