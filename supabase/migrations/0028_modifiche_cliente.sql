-- Il cliente modifica o annulla dal sito la sua prenotazione (tavolo o evento) col link personale della mail (ott 2026).
-- Ogni richiesta ha un codice segreto lungo (token_cliente, 64 caratteri casuali): la pagina /prenotazione?t=… legge e cambia
-- SOLO la richiesta con quel codice, tramite le funzioni qui sotto (security definer), mai le tabelle direttamente.
-- Limite di tempo scelto dal gestore: impostazioni "prenotazioniCliente.oreTavolo" / ".oreEvento" (riga 'stabilimento').
-- Funzionalità "sito.modifiche" (Impostazioni → Moduli e funzionalità): se spenta il link non compare e le funzioni rifiutano.

alter table beachin.richieste_ristorante add column if not exists token_cliente text not null
  default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
alter table beachin.richieste_eventi add column if not exists token_cliente text not null
  default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
create unique index if not exists richieste_ristorante_token_cliente on beachin.richieste_ristorante (token_cliente);
create unique index if not exists richieste_eventi_token_cliente on beachin.richieste_eventi (token_cliente);

-- ultima azione del cliente (modifica | annulla) e quando: la vede lo staff, fa partire mail al cliente e push allo staff
alter table beachin.richieste_ristorante add column if not exists azione_cliente text;
alter table beachin.richieste_ristorante add column if not exists azione_ts bigint;
alter table beachin.richieste_eventi add column if not exists azione_cliente text;
alter table beachin.richieste_eventi add column if not exists azione_ts bigint;

-- nuovo stato "annullata" (annullata dal cliente)
alter table beachin.richieste_ristorante drop constraint if exists richieste_ristorante_stato_check;
alter table beachin.richieste_ristorante add constraint richieste_ristorante_stato_check
  check (stato in ('da_confermare','confermata','rifiutata','annullata'));
alter table beachin.richieste_eventi drop constraint if exists richieste_eventi_stato_check;
alter table beachin.richieste_eventi add constraint richieste_eventi_stato_check
  check (stato in ('da_confermare','confermata','rifiutata','annullata'));

-- funzionalità attiva? (senza riga 'moduli' = attiva, come nell'app)
create or replace function beachin.modifiche_cliente_attive()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select coalesce(valori->'attivi' ? 'sito', true) and not coalesce(valori->'spente' ? 'sito.modifiche', false)
    from beachin.impostazioni where id = 'moduli'
  ), true)
$$;

-- ore prima dell'inizio entro cui il cliente può ancora cambiare (predefinite: tavolo 2, evento 24)
create or replace function beachin.ore_limite_cliente(p_evento boolean)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  select valori->>(case when p_evento then 'prenotazioniCliente.oreEvento' else 'prenotazioniCliente.oreTavolo' end)
    into v from beachin.impostazioni where id = 'stabilimento';
  return greatest(0, coalesce(nullif(v, '')::numeric, case when p_evento then 24 else 2 end));
exception when others then
  return case when p_evento then 24 else 2 end;
end $$;

-- inizio della prenotazione (ora di Roma): tavolo = data + ora (o 12:30 / 19:30 dal turno), evento = mezzanotte del giorno
create or replace function beachin.inizio_prenotazione(p_data text, p_turno text, p_ora text)
returns timestamptz language sql immutable set search_path = '' as $$
  select ((p_data || ' ' || coalesce(nullif(p_ora, ''), case p_turno when 'pranzo' then '12:30' when 'cena' then '19:30' else '00:00' end))::timestamp)
    at time zone 'Europe/Rome'
$$;

-- dettagli della prenotazione col codice segreto (null = codice sconosciuto)
create or replace function beachin.prenotazione_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r beachin.richieste_ristorante;
  e beachin.richieste_eventi;
  v_ore numeric;
  v_inizio timestamptz;
  v_scadenza timestamptz;
  v_out jsonb;
begin
  if p_token is null or length(p_token) < 32 then return null; end if;
  select * into r from beachin.richieste_ristorante where token_cliente = p_token;
  if found then
    v_ore := beachin.ore_limite_cliente(false);
    v_inizio := beachin.inizio_prenotazione(r.data, r.turno, r.ora);
    v_out := jsonb_build_object('tipo', 'tavolo', 'id', r.id, 'nome', r.nome, 'data', r.data, 'turno', r.turno, 'ora', r.ora,
      'persone', r.coperti, 'stato', r.stato, 'note', r.note);
  else
    select * into e from beachin.richieste_eventi where token_cliente = p_token;
    if not found then return null; end if;
    v_ore := beachin.ore_limite_cliente(true);
    v_inizio := beachin.inizio_prenotazione(e.evento_data, null, null);
    v_out := jsonb_build_object('tipo', 'evento', 'id', e.id, 'nome', e.nome, 'data', e.evento_data, 'evento_id', e.evento_id,
      'evento_nome', e.evento_nome, 'persone', e.persone, 'stato', e.stato, 'codice', e.codice, 'arrivati', e.arrivati);
  end if;
  v_scadenza := v_inizio - make_interval(secs => (v_ore * 3600)::double precision);
  return v_out || jsonb_build_object(
    'attiva', beachin.modifiche_cliente_attive(),
    'ore_limite', v_ore,
    'scadenza', v_scadenza,
    'modificabile', beachin.modifiche_cliente_attive() and now() < v_scadenza
      and (v_out->>'stato') in ('da_confermare', 'confermata') and coalesce((v_out->>'arrivati')::int, 0) = 0
  );
