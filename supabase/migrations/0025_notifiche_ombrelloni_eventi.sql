-- Notifiche a telefono bloccato (app staff) anche per le prenotazioni ombrellone e le richieste per gli eventi (ott 2026).
-- Le prenotazioni ombrellone dal sito passano sul DB (prima restavano nel solo browser che le inviava).
create table if not exists beachin.prenotazioni_online (
  id text primary key,
  ricevuta_il text not null,
  nome text not null,
  email text not null default '',
  telefono text not null default '',
  dal text not null,
  al text not null,
  tipologia_postazione text not null,
  persone int not null default 1,
  stato text not null default 'da_confermare' check (stato in ('da_confermare','confermata','rifiutata')),
  messaggio text,
  ts bigint not null default (extract(epoch from now()) * 1000)::bigint
);
grant select, insert, update, delete on beachin.prenotazioni_online to anon, authenticated, service_role;
alter table beachin.prenotazioni_online enable row level security;
drop policy if exists "demo anon" on beachin.prenotazioni_online;
create policy "demo anon" on beachin.prenotazioni_online for all to anon using (true) with check (true);
-- staff: come le richieste eventi, con il permesso della sezione Sito; i clienti collegati possono solo inviare
drop policy if exists "staff lettura" on beachin.prenotazioni_online;
create policy "staff lettura" on beachin.prenotazioni_online for select to authenticated using (beachin.ha_permesso('sito', 1));
drop policy if exists "staff modifica" on beachin.prenotazioni_online;
create policy "staff modifica" on beachin.prenotazioni_online for all to authenticated
  using (beachin.ha_permesso('sito', 2)) with check (beachin.ha_permesso('sito', 2));
drop policy if exists "clienti invio" on beachin.prenotazioni_online;
create policy "clienti invio" on beachin.prenotazioni_online for insert to authenticated with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='beachin' and tablename='prenotazioni_online') then
    alter publication supabase_realtime add table beachin.prenotazioni_online;
  end if;
end $$;

-- Stessa funzione per tutte le notifiche allo staff: TG_ARGV[0] = tipo per la Edge Function beachin-push
-- (richiesta = tavolo, ombrellone, evento). URL funzioni e chiave anon dal Vault come le altre.
create or replace function beachin.notifica_nuova_richiesta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'beachin_functions_url');
  v_anon text := (select decrypted_secret from vault.decrypted_secrets where name = 'beachin_anon_key');
begin
  if v_url is null or v_anon is null then return new; end if;
  perform net.http_post(
    url := v_url || '/beachin-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon),
    body := jsonb_build_object('tipo', coalesce(tg_argv[0], 'richiesta'), 'record', to_jsonb(new))
  );
  return new;
end $$;

drop trigger if exists notifica_prenotazione_online on beachin.prenotazioni_online;
-- i dati iniziali che l'app semina al primo avvio (id PO-01, PO-02…) non notificano
create trigger notifica_prenotazione_online after insert on beachin.prenotazioni_online
  for each row when (new.stato = 'da_confermare' and new.id !~ '^PO-[0-9]+$') execute function beachin.notifica_nuova_richiesta('ombrellone');
-- le richieste inserite a mano dallo staff (prenotazione in loco) non notificano
drop trigger if exists notifica_richiesta_evento on beachin.richieste_eventi;
create trigger notifica_richiesta_evento after insert on beachin.richieste_eventi
  for each row when (new.stato = 'da_confermare' and coalesce(new.origine, 'sito') <> 'manuale')
  execute function beachin.notifica_nuova_richiesta('evento');
