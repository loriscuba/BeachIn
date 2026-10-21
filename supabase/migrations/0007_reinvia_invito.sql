-- "Reinvia invito" (Eventi → Presenze): aggiornare invio_ts di una prenotazione confermata rimanda la mail con il QR.
alter table beachin.richieste_eventi add column if not exists invio_ts bigint;
drop trigger if exists email_reinvio_invito on beachin.richieste_eventi;
create trigger email_reinvio_invito after update of invio_ts on beachin.richieste_eventi
  for each row when (new.invio_ts is distinct from old.invio_ts and new.invio_ts is not null
    and new.stato = 'confermata' and position('@' in new.email) > 0)
  execute function beachin.email_richiesta();