end $$;

-- modifica: tavolo = data, turno, ora, persone; evento = solo persone. Risponde { ok } o { errore }.
create or replace function beachin.modifica_prenotazione_cliente(p_token text, p_data text, p_turno text, p_ora text, p_persone int)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  p jsonb := beachin.prenotazione_cliente(p_token);
  v_ts bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if p is null then return jsonb_build_object('errore', 'Prenotazione non trovata'); end if;
  if not (p->>'modificabile')::boolean then return jsonb_build_object('errore', 'Non è più possibile modificare online'); end if;
  if p->>'tipo' = 'evento' then
    if p_persone is null or p_persone < 1 or p_persone > 20 then return jsonb_build_object('errore', 'Numero di persone non valido'); end if;
    update beachin.richieste_eventi set persone = p_persone, azione_cliente = 'modifica', azione_ts = v_ts
      where token_cliente = p_token;
    return jsonb_build_object('ok', true);
  end if;
  if coalesce(p_turno, '') not in ('pranzo', 'cena') or coalesce(p_data, '') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_ora, '') !~ '^\d{2}:\d{2}$'
    or p_persone is null or p_persone < 1 or p_persone > 12 then
    return jsonb_build_object('errore', 'Dati non validi');
  end if;
  if exists (select 1 from beachin.giorni_chiusi where data = p_data) then
    return jsonb_build_object('errore', 'Il ristorante è chiuso quel giorno');
  end if;
  if now() >= beachin.inizio_prenotazione(p_data, p_turno, p_ora) - make_interval(secs => (beachin.ore_limite_cliente(false) * 3600)::double precision) then
    return jsonb_build_object('errore', 'Data o orario troppo vicini');
  end if;
  update beachin.richieste_ristorante set data = p_data, turno = p_turno, ora = p_ora, coperti = p_persone,
    azione_cliente = 'modifica', azione_ts = v_ts where token_cliente = p_token;
  -- prenotazione già confermata: si aggiorna anche in sala (tavolo da riassegnare se cambia giorno o turno)
  update beachin.prenotazioni_ristorante set
      tavolo_id = case when data = p_data and turno = p_turno then tavolo_id end,
      data = p_data, turno = p_turno, ora = p_ora, coperti = p_persone
    where id = 'PR-' || (p->>'id') and stato <> 'annullata';
  return jsonb_build_object('ok', true);
end $$;

create or replace function beachin.annulla_prenotazione_cliente(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  p jsonb := beachin.prenotazione_cliente(p_token);
  v_ts bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if p is null then return jsonb_build_object('errore', 'Prenotazione non trovata'); end if;
  if not (p->>'modificabile')::boolean then return jsonb_build_object('errore', 'Non è più possibile annullare online'); end if;
  if p->>'tipo' = 'evento' then
    update beachin.richieste_eventi set stato = 'annullata', azione_cliente = 'annulla', azione_ts = v_ts where token_cliente = p_token;
  else
    update beachin.richieste_ristorante set stato = 'annullata', azione_cliente = 'annulla', azione_ts = v_ts where token_cliente = p_token;
    update beachin.prenotazioni_ristorante set stato = 'annullata' where id = 'PR-' || (p->>'id');
  end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function beachin.prenotazione_cliente(text) from public;
revoke all on function beachin.modifica_prenotazione_cliente(text, text, text, text, int) from public;
revoke all on function beachin.annulla_prenotazione_cliente(text) from public;
grant execute on function beachin.prenotazione_cliente(text) to anon, authenticated, service_role;
grant execute on function beachin.modifica_prenotazione_cliente(text, text, text, text, int) to anon, authenticated, service_role;
grant execute on function beachin.annulla_prenotazione_cliente(text) to anon, authenticated, service_role;

-- azione del cliente → mail al cliente (beachin-email) e push allo staff (beachin-push, tipo "cliente"), con le funzioni esistenti
drop trigger if exists email_azione_cliente on beachin.richieste_ristorante;
create trigger email_azione_cliente after update of azione_ts on beachin.richieste_ristorante
  for each row when (new.azione_ts is distinct from old.azione_ts and position('@' in new.email) > 0) execute function beachin.email_richiesta();
drop trigger if exists email_azione_cliente on beachin.richieste_eventi;
create trigger email_azione_cliente after update of azione_ts on beachin.richieste_eventi
  for each row when (new.azione_ts is distinct from old.azione_ts and position('@' in new.email) > 0) execute function beachin.email_richiesta();
drop trigger if exists notifica_azione_cliente on beachin.richieste_ristorante;
create trigger notifica_azione_cliente after update of azione_ts on beachin.richieste_ristorante
  for each row when (new.azione_ts is distinct from old.azione_ts) execute function beachin.notifica_nuova_richiesta('cliente');
drop trigger if exists notifica_azione_cliente on beachin.richieste_eventi;
create trigger notifica_azione_cliente after update of azione_ts on beachin.richieste_eventi
  for each row when (new.azione_ts is distinct from old.azione_ts) execute function beachin.notifica_nuova_richiesta('cliente');
