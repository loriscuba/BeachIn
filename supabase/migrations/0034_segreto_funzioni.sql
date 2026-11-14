-- Edge Function push ed email chiamabili solo dai trigger del database (nov 2026).
-- Prima chiunque avesse la chiave anon (che sta nel sito) poteva mandare push a tutti i clienti
-- e mail a qualsiasi indirizzo col mittente del lido. Ora i trigger mandano l'header
-- x-beachin-segreto con un valore generato qui, che le funzioni confrontano con questa tabella.
-- Il segreto non esce mai dal database: niente da configurare a mano.

create table if not exists beachin.segreti_interni (nome text primary key, valore text not null);
alter table beachin.segreti_interni enable row level security;
revoke all on beachin.segreti_interni from anon, authenticated;

insert into beachin.segreti_interni (nome, valore)
values ('funzioni', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (nome) do nothing;

create or replace function beachin.segreto_funzioni() returns text
language sql stable security definer set search_path = '' as $$
  select valore from beachin.segreti_interni where nome = 'funzioni'
$$;
revoke execute on function beachin.segreto_funzioni() from public, anon, authenticated;

-- Aggiunge l'header ai trigger che chiamano le funzioni. Si modifica il testo esistente invece di
-- riscriverlo, perché URL e chiave possono essere diversi tra un'installazione e l'altra (Vault o scritti).
do $$
declare
  f regprocedure;
  def text;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'beachin' and p.prosrc ilike '%net.http_post%'
  loop
    def := pg_get_functiondef(f);
    continue when def ilike '%x-beachin-segreto%';
    if def not ilike '%''Content-Type'', ''application/json''%' then
      raise warning 'beachin: header del segreto non aggiunto a %, va sistemata a mano', f;
      continue;
    end if;
    def := replace(def, '''Content-Type'', ''application/json''',
                        '''Content-Type'', ''application/json'', ''x-beachin-segreto'', beachin.segreto_funzioni()');
    execute def;
  end loop;
end $$;
