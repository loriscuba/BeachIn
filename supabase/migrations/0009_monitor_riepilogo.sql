-- Riepilogo per IPA Monitor: una riga con i numeri principali di BeachIn.
-- Letta solo dal collettore di IPA Monitor (Edge Function `ipa-collect`, ruolo postgres);
-- nessun accesso per anon / authenticated.

create or replace view beachin.monitor_riepilogo as
select
  now()                                                                               as letto_il,
  (select count(*) from beachin.comande
     where creata_il >= date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome') as comande_oggi,
  (select count(*) from beachin.comande where stato = 'in_attesa')                    as comande_in_attesa,
  (select max(creata_il) from beachin.comande)                                        as ultima_comanda,
  (select count(*) from beachin.richieste_ristorante where stato <> 'confermata')     as richieste_ristorante_aperte,
  (select count(*) from beachin.richieste_eventi where stato <> 'confermata')         as richieste_eventi_aperte,
  (select count(*) from beachin.push_iscrizioni)                                      as push_iscrizioni,
  (select max(ultimo) from beachin.push_invii)                                        as ultimo_push;

revoke all on beachin.monitor_riepilogo from public, anon, authenticated;
