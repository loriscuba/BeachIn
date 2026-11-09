-- BeachIn · Demo: RIEMPI prenotazioni e comande bar con dati fittizi
-- Da incollare nell'editor SQL di Supabase (progetto Demo, schema beachin). Si può lanciare più volte:
-- prima cancella solo le righe fittizie create da questo script (id che iniziano con DEMO-), poi le ricrea
-- con date attorno a oggi. Inserisce:
--   • prenotazioni_ristorante: da 3 giorni fa a 10 giorni avanti, pranzo e cena, con tavolo assegnato
--     (passate = arrivate/annullate, future = confermate o in attesa)
--   • richieste_ristorante: 10 richieste dal sito (5 da confermare, 3 confermate con prenotazione, 1 rifiutata, 1 annullata)
--   • prenotazioni_online: 8 richieste ombrellone/gazebo/tenda dal sito
--   • comande (bar): ~14 di oggi in vari stati + ~10 di ieri già pagate, con articoli presi dal listino bar
-- Usa i tavoli e il listino bar già presenti: NON tocca menu, magazzino, eventi, tavoli, utenti, impostazioni.
-- Durante l'inserimento spegne le notifiche push e le mail delle richieste (nessuna mail ai clienti finti),
-- poi le riaccende. Le mail sono @example.com (dominio di prova, non arriva niente a nessuno).

begin;

delete from beachin.comande where id like 'DEMO-%';
delete from beachin.prenotazioni_ristorante where id like 'DEMO-%';
delete from beachin.richieste_ristorante where id like 'DEMO-%';
delete from beachin.prenotazioni_online where id like 'DEMO-%';

alter table beachin.richieste_ristorante
  disable trigger notifica_nuova_richiesta,
  disable trigger email_nuova_richiesta;
alter table beachin.prenotazioni_online disable trigger notifica_prenotazione_online;

do $$
declare
  nomi text[] := array[
    'Marco Rossi','Giulia Bianchi','Luca Ferrari','Francesca Romano','Alessandro Colombo','Chiara Ricci',
    'Matteo Marino','Sara Greco','Davide Bruno','Elena Gallo','Simone Conti','Martina De Luca',
    'Andrea Mancini','Valentina Costa','Federico Giordano','Laura Rizzo','Stefano Lombardi','Alessia Moretti',
    'Paolo Barbieri','Silvia Fontana','Giorgio Santoro','Roberta Mariani','Riccardo Rinaldi','Elisa Caruso',
    'Fabio Ferrara','Ilaria Galli','Daniele Martini','Federica Leone','Massimo Longo','Beatrice Gentile',
    'Lorenzo Martinelli','Anna Vitale','Nicola Serra','Monica Pellegrini','Emanuele Fabbri','Cristina Marchetti',
    'Pietro Villa','Giada Cattaneo','Tommaso Ferri','Ludovica Testa'];
  note_pr text[] := array['Seggiolone per bambino','Tavolo vicino al mare','Celiaco','Compleanno, torta portata da noi',
    'Arrivano in ritardo di 15 minuti','Allergia ai crostacei','Vegetariani','Con cane piccolo'];
  ore_pranzo text[] := array['12:30','12:45','13:00','13:15','13:30','14:00'];
  ore_cena text[] := array['19:30','20:00','20:15','20:30','21:00','21:30'];
  file text := 'ABCDEFGHI';
  oggi date := (now() at time zone 'Europe/Rome')::date;
  d date; t text; n int; i int; k int; v_nome text; cop int; st text; tav record; tav_id text;
  righe jsonb; tot numeric; ist timestamptz; art record;
  q int;
