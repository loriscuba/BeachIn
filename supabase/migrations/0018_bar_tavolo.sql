-- Bar al tavolo (ott 2026): le bevande del listino bar nelle comande del ristorante e coda unica al bar.
-- Le righe stanno già in comande_sala.righe (jsonb, campo `reparto`): nessuna tabella nuova.
-- Solo permessi: `bar-tavolo` al responsabile e nuovo ruolo Barista. Il barista ha anche `sala` 2
-- perché le policy di comande_sala (migrazione 0015) chiedono quel permesso per segnare le righe pronte.
update beachin.ruoli set permessi = permessi || '{"bar-tavolo":2}'::jsonb
where id = 'responsabile' and not (permessi ? 'bar-tavolo');
insert into beachin.ruoli (id, nome, descrizione, permessi, amministratore, di_sistema) values
  ('barista', 'Barista', 'Prepara le bevande: coda unica del bar (tavoli del ristorante e ombrelloni)',
   '{"bar-tavolo":2,"sala":2,"comande":2,"bar":1}', false, false)
on conflict (id) do nothing;
