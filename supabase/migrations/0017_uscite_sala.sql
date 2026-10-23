-- Uscite delle comande del ristorante (ott 2026): il cameriere divide i piatti in uscite (Subito, 1ª, 2ª…)
-- e dà il «via» a quelle successive; la cucina segna i piatti pronti. Uscita e stato del piatto stanno in `righe` (jsonb),
-- qui solo l'ultima uscita chiamata. Null = tutte (comande vecchie).
alter table beachin.comande_sala add column if not exists uscita_via int;
