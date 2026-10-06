#!/usr/bin/env bash
# Sulla VM prod-web (copiato in /usr/local/bin/beachin-rilascio dal workflow "Deploy").
# Uso:  beachin-rilascio <archivio.tgz> <nome-versione>   pubblica una nuova versione
#       beachin-rilascio --rollback                       torna alla versione precedente
#       beachin-rilascio --lista                          versioni presenti (* = attiva)
# Ogni versione resta in /var/www/rilasci/<nome>; /var/www/beachin è un link a quella attiva (root di Caddy).
set -euo pipefail
RIL=/var/www/rilasci
ATTIVA=/var/www/beachin
TIENI=5
mkdir -p "$RIL"

# Primo giro: /var/www/beachin era una cartella vera (cloud-init) → diventa la versione "iniziale"
if [ -d "$ATTIVA" ] && [ ! -L "$ATTIVA" ]; then
  mv "$ATTIVA" "$RIL/iniziale"
  ln -sfn "$RIL/iniziale" "$ATTIVA"
fi

attiva() { basename "$(readlink -f "$ATTIVA")"; }

case "${1:-}" in
  --lista)
    for d in $(ls -1t "$RIL"); do [ "$d" = "$(attiva)" ] && echo "* $d" || echo "  $d"; done ;;
  --rollback)
    prec=$(ls -1t "$RIL" | grep -vx "$(attiva)" | head -1)
    [ -n "$prec" ] || { echo "nessuna versione precedente"; exit 1; }
    ln -sfn "$RIL/$prec" "$ATTIVA.tmp" && mv -T "$ATTIVA.tmp" "$ATTIVA"
    echo "attiva: $prec" ;;
  *)
    archivio=${1:?archivio .tgz}; nome=${2:?nome versione}
    dest="$RIL/$nome"
    rm -rf "$dest"; mkdir -p "$dest"
    tar xzf "$archivio" -C "$dest"
    touch "$dest"   # l'ordine delle versioni usa la data della cartella, non quella dell'archivio
    [ -f "$dest/index.html" ] || { echo "index.html mancante"; rm -rf "$dest"; exit 1; }
    ln -sfn "$dest" "$ATTIVA.tmp" && mv -T "$ATTIVA.tmp" "$ATTIVA"
    rm -f "$archivio"
    ls -1t "$RIL" | tail -n +$((TIENI + 1)) | { grep -vx "$nome" || true; } | while read -r v; do rm -rf "${RIL:?}/$v"; done
    echo "attiva: $nome" ;;
esac
