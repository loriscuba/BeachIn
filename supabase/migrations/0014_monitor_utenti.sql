-- Utenti online per IPA Monitor: lo staff collegato (beachin.utenti, migrazione 0011) manda un segnale al minuto
-- mentre il gestionale è visibile. La vista beachin.monitor_utenti è letta dal collettore di IPA Monitor
-- (Edge Function `ipa-collect`, ruolo postgres); nessun accesso per anon / authenticated.

-- Prima versione per dispositivi anonimi, esistita solo sul Demo: si rimuove.
drop view if exists beachin.monitor_utenti;
drop function if exists beachin.monitor_segnale(text, text, text);
drop table if exists beachin.presenze;

create table beachin.presenze (
  utente_id       uuid primary key references beachin.utenti(id) on delete cascade,
  ultimo_segnale  timestamptz not null default now()
);
alter table beachin.presenze enable row level security;
revoke all on beachin.presenze from public, anon, authenticated;

create or replace function beachin.monitor_segnale() returns void
language sql security definer set search_path = '' as $$
  insert into beachin.presenze (utente_id)
  select id from beachin.utenti where id = auth.uid() and attivo
  on conflict (utente_id) do update set ultimo_segnale = now();
$$;
revoke all on function beachin.monitor_segnale() from public, anon;
grant execute on function beachin.monitor_segnale() to authenticated;

-- ultimo_login: ultima apertura dell'app con la sessione (mio_profilo aggiorna utenti.ultimo_accesso)
create or replace view beachin.monitor_utenti as
select
  u.id::text                                         as chiave,
  u.nome || coalesce(' (' || u.username || ')', '')  as nome,
  r.nome                                             as ruolo,
  u.ultimo_accesso                                   as ultimo_login,
  greatest(p.ultimo_segnale, u.ultimo_accesso)       as ultima_attivita
from beachin.utenti u
join beachin.ruoli r on r.id = u.ruolo_id
left join beachin.presenze p on p.utente_id = u.id
where u.attivo;
revoke all on beachin.monitor_utenti from public, anon, authenticated;
