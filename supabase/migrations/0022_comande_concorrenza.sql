-- Comande sala con più dispositivi insieme (stress test del 25/10/2026).
-- 1) Cucina, bar e sala cambiano solo i piatti toccati (`aggiorna_righe_sala`) invece di riscrivere la comanda intera:
--    due tocchi nello stesso secondo non si cancellano più a vicenda. Lo stato riassunto è ricalcolato qui
--    con la stessa regola di `ricalcolaStato` (src/lib/sala.ts).
-- 2) Una comanda nuova va sempre sul conto in corso del tavolo; dal QR è rifiutata se il conto è chiuso
--    (telefono rimasto aperto senza aggiornamenti dopo «Chiudi conto»).
-- 3) Il codice del QR stampato non cambia più, anche se due dispositivi creano il tavolo insieme.

create or replace function beachin.stato_comanda_sala(p_righe jsonb, p_uscita_via int)
returns text language sql immutable as $$
  with r as (
    select e->>'stato' as st, coalesce((e->>'uscita')::int, 1) <= coalesce(p_uscita_via, 99) as chiamata
    from jsonb_array_elements(p_righe) e
  ), a as (select st from r where st <> 'servita' and chiamata)
  select case
    when not exists (select 1 from r where st <> 'servita') then 'servita'
    when exists (select 1 from a) and not exists (select 1 from a where st <> 'pronta') then 'pronta'
    when exists (select 1 from a) and not exists (select 1 from a where st <> 'attesa') then 'inviata'
    else 'in_preparazione' end
$$;

-- p_stati: { "<indice della riga>": "attesa|preparazione|pronta|servita" }; p_uscita_via: uscite chiamate (solo in avanti).
create or replace function beachin.aggiorna_righe_sala(p_id text, p_stati jsonb, p_uscita_via int default null)
returns void language plpgsql security invoker set search_path = beachin as $$
declare c beachin.comande_sala%rowtype; nuove jsonb; via int;
begin
  select * into c from beachin.comande_sala where id = p_id and not pagata for update;
  if not found then return; end if; -- annullata o conto già chiuso
  -- righe vecchie senza stato: lo ricavano dalla comanda, come `statoRiga`
  select jsonb_agg(
    case when p_stati ? (o - 1)::text then e || jsonb_build_object('stato', p_stati->>((o - 1)::text))
         when e ? 'stato' then e
         else e || jsonb_build_object('stato', case c.stato when 'servita' then 'servita' when 'pronta' then 'pronta'
                                                when 'in_preparazione' then 'preparazione' else 'attesa' end) end
    order by o)
  into nuove from jsonb_array_elements(c.righe) with ordinality as x(e, o);
  via := case when c.uscita_via is null then null else greatest(c.uscita_via, coalesce(p_uscita_via, c.uscita_via)) end;
  update beachin.comande_sala set righe = coalesce(nuove, '[]'), uscita_via = via,
    stato = beachin.stato_comanda_sala(coalesce(nuove, '[]'), via)
  where id = p_id;
end $$;
grant execute on function beachin.aggiorna_righe_sala(text, jsonb, int) to anon, authenticated, service_role;
grant execute on function beachin.stato_comanda_sala(jsonb, int) to anon, authenticated, service_role;

create or replace function beachin.comanda_sala_sul_conto()
returns trigger language plpgsql set search_path = beachin as $$
declare q record;
begin
  -- l'upsert di una comanda già salvata passa anche da qui: vale solo per quelle nuove
  if exists (select 1 from beachin.comande_sala where id = new.id) then return new; end if;
  select seduta, aperto into q from beachin.tavoli_qr where numero = new.tavolo;
  if not found or q.seduta is null then return new; end if;
  if new.origine = 'qr' and (not q.aperto or new.seduta is distinct from q.seduta) then
    raise exception 'Conto del tavolo % chiuso: inquadra di nuovo il QR', new.tavolo using errcode = 'P0001';
  end if;
  new.seduta := q.seduta; -- cameriere o tablet con dati vecchi: la comanda va sul conto in corso
  return new;
end $$;
create or replace trigger comanda_sala_sul_conto before insert on beachin.comande_sala
  for each row execute function beachin.comanda_sala_sul_conto();

create or replace function beachin.tavolo_qr_codice_fisso()
returns trigger language plpgsql as $$
begin
  new.codice := old.codice;
  return new;
end $$;
create or replace trigger tavolo_qr_codice_fisso before update on beachin.tavoli_qr
  for each row execute function beachin.tavolo_qr_codice_fisso();
