#!/usr/bin/env bash
# Applica le migrazioni di supabase/migrations/ non ancora registrate in beachin.migrazioni.
# Uso: DB_URL=postgresql://... scripts/migra.sh [--baseline]          (Supabase Cloud, es. demo)
#      PSQL_CMD="ssh ubuntu@host sudo beachin-psql" scripts/migra.sh  (self-hosted su prod-db)
#   --baseline  registra come applicate tutte le migrazioni senza eseguirle (DB già allineato a mano).
# Ogni file gira in una transazione; al primo errore si ferma. Lo SQL passa sempre da stdin.
set -euo pipefail
cd "$(dirname "$0")/../supabase/migrations"
if [ -n "${PSQL_CMD:-}" ]; then
  read -ra PSQL <<< "$PSQL_CMD"
else
  : "${DB_URL:?serve DB_URL o PSQL_CMD}"
  PSQL=(psql "$DB_URL")
fi
PSQL+=(-v ON_ERROR_STOP=1 -q -X)
sql() { "${PSQL[@]}" "$@" -f -; }

sql <<'SQL'
set client_min_messages = warning;
create schema if not exists beachin;
create table if not exists beachin.migrazioni (nome text primary key, applicata_il timestamptz not null default now());
revoke all on beachin.migrazioni from anon, authenticated;
SQL

for f in $(ls *.sql | sort); do
  fatta=$(echo "select 1 from beachin.migrazioni where nome = '$f'" | sql -tA)
  [ -n "$fatta" ] && continue
  if [ "${1:-}" = "--baseline" ]; then
    echo "baseline: $f"
  else
    echo "applico: $f"
    sql -1 < "$f"
  fi
  echo "insert into beachin.migrazioni (nome) values ('$f')" | sql
done
echo "migrazioni allineate"
