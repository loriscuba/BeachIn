-- Comande del ristorante (sala → cucina): modalità cameriere e tablet self al tavolo (ott 2026).
-- 1) descrizione dei piatti (menu del tablet self), 2) tabella comande_sala, 3) permesso `sala` nei ruoli.
-- Compatibile all'indietro: solo colonne/tabelle nuove.

-- 1) Descrizione dei piatti, riempita per i piatti dimostrativi solo dove manca
alter table beachin.menu_piatti add column if not exists descrizione text;
update beachin.menu_piatti p set descrizione = v.descrizione
from (values
  ('Flan di zucchine, fiore croccante e crema al grana', 'Sformato soffice di zucchine dell’orto, fiore di zucca in pastella leggera e crema di Grana Padano.'),
  ('Tartare di fassona con stracciatella affumicata e pesto', 'Fassona piemontese battuta al coltello, stracciatella affumicata e pesto genovese al basilico.'),
  ('Guazzetto di mare', 'Cozze, vongole, gamberi e pescato del giorno in un brodetto di pomodorini, aglio e prezzemolo, con crostini.'),
  ('Frittino del contadino', 'Verdure di stagione in pastella croccante, servite con salsa allo yogurt e erba cipollina.'),
  ('Tartare di tonno al naturale', 'Tonno rosso tagliato al coltello, olio extravergine ligure, sale in fiocchi e scorza di limone.'),
  ('Duetto di acciughe e verdurine', 'Acciughe del Mar Ligure fritte e marinate, con verdurine croccanti in agrodolce.'),
  ('Penne con porri e salsiccia', 'Penne mantecate con porri stufati e salsiccia sbriciolata, profumo di salvia.'),
  ('Gnocchi di patate con crema di gorgonzola e gherigli di noci', 'Gnocchi fatti a mano, crema di gorgonzola dolce e noci tostate.'),
  ('Spaghetto Lido', 'Il nostro classico: spaghetti con frutti di mare, gamberoni e pomodorino fresco.'),
  ('Tagliatelle al ragù di fassona piemontese', 'Tagliatelle all’uovo tirate a mano con ragù di fassona cotto lentamente.'),
  ('Cappellacci bianchi e neri al profumo di mare', 'Pasta fresca bicolore ripiena di pesce, in un sugo leggero di crostacei.'),
  ('Tagliatelle al nero di seppia, tartare di gambero e stracciatella affumicata', 'Tagliatelle al nero, tartare di gambero rosa e stracciatella affumicata.'),
  ('Pasta allo scoglio', 'Pasta con cozze, vongole, calamari e gamberi, saltata nel sugo di pomodoro fresco.'),
  ('Insalata di mare', 'Polpo, seppie, gamberi e cozze con sedano, limone e olio extravergine.'),
  ('Orata alla griglia', 'Orata intera alla brace con erbe aromatiche, servita con verdure grigliate.'),
  ('Fritto royale', 'Gran frittura di calamari, gamberi, scampi e pesciolini, da condividere.'),
  ('Trancio di spada alla griglia con aromi di Provenza', 'Pesce spada alla brace, timo, rosmarino e lavanda, olio al limone.'),
  ('Filetto di fassona con burro aromatizzato alle erbe liguri', 'Filetto di fassona alla griglia con burro alle erbe del nostro entroterra.'),
  ('Tagliata di fassona spadellata con burro aromatizzato e salsa di soia (all''etto)', 'Fassona tagliata e spadellata, burro aromatizzato e un tocco di salsa di soia. Prezzo all’etto.'),
  ('Costine di maiale, coppa di vitello, pollo e arrosticini', 'Grigliata mista del lido: costine, coppa di vitello, pollo e arrosticini.'),
  ('Colomba pasquale con crema al latte all''arancia', 'Colomba artigianale con crema al latte profumata all’arancia.'),
  ('Pavlova con frutti di bosco freschi', 'Meringa croccante fuori e morbida dentro, panna montata e frutti di bosco.'),
  ('Bunetto al cioccolato e amaretto di Saronno', 'Il bunet piemontese al cacao con amaretti e un goccio di Saronno.'),
  ('Pastiera napoletana al cioccolato', 'La pastiera della tradizione in versione al cioccolato.'),
  ('Panna cotta ai frutti di bosco con meringa alla mandorla', 'Panna cotta vellutata, coulis di frutti di bosco e meringa alla mandorla.'),
  ('Crostatina con panna cotta ai mirtilli', 'Frolla friabile, panna cotta e mirtilli freschi.'),
  ('Gelato al fior di latte con Chartreuse francese', 'Fior di latte mantecato con un filo di Chartreuse.'),
  ('Acqua minerale 1L', 'Naturale o frizzante.'),
  ('Vino della casa (calice)', 'Bianco o rosso dei colli liguri.'),
  ('Vino della casa (bottiglia)', 'Bianco o rosso dei colli liguri, 0,75 L.'),
  ('Birra artigianale', 'Birra chiara non filtrata, 33 cl.'),
  ('Caffè', 'Espresso.')
) as v(nome, descrizione)
where p.nome = v.nome and p.descrizione is null;

-- 2) Comande del ristorante
create table if not exists beachin.comande_sala (
  id text primary key,
  tavolo int not null,
  righe jsonb not null default '[]',
  totale numeric(10,2) not null default 0,
  stato text not null default 'inviata' check (stato in ('inviata','in_preparazione','pronta','servita')),
  ora text not null,
  ts bigint not null default 0,
  origine text not null default 'cameriere' check (origine in ('cameriere','self')),
  cameriere text,
  coperti int,
  note text
);
grant select, insert, update, delete on beachin.comande_sala to anon, authenticated, service_role;
alter table beachin.comande_sala enable row level security;
-- Fase 1 come le altre tabelle: accesso demo per anon; il personale secondo il permesso `sala`
drop policy if exists "demo anon" on beachin.comande_sala;
create policy "demo anon" on beachin.comande_sala for all to anon using (true) with check (true);
drop policy if exists "staff lettura" on beachin.comande_sala;
drop policy if exists "staff modifica" on beachin.comande_sala;
create policy "staff lettura" on beachin.comande_sala for select to authenticated using (beachin.ha_permesso('sala', 1));
create policy "staff modifica" on beachin.comande_sala for all to authenticated
  using (beachin.ha_permesso('sala', 2)) with check (beachin.ha_permesso('sala', 2));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = 'comande_sala') then
    alter publication supabase_realtime add table beachin.comande_sala;
  end if;
end $$;

-- 3) Permesso `sala` nei ruoli: responsabile e cameriere modificano; nuovo ruolo Cucina
update beachin.ruoli set permessi = permessi || '{"sala":2}'::jsonb
where id in ('responsabile', 'cameriere') and not (permessi ? 'sala');
insert into beachin.ruoli (id, nome, descrizione, permessi, amministratore, di_sistema) values
  ('cucina', 'Cucina', 'Riceve le comande del ristorante e ne segna lo stato', '{"sala":2}', false, false)
on conflict (id) do nothing;
