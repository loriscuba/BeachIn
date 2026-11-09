-- BeachIn · Demo: SVUOTA prenotazioni e comande bar
-- Da incollare nell'editor SQL di Supabase (progetto Demo, schema beachin). Cancella TUTTE le righe di:
--   • prenotazioni_ristorante  (tavoli del ristorante, manuali e dal sito)
--   • richieste_ristorante     (richieste tavolo arrivate dal sito)
--   • prenotazioni_online      (richieste ombrellone/gazebo dal sito)
--   • comande                  (comande bar degli ombrelloni e del banco)
-- NON tocca: menu, listino/magazzino bar, eventi e inviti, tavoli e QR, comande del ristorante, utenti, impostazioni.
-- Non si può annullare: in caso di dubbio fai prima un backup.

begin;

delete from beachin.comande;
delete from beachin.prenotazioni_ristorante;
delete from beachin.richieste_ristorante;
delete from beachin.prenotazioni_online;

commit;

-- controllo: devono risultare tutti 0
select 'comande' as tabella, count(*) from beachin.comande
union all select 'prenotazioni_ristorante', count(*) from beachin.prenotazioni_ristorante
union all select 'richieste_ristorante', count(*) from beachin.richieste_ristorante
union all select 'prenotazioni_online', count(*) from beachin.prenotazioni_online;
