-- Foto profilo degli utenti del gestionale (URL nello Storage `beachin/utenti/…`, mostrata tonda come su WhatsApp).
alter table beachin.utenti add column if not exists foto text;

create or replace function beachin.mio_profilo() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb;
begin
  update beachin.utenti set ultimo_accesso = now() where id = auth.uid() and attivo;
  select jsonb_build_object('id', u.id, 'email', u.email, 'username', u.username, 'nome', u.nome, 'foto', u.foto,
                            'ruolo_id', r.id, 'ruolo', r.nome, 'amministratore', r.amministratore, 'permessi', r.permessi)
    into p
  from beachin.utenti u join beachin.ruoli r on r.id = u.ruolo_id
  where u.id = auth.uid() and u.attivo;
  return p;
end $$;
