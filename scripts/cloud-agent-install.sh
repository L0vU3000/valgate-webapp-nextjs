#!/usr/bin/env bash
#
# Cloud Agent install step for the Valgate web app.
#
# Prepares a fully local, secret-free development stack so the app runs end to
# end without any hosted services:
#   - installs PostgreSQL 16 (the app database)
#   - builds the Neon WebSocket proxy (so the Neon serverless driver can reach
#     local Postgres)
#   - installs Node dependencies
#   - applies database migrations and loads the demo seed data
#
# This runs after the repository is checked out. It is idempotent: every step
# checks whether its work is already done, so it is safe to run repeatedly.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# ---------------------------------------------------------------------------
# 1. System package: PostgreSQL 16
# ---------------------------------------------------------------------------
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "[install] Installing PostgreSQL..."
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
else
  echo "[install] PostgreSQL already installed."
fi

# ---------------------------------------------------------------------------
# 2. Neon WebSocket proxy binary (built once with Go, which the base image has)
# ---------------------------------------------------------------------------
WSPROXY_BIN="$HOME/.local/bin/wsproxy"
if [ ! -x "$WSPROXY_BIN" ]; then
  echo "[install] Building Neon WebSocket proxy..."
  mkdir -p "$HOME/.local/bin"
  GOBIN="$HOME/.local/bin" go install github.com/neondatabase/wsproxy@latest
else
  echo "[install] Neon proxy binary already present."
fi

# ---------------------------------------------------------------------------
# 3. Create the app database role and database (idempotent)
# ---------------------------------------------------------------------------
echo "[install] Starting PostgreSQL to create role/database..."
sudo pg_ctlcluster 16 main start 2>/dev/null || true
for _ in $(seq 1 30); do
  pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break
  sleep 1
done

sudo -u postgres psql -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='valgate') THEN CREATE ROLE valgate LOGIN PASSWORD 'valgate' SUPERUSER; END IF; END \$\$;"

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='valgate'" | grep -q 1; then
  sudo -u postgres createdb -O valgate valgate
fi
echo "[install] Database 'valgate' is ready."

# ---------------------------------------------------------------------------
# 4. Local environment file (gitignored)
# ---------------------------------------------------------------------------
# A real DATABASE_URL or NEXT_PUBLIC_MAPBOX_TOKEN supplied as a Cursor secret is
# injected into process.env and takes precedence over these local defaults, so
# the app automatically uses hosted services when they are configured.
if [ ! -f "$REPO_DIR/.env.local" ]; then
  echo "[install] Writing .env.local..."
  cat > "$REPO_DIR/.env.local" <<'ENV'
# Local Cloud Agent development environment (gitignored).
DATABASE_URL=postgres://valgate:valgate@127.0.0.1:5432/valgate
NEON_LOCAL_PROXY_HOST=127.0.0.1:5433
NEXT_PUBLIC_MAPBOX_TOKEN=pk.local-dev-placeholder
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
ENV
else
  echo "[install] .env.local already exists; leaving it untouched."
fi

# ---------------------------------------------------------------------------
# 5. Node dependencies
# ---------------------------------------------------------------------------
echo "[install] Installing Node dependencies (npm ci)..."
npm ci

# ---------------------------------------------------------------------------
# 6. Database schema + demo data
# ---------------------------------------------------------------------------
# Bring the Neon proxy up so the seed script (which uses the app's Neon driver)
# can reach local Postgres.
bash "$REPO_DIR/scripts/cloud-agent-start.sh"

echo "[install] Applying migrations..."
npm run db:migrate

echo "[install] Loading demo seed data..."
npm run seed:neon

echo "[install] Done. Local Valgate dev stack is ready."
