-- Notifiche ai clienti solo dalle news (ott 2026): la pubblicazione di un evento non notifica più,
-- la news può collegare un evento (nell'app clienti pulsante "Vedi l'evento").
alter table beachin.notizie add column if not exists evento_id text;
drop trigger if exists notifica_evento_nuovo on beachin.eventi;
drop trigger if exists notifica_evento_pubblicato on beachin.eventi;
