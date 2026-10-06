#!/bin/bash
# Script di avvio (user-data) della VM Oracle prod-db: Supabase self-hosted (Docker) dietro Caddy.
# Prima del lancio sostituire __DOMINIO__ (es. api-1-2-3-4.sslip.io) e __PAR_BACKUP__ (URL pre-autenticato
# di sola scrittura sul bucket prod-backup, termina con /o/). I segreti si generano qui e restano sulla VM
# (/opt/supabase/docker/.env); in console viene stampata solo la chiave anon, che è pubblica.
set -eux
DOMINIO=__DOMINIO__
PAR_BACKUP='__PAR_BACKUP__'
DIR=/opt/supabase/docker

# Firewall interno: apri 80/443 (Postgres e Kong restano chiusi dalla security list di Oracle)
iptables -I INPUT 5 -p tcp --dport 80 -m state --state NEW -j ACCEPT
iptables -I INPUT 5 -p tcp --dport 443 -m state --state NEW -j ACCEPT
netfilter-persistent save

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y caddy git curl unattended-upgrades
curl -fsSL https://get.docker.com | sh

# Supabase (docker compose ufficiale)
git clone --depth 1 https://github.com/supabase/supabase /tmp/supabase
mkdir -p /opt/supabase && cp -r /tmp/supabase/docker "$DIR" && rm -rf /tmp/supabase
cd "$DIR"
cp .env.example .env
chmod 600 .env

python3 - "$DOMINIO" <<'PY'
import base64, hashlib, hmac, json, re, secrets, sys, time
dominio = sys.argv[1]
def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
def jwt(ruolo, chiave):
    h = b64(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    ora = int(time.time())
    p = b64(json.dumps({'role': ruolo, 'iss': 'supabase', 'iat': ora, 'exp': ora + 10 * 365 * 86400}).encode())
    firma = b64(hmac.new(chiave.encode(), f'{h}.{p}'.encode(), hashlib.sha256).digest())
    return f'{h}.{p}.{firma}'
jwt_secret = secrets.token_hex(32)
valori = {
    'POSTGRES_PASSWORD': secrets.token_hex(24),
    'JWT_SECRET': jwt_secret,
    'ANON_KEY': jwt('anon', jwt_secret),
    'SERVICE_ROLE_KEY': jwt('service_role', jwt_secret),
    'DASHBOARD_USERNAME': 'beachin',
    'DASHBOARD_PASSWORD': secrets.token_hex(16),
    'SECRET_KEY_BASE': secrets.token_hex(32),
    'VAULT_ENC_KEY': secrets.token_hex(16),
    'PG_META_CRYPTO_KEY': secrets.token_hex(16),
    'LOGFLARE_PUBLIC_ACCESS_TOKEN': secrets.token_hex(24),
    'LOGFLARE_PRIVATE_ACCESS_TOKEN': secrets.token_hex(24),
    'POOLER_TENANT_ID': 'beachin',
    'SITE_URL': 'https://' + dominio.replace('api-', '', 1),
    'API_EXTERNAL_URL': 'https://' + dominio,
    'SUPABASE_PUBLIC_URL': 'https://' + dominio,
    'PGRST_DB_SCHEMAS': 'public,storage,graphql_public,beachin',
    'FUNCTIONS_VERIFY_JWT': 'true',
}
testo = open('.env').read()
for k, v in valori.items():
    testo, n = re.subn(rf'^{k}=.*$', f'{k}={v}', testo, flags=re.M)
    if not n: testo += f'\n{k}={v}'
open('.env', 'w').write(testo + '\nGROQ_API_KEY=\n')
PY

# GROQ_API_KEY per le Edge Functions (impostata poi dal workflow "Deploy")
cat > docker-compose.override.yml <<'YML'
services:
  functions:
    environment:
      GROQ_API_KEY: ${GROQ_API_KEY:-}
YML

docker compose pull -q
docker compose up -d

# psql dentro il container (usato dal workflow "Deploy" via SSH e dal backup)
cat > /usr/local/bin/beachin-psql <<'SH'
#!/bin/bash
set -a; . /opt/supabase/docker/.env; set +a
exec docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db psql -h localhost -U postgres -d postgres "$@"
SH
chmod 755 /usr/local/bin/beachin-psql

# Backup notturno del database nel bucket prod-backup (db/AAAAMMGG-HHMM.dump), tiene le versioni del bucket
cat > /usr/local/bin/beachin-backup <<SH
#!/bin/bash
set -euo pipefail
set -a; . /opt/supabase/docker/.env; set +a
docker exec -e PGPASSWORD="\$POSTGRES_PASSWORD" supabase-db pg_dump -h localhost -U supabase_admin -Fc postgres \
  | curl -fsS -X PUT --data-binary @- '${PAR_BACKUP}db/'"\$(date -u +%Y%m%d-%H%M)".dump
SH
chmod 700 /usr/local/bin/beachin-backup
echo '17 2 * * * root /usr/local/bin/beachin-backup >> /var/log/beachin-backup.log 2>&1' > /etc/cron.d/beachin-backup

# Caddy: esposte solo le API pubbliche; Studio solo via tunnel SSH (porta 8000 della VM)
cat > /etc/caddy/Caddyfile <<CF
$DOMINIO {
	encode zstd gzip
	@api path /rest/* /auth/* /realtime/* /storage/* /functions/* /graphql/*
	handle @api {
		reverse_proxy localhost:8000
	}
	handle {
		respond "BeachIn API" 404
	}
}
CF
systemctl enable caddy
systemctl restart caddy

# Attendi che l'API risponda, poi stampa lo stato in console (letto con "console-history")
. "$DIR/.env"
for i in $(seq 60); do
  curl -fsS -o /dev/null "http://localhost:8000/rest/v1/" -H "apikey: $ANON_KEY" && break
  sleep 10
done
docker compose ps --format '{{.Name}} {{.Status}}' | sed 's/^/BEACHIN-STATO /'
curl -s -o /dev/null -w 'BEACHIN-REST %{http_code}\n' "http://localhost:8000/rest/v1/" -H "apikey: $ANON_KEY"
echo "BEACHIN-ANON $ANON_KEY"
