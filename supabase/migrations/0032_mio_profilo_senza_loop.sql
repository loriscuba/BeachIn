-- mio_profilo() segnava ultimo_accesso a ogni chiamata; l'app ascolta dal vivo la propria riga di `utenti` e a ogni modifica
-- richiama mio_profilo(): giro infinito (~6 richieste al secondo per scheda aperta) che rallentava tutto il database.
-- Ora l'ultimo accesso si aggiorna al massimo una volta al minuto (e l'app ignora le modifiche al solo ultimo_accesso).
create or replace function beachin.mio_profilo() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb;
begin
  update beachin.utenti set ultimo_accesso = now()
  where id = auth.uid() and attivo and (ultimo_accesso is null or ultimo_accesso < now() - interval '1 minute');
  select jsonb_build_object('id', u.id, 'email', u.email, 'username', u.username, 'nome', u.nome, 'foto', u.foto,
                            'ruolo_id', r.id, 'ruolo', r.nome, 'amministratore', r.amministratore, 'permessi', r.permessi)
    into p
  from beachin.utenti u join beachin.ruoli r on r.id = u.ruolo_id
  where u.id = auth.uid() and u.attivo;
  return p;
end $$;
