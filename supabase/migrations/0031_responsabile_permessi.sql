-- Permessi dei ruoli (nov 2026): oltre all'amministratore, anche il Responsabile può modificare utenti e ruoli
-- (permesso `utenti` = 2). Gli altri ruoli restano senza accesso alla sezione.
update beachin.ruoli
set permessi = permessi || '{"utenti":2}'::jsonb,
    descrizione = 'Gestisce tutta l''operatività, gli utenti e i permessi dei ruoli'
where id = 'responsabile';
