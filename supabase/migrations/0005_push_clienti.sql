-- Notifiche push anche per l'app clienti (/comandapp): nuova news e lavagna del giorno aggiornata.
-- Stesso telefono può avere app admin e app clienti (stesso service worker → stessa iscrizione): una riga per app.
alter table beachin.push_iscrizioni add column if not exists app text not null default 'admin';
alter table beachin.push_iscrizioni drop constraint if exists push_iscrizioni_pkey;
alter table beachin.push_iscrizioni add primary key (endpoint, app);

drop function if exists beachin.registra_push(text, text, text, text);
create or replace function beachin.registra_push(p_endpoint text, p_p256dh text, p_auth text, p_url text, p_app text default 'admin')
returns void language sql security definer set search_path = '' as $$
  insert into beachin.push_iscrizioni (endpoint, p256dh, auth, url, app)
  values (p_endpoint, p_p256dh, p_auth, p_url, case when p_app = 'clienti' then 'clienti' else 'admin' end)
  on conflict (endpoint, app) do update set p256dh = excluded.p256dh, auth = excluded.auth, url = excluded.url;
$$;
revoke all on function beachin.registra_push(text, text, text, text, text) from public;
grant execute on function beachin.registra_push(text, text, text, text, text) to anon, authenticated;

-- Anti-raffica: la lavagna si modifica riga per riga (anche mentre si scrive), quindi al massimo un avviso ogni 15 minuti.
create table if not exists beachin.push_invii (tipo text primary key, ultimo timestamptz not null default 'epoch');
alter table beachin.push_invii enable row level security;
revoke all on beachin.push_invii from anon, authenticated;
insert into beachin.push_invii (tipo) values ('lavagnetta') on conflict do nothing;

-- TG_ARGV[0] = tipo inviato alla Edge Function (notizia | lavagnetta).
create or replace function beachin.notifica_app_clienti()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'beachin_functions_url');
  v_anon text := (select decrypted_secret from vault.decrypted_secrets where name = 'beachin_anon_key');
begin
  if v_url is null or v_anon is null then return null; end if;
  if tg_argv[0] = 'lavagnetta' then
    update beachin.push_invii set ultimo = now() where tipo = 'lavagnetta' and ultimo < now() - interval '15 minutes';
    if not found then return null; end if;
  end if;
  perform net.http_post(
    url := v_url || '/beachin-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon),
    body := jsonb_build_object('tipo', tg_argv[0], 'record', to_jsonb(new))
  );
  return null;
end $$;

drop trigger if exists notifica_nuova_notizia on beachin.notizie;
create trigger notifica_nuova_notizia after insert on beachin.notizie
  for each row execute function beachin.notifica_app_clienti('notizia');
drop trigger if exists notifica_lavagnetta_nuova on beachin.lavagnetta;
create trigger notifica_lavagnetta_nuova after insert on beachin.lavagnetta
  for each row execute function beachin.notifica_app_clienti('lavagnetta');
drop trigger if exists notifica_lavagnetta_modificata on beachin.lavagnetta;
create trigger notifica_lavagnetta_modificata after update on beachin.lavagnetta
  for each row when ((old.nome, old.descrizione, old.prezzo) is distinct from (new.nome, new.descrizione, new.prezzo))
  execute function beachin.notifica_app_clienti('lavagnetta');
