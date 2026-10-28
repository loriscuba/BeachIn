-- Eventi e lavagnetta con "Salva" (bozza, non visibile ai clienti) e "Pubblica" separati (ott 2026).
-- Alla pubblicazione parte la notifica push all'app clienti (/comandapp) di chi ha dato il permesso.

-- Eventi: colonna `pubblicato` (gli eventi già presenti restano pubblicati).
alter table beachin.eventi add column if not exists pubblicato boolean not null default true;

-- Lavagnetta: la bozza sta in `sito_contenuti` (riga `lavagnetta_bozza`), la pubblicazione scrive la riga
-- `lavagnetta_pubblicata` (ts): la notifica parte da lì, non più a ogni voce inserita o modificata.
drop trigger if exists notifica_lavagnetta_nuova on beachin.lavagnetta;
drop trigger if exists notifica_lavagnetta_modificata on beachin.lavagnetta;

-- Stessa funzione di 0005: la lavagnetta ora si pubblica a mano, basta un freno di 1 minuto contro il doppio tocco.
create or replace function beachin.notifica_app_clienti()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'beachin_functions_url');
  v_anon text := (select decrypted_secret from vault.decrypted_secrets where name = 'beachin_anon_key');
begin
  if v_url is null or v_anon is null then return null; end if;
  if tg_argv[0] = 'lavagnetta' then
    update beachin.push_invii set ultimo = now() where tipo = 'lavagnetta' and ultimo < now() - interval '1 minute';
    if not found then return null; end if;
  end if;
  perform net.http_post(
    url := v_url || '/beachin-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon),
    body := jsonb_build_object('tipo', tg_argv[0], 'record', to_jsonb(new))
  );
  return null;
end $$;

drop trigger if exists notifica_lavagnetta_pubblicata on beachin.sito_contenuti;
create trigger notifica_lavagnetta_pubblicata after insert or update on beachin.sito_contenuti
  for each row when (new.id = 'lavagnetta_pubblicata') execute function beachin.notifica_app_clienti('lavagnetta');

-- Evento pubblicato (nuovo o tolto dalla bozza), solo se non è già passato. I dati iniziali (E-01, E-02…) non notificano.
drop trigger if exists notifica_evento_nuovo on beachin.eventi;
create trigger notifica_evento_nuovo after insert on beachin.eventi
  for each row when (new.pubblicato and new.id !~ '^E-[0-9]+$' and new.data >= to_char(now(), 'YYYY-MM-DD'))
  execute function beachin.notifica_app_clienti('evento_pubblicato');
drop trigger if exists notifica_evento_pubblicato on beachin.eventi;
create trigger notifica_evento_pubblicato after update on beachin.eventi
  for each row when (new.pubblicato and not old.pubblicato and new.data >= to_char(now(), 'YYYY-MM-DD'))
  execute function beachin.notifica_app_clienti('evento_pubblicato');
