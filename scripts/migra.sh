#!/usr/bin/env bash
# Applica le migrazioni di supabase/migrations/ non ancora registrate in beachin.migrazioni.
# Uso: DB_URL=postgresql://... scripts/migra.sh [--baseline]
#   --baseline  registra come applicate tutte le migrazioni senza eseguirle (DB già allineato a mano).
# Ogni file gira in una transazione; al primo errore si ferma.
set -euo pipefail
: "${DB_URL:?serve DB_URL}"
cd "$(dirname "$0")/../supabase/migrations"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -c "set client_min_messages = warning;
create schema if not exists beachin;
create table if not exists beachin.migrazioni (nome text primary key, applicata_il timestamptz not null default now());
revoke all on beachin.migrazioni from anon, authenticated;"

for f in $(ls *.sql | sort); do
  fatta=$("${PSQL[@]}" -tA -c "select 1 from beachin.migrazioni where nome = '$f'")
  [ -n "$fatta" ] && continue
  if [ "${1:-}" = "--baseline" ]; then
    echo "baseline: $f"
  else
    echo "applico: $f"
    "${PSQL[@]}" -1 -f "$f"
  fi
  "${PSQL[@]}" -c "insert into beachin.migrazioni (nome) values ('$f')"
done
echo "migrazioni allineate"
