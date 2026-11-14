-- Controllo mail di conferma: ogni 5 minuti chiede a Brevo gli eventi degli ultimi 2 giorni e conta le mail BeachIn
-- accettate da più di 20 minuti ma mai consegnate né rimbalzate ("ferme in coda", come il 13/11/2026).
-- pg_net è asincrono: ogni giro legge la risposta del giro prima e poi lancia la nuova richiesta.
-- Il risultato finisce in beachin.monitor_riepilogo (mail_ferme, mail_errori_24h), letto da IPA Monitor,
-- che con mail_ferme > 0 per due raccolte di fila manda la notifica push.
-- Chiave Brevo dal Vault (beachin_brevo_key): senza chiave il controllo non fa niente.

create table if not exists beachin.mail_controllo (
  id              int primary key default 1 check (id = 1),
  richiesta_id    bigint,
  controllato_il  timestamptz,
  mail_ferme      int not null default 0,
  mail_errori_24h int not null default 0,
  ferme           jsonb
);
insert into beachin.mail_controllo (id) values (1) on conflict do nothing;
alter table beachin.mail_controllo enable row level security;
revoke all on beachin.mail_controllo from public, anon, authenticated;

create or replace function beachin.controlla_mail() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id  bigint;
  v_res record;
  v_key text;
begin
  select richiesta_id into v_id from beachin.mail_controllo where id = 1;
  if v_id is not null then
    select status_code, content into v_res from net._http_response where id = v_id;
    if found and v_res.status_code = 200 then
      with e as (
        select x->>'messageId' as mid, x->>'event' as tipo, (x->>'date')::timestamptz as quando,
               x->>'subject' as oggetto, coalesce(x->>'tag', x->>'tags', '') as tag
        from jsonb_array_elements(coalesce(v_res.content::jsonb->'events', '[]'::jsonb)) x
      ), m as (
        select mid, max(oggetto) as oggetto,
               min(quando) filter (where tipo = 'requests') as inviata,
               bool_or(tipo in ('delivered', 'hardBounces', 'softBounces', 'blocked', 'invalid', 'error', 'spam')) as chiusa,
               max(quando) filter (where tipo in ('hardBounces', 'blocked', 'invalid', 'error')) as errore_il
        from e group by mid
        having bool_or(tag like '%beachin%')
      )
      update beachin.mail_controllo set
        controllato_il  = now(),
        mail_ferme      = (select count(*) from m where not chiusa and inviata between now() - interval '24 hours' and now() - interval '20 minutes'),
        mail_errori_24h = (select count(*) from m where errore_il > now() - interval '24 hours'),
        ferme           = (select jsonb_agg(jsonb_build_object('oggetto', oggetto, 'inviata', inviata) order by inviata) from m
                           where not chiusa and inviata between now() - interval '24 hours' and now() - interval '20 minutes')
      where id = 1;
    end if;
  end if;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'beachin_brevo_key';
  if v_key is null then return; end if;
  update beachin.mail_controllo set richiesta_id = net.http_get(
    url     := 'https://api.brevo.com/v3/smtp/statistics/events?limit=2500&sort=desc&days=2',
    headers := jsonb_build_object('api-key', v_key, 'accept', 'application/json')
  ) where id = 1;
end $$;
revoke all on function beachin.controlla_mail() from public, anon, authenticated;

-- riepilogo per IPA Monitor: stesse colonne di 0009 più lo stato delle mail
create or replace view beachin.monitor_riepilogo as
select
  now()                                                                               as letto_il,
  (select count(*) from beachin.comande
     where creata_il >= date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome') as comande_oggi,
  (select count(*) from beachin.comande where stato = 'in_attesa')                    as comande_in_attesa,
  (select max(creata_il) from beachin.comande)                                        as ultima_comanda,
  (select count(*) from beachin.richieste_ristorante where stato <> 'confermata')     as richieste_ristorante_aperte,
  (select count(*) from beachin.richieste_eventi where stato <> 'confermata')         as richieste_eventi_aperte,
  (select count(*) from beachin.push_iscrizioni)                                      as push_iscrizioni,
  (select max(ultimo) from beachin.push_invii)                                        as ultimo_push,
  (select mail_ferme from beachin.mail_controllo where id = 1)                         as mail_ferme,
  (select mail_errori_24h from beachin.mail_controllo where id = 1)                   as mail_errori_24h,
  (select controllato_il from beachin.mail_controllo where id = 1)                    as mail_controllate_il;
revoke all on beachin.monitor_riepilogo from public, anon, authenticated;

-- ogni 5 minuti, solo dove c'è pg_cron
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'beachin-controllo-mail';
    perform cron.schedule('beachin-controllo-mail', '*/5 * * * *', 'select beachin.controlla_mail()');
  end if;
end $$;
