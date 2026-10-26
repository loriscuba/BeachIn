-- Contenuti del sito pubblico modificabili dal gestore (ott 2026): prima restavano solo nella pagina del gestionale
-- e il sito mostrava sempre i dati iniziali. Foto incluse nell'app salvate come `sito:<nome>` (vedi src/assets/sito).
create table if not exists beachin.eventi (
  id text primary key,
  nome text not null,
  tipo text not null,
  data text not null,
  budget numeric not null default 0,
  costi_sostenuti numeric not null default 0,
  ricavi numeric not null default 0,
  partecipanti int not null default 0,
  descrizione text not null default '',
  foto text,
  prezzo numeric,
  galleria jsonb not null default '[]'::jsonb
);
create table if not exists beachin.galleria_sito (
  id text primary key,
  titolo text not null default '',
  immagine text,
  ordine int not null default 0
);
-- Una riga per voce: `canali` (prenotazioni online attive), `home` (titolo, sottotitolo, testo, foto), `listino` (prezzi pubblicati).
create table if not exists beachin.sito_contenuti (
  id text primary key,
  valore jsonb not null default '{}'::jsonb
);

grant select, insert, update, delete on beachin.eventi, beachin.galleria_sito, beachin.sito_contenuti to anon, authenticated, service_role;

do $$
declare
  coppia text[];
  t text; s text;
begin
  foreach coppia slice 1 in array array[['eventi','eventi'], ['galleria_sito','sito'], ['sito_contenuti','sito']] loop
    t := coppia[1]; s := coppia[2];
    execute format('alter table beachin.%I enable row level security', t);
    -- Fase 1 come il resto dello schema: anon resta aperto (Fase 2 = solo lettura per i visitatori)
    execute format('drop policy if exists "demo anon" on beachin.%I', t);
    execute format('create policy "demo anon" on beachin.%I for all to anon using (true) with check (true)', t);
    execute format('drop policy if exists "staff modifica" on beachin.%I', t);
    execute format('create policy "staff modifica" on beachin.%I for all to authenticated using (beachin.ha_permesso(%L, 2)) with check (beachin.ha_permesso(%L, 2))', t, s, s);
    execute format('drop policy if exists "clienti lettura" on beachin.%I', t);
    execute format('create policy "clienti lettura" on beachin.%I for select to authenticated using (true)', t);
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'beachin' and tablename = t) then
      execute format('alter publication supabase_realtime add table beachin.%I', t);
    end if;
  end loop;
end $$;
-- Il listino (riga `listino`) lo pubblica anche chi gestisce Tariffe.
drop policy if exists "tariffe listino" on beachin.sito_contenuti;
create policy "tariffe listino" on beachin.sito_contenuti for all to authenticated
  using (id = 'listino' and beachin.ha_permesso('tariffe', 2)) with check (id = 'listino' and beachin.ha_permesso('tariffe', 2));

-- Dati iniziali (gli stessi di src/data/seed), così il sito non parte vuoto prima che il gestore apra il gestionale.
insert into beachin.eventi (id, nome, tipo, data, budget, costi_sostenuti, ricavi, partecipanti, descrizione, foto, prezzo, galleria) values
  ('E-01', 'Torneo di beach volley', 'sport', '2026-06-20', 1500, 1320, 2100, 64, 'Torneo a coppie con premiazione e aperitivo finale.', 'sito:beachVolley', null, '["sito:torneo","sito:beachVolley"]'::jsonb),
  ('E-02', 'Aperitivo in musica', 'musica', '2026-06-28', 1800, 1650, 2450, 140, 'DJ set al tramonto con drink e finger food.', 'sito:tramonto', null, '[]'::jsonb),
  ('E-03', 'Compleanno privato Bianchi', 'privato', '2026-07-12', 0, 900, 1800, 40, 'Festa privata su prenotazione, catering interno.', 'sito:famiglia', null, '[]'::jsonb),
  ('E-04', 'Cena sotto le stelle', 'gastronomia', '2026-07-19', 2200, 2050, 3200, 90, 'Cena a tema con menù di mare e musica dal vivo.', 'sito:ristorante', null, '[]'::jsonb),
  ('E-05', 'Corso di yoga all’alba', 'benessere', '2026-07-26', 400, 360, 620, 28, 'Quattro appuntamenti mattutini con istruttrice.', 'sito:marePini', null, '[]'::jsonb),
  ('E-06', 'Festa di Ferragosto', 'festa', '2026-08-15', 3500, 3300, 4200, 220, 'Cena, musica e spettacolo pirotecnico sulla spiaggia.', 'sito:pineta', null, '[]'::jsonb),
  ('E-07', 'Aperitivo in musica', 'musica', '2026-08-22', 1800, 1500, 0, 0, 'Secondo appuntamento con DJ set (in programma).', 'sito:barDistillati', null, '[]'::jsonb),
  ('E-08', 'Torneo di racchettoni', 'sport', '2026-09-05', 900, 0, 0, 0, 'Chiusura di stagione con torneo e merenda (in programma).', 'sito:ombrelloniCielo', null, '[]'::jsonb),
  ('E-09', 'Cena d’autunno', 'gastronomia', '2026-10-17', 1200, 0, 0, 0, 'Il ristorante resta aperto: menù di pesce e castagne, a lido chiuso (in programma).', 'sito:ristorante', null, '[]'::jsonb),
  ('E-10', 'Degustazione al tramonto', 'gastronomia', '2026-11-05', 800, 0, 0, 0, 'Vini liguri e crudi di mare in terrazza, con posti limitati (in programma).', 'sito:tramonto', null, '[]'::jsonb)
on conflict (id) do nothing;

insert into beachin.galleria_sito (id, titolo, immagine, ordine) values
  ('FT-1', 'La spiaggia vista dall’alto', 'sito:spiaggiaAlto', 0),
  ('FT-2', 'La spiaggia vista dal drone', 'sito:spiaggiaDrone', 1),
  ('FT-3', 'Il lido sotto il cielo di Savona', 'sito:ombrelloniCielo', 2),
  ('FT-4', 'La postazione del bagnino', 'sito:bagnino', 3),
  ('FT-5', 'Beach volley', 'sito:beachVolley', 4),
  ('FT-6', 'Il torneo dell’estate', 'sito:torneo', 5),
  ('FT-7', 'Il bar: la nostra selezione', 'sito:barDistillati', 6),
  ('FT-8', 'La sala del ristorante sul mare', 'sito:ristorante', 7),
  ('FT-9', 'Aperitivo al tramonto', 'sito:tramonto', 8)
on conflict (id) do nothing;