begin
  -- 1) Prenotazioni del ristorante con tavolo
  for d in select generate_series(oggi - 3, oggi + 10, interval '1 day')::date loop
    foreach t in array array['pranzo','cena'] loop
      n := case when extract(isodow from d) in (5,6,7) then 7 + floor(random() * 5)::int else 3 + floor(random() * 4)::int end;
      i := 0;
      for tav in select id, posti from beachin.tavoli order by random() limit n loop
        i := i + 1;
        v_nome := nomi[1 + floor(random() * array_length(nomi, 1))::int];
        cop := least(greatest(tav.posti, 2), 2 + floor(random() * 4)::int);
        st := case
          when d < oggi then case when random() < 0.9 then 'arrivata' else 'annullata' end
          when d = oggi then 'confermata'
          else case when random() < 0.85 then 'confermata' else 'in_attesa' end end;
        insert into beachin.prenotazioni_ristorante (id, data, turno, ora, nome, coperti, tavolo_id, stato, note, telefono, origine)
        values (
          'DEMO-PR-' || to_char(d, 'YYYYMMDD') || '-' || t || '-' || i,
          to_char(d, 'YYYY-MM-DD'), t,
          case when t = 'pranzo' then ore_pranzo[1 + floor(random() * 6)::int] else ore_cena[1 + floor(random() * 6)::int] end,
          v_nome, cop,
          case when st = 'in_attesa' then null else tav.id end,
          st,
          case when random() < 0.2 then note_pr[1 + floor(random() * array_length(note_pr, 1))::int] end,
          '+39 3' || (20 + floor(random() * 80)::int) || ' 555 ' || lpad(floor(random() * 10000)::int::text, 4, '0'),
          case when random() < 0.3 then 'sito' else 'manuale' end);
      end loop;
    end loop;
  end loop;

  -- 2) Richieste tavolo dal sito
  for i in 1..10 loop
    v_nome := nomi[1 + ((i * 7) % array_length(nomi, 1))];
    d := oggi + 1 + (i % 7);
    t := case when i % 3 = 0 then 'pranzo' else 'cena' end;
    st := case when i <= 5 then 'da_confermare' when i <= 8 then 'confermata' when i = 9 then 'rifiutata' else 'annullata' end;
    cop := 2 + (i % 4);
    ist := now() - make_interval(hours => i * 5);
    insert into beachin.richieste_ristorante (id, ricevuta_il, nome, email, telefono, data, turno, ora, coperti, stato, note, ts,
                                              azione_cliente, azione_ts)
    values (
      'DEMO-RR-' || i,
      to_char((ist at time zone 'Europe/Rome')::date, 'YYYY-MM-DD'),
      v_nome,
      lower(split_part(v_nome, ' ', 1)) || '.' || lower(split_part(v_nome, ' ', 2)) || '@example.com',
      '+39 3' || (20 + i * 3) || ' 555 ' || lpad((i * 1234 % 10000)::text, 4, '0'),
      to_char(d, 'YYYY-MM-DD'), t,
      case when t = 'pranzo' then ore_pranzo[1 + (i % 6)] else ore_cena[1 + (i % 6)] end,
      cop, st,
      case when i in (2, 6) then 'Se possibile tavolo in terrazza' end,
      (extract(epoch from ist) * 1000)::bigint,
      case when st = 'annullata' then 'annulla' end,
      case when st = 'annullata' then (extract(epoch from ist + interval '2 hours') * 1000)::bigint end);

    -- le richieste confermate diventano prenotazioni dal sito, su un tavolo libero
    if st = 'confermata' then
      select id into tav_id from beachin.tavoli tv
      where tv.posti >= cop
        and not exists (select 1 from beachin.prenotazioni_ristorante p
                        where p.data = to_char(d, 'YYYY-MM-DD') and p.turno = t and p.tavolo_id = tv.id and p.stato <> 'annullata')
      order by tv.posti, random() limit 1;
      insert into beachin.prenotazioni_ristorante (id, data, turno, ora, nome, coperti, tavolo_id, stato, telefono, origine)
      select 'DEMO-PR-SITO-' || i, r.data, r.turno, r.ora, r.nome, r.coperti, tav_id, 'confermata', r.telefono, 'sito'
      from beachin.richieste_ristorante r where r.id = 'DEMO-RR-' || i;
    end if;
  end loop;

  -- 3) Richieste ombrellone dal sito
  for i in 1..8 loop
    v_nome := nomi[1 + ((i * 11 + 3) % array_length(nomi, 1))];
    d := oggi + 2 + i * 2;
    insert into beachin.prenotazioni_online (id, ricevuta_il, nome, email, telefono, dal, al, tipologia_postazione, persone, stato, messaggio, ts)
    values (
      'DEMO-PO-' || i,
      to_char(oggi - (i % 4), 'YYYY-MM-DD'),
      v_nome,
      lower(split_part(v_nome, ' ', 1)) || '.' || lower(split_part(v_nome, ' ', 2)) || '@example.com',
      '+39 3' || (30 + i * 4) || ' 555 ' || lpad((i * 4321 % 10000)::text, 4, '0'),
      to_char(d, 'YYYY-MM-DD'),
      to_char(d + (i % 3) * 3, 'YYYY-MM-DD'),
      (array['ombrellone_2_lettini','ombrellone_2_sdraio','ombrellone_lettino_sdraio','gazebo','tenda'])[1 + (i % 5)],
      2 + (i % 3),
      case when i <= 4 then 'da_confermare' when i <= 7 then 'confermata' else 'rifiutata' end,
      case when i in (1, 5) then 'Possibilmente nelle prime file' when i = 3 then 'Siamo in 2 adulti e 2 bambini' end,
      (extract(epoch from now() - make_interval(days => i % 4, hours => i)) * 1000)::bigint);
  end loop;

  -- 4) Comande bar: ieri (pagate) e oggi (in vari stati), articoli dal listino
  if not exists (select 1 from beachin.articoli_bar where disponibile) then
    raise notice 'Listino bar vuoto: comande non inserite';
    return;
  end if;
  for k in 1..24 loop
    if k <= 10 then
      ist := ((oggi - 1)::timestamp + make_interval(hours => 9, mins => k * 50)) at time zone 'Europe/Rome';
    else
      ist := now() - make_interval(mins => (24 - k) * 18 + 2);
    end if;
    righe := '[]'::jsonb; tot := 0;
    for art in select a.id, a.nome, a.prezzo_vendita from beachin.articoli_bar a where disponibile order by random() limit 1 + floor(random() * 4)::int loop
      q := 1 + floor(random() * 3)::int;
      righe := righe || jsonb_build_object('articoloId', art.id, 'nome', art.nome, 'quantita', q, 'prezzoUnitario', art.prezzo_vendita);
      tot := tot + q * art.prezzo_vendita;
    end loop;
    insert into beachin.comande (id, ombrellone, righe, totale, stato, ora, note, origine, cliente, ts, creata_il, pagata)
    values (
      'DEMO-CB-' || k,
      substr(file, 1 + floor(random() * 9)::int, 1) || '-' || lpad((1 + floor(random() * 20)::int)::text, 2, '0'),
      righe, tot,
      case when k <= 18 then 'pronta' when k <= 20 then 'in_preparazione' when k <= 22 then 'presa_in_carico' else 'in_attesa' end,
      to_char(ist at time zone 'Europe/Rome', 'HH24:MI'),
      case when k in (13, 21) then 'Senza ghiaccio' when k = 23 then 'Portare due cannucce' end,
      case when k % 2 = 0 then 'app' else 'bar' end,
      case when k % 2 = 0 then nomi[1 + (k * 5 % array_length(nomi, 1))] end,
      (extract(epoch from ist) * 1000)::bigint,
      ist,
      k <= 14);
  end loop;
end $$;

alter table beachin.richieste_ristorante
  enable trigger notifica_nuova_richiesta,
  enable trigger email_nuova_richiesta;
alter table beachin.prenotazioni_online enable trigger notifica_prenotazione_online;

commit;

-- riepilogo
select 'prenotazioni_ristorante' as tabella, count(*) from beachin.prenotazioni_ristorante where id like 'DEMO-%'
union all select 'richieste_ristorante', count(*) from beachin.richieste_ristorante where id like 'DEMO-%'
union all select 'prenotazioni_online', count(*) from beachin.prenotazioni_online where id like 'DEMO-%'
union all select 'comande bar', count(*) from beachin.comande where id like 'DEMO-%';
