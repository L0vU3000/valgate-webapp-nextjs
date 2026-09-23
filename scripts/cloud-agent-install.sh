#!/usr/bin/env bash
#
# Cloud Agent install step for the Valgate web app.
#
# Prepares a fully local, secret-free development database so the app runs end to
# end without any hosted services:
#   - installs PostgreSQL 16 (the app database)
#   - installs Node dependencies
#   - applies database migrations and loads the demo seed data
#
# The app talks to this local Postgres directly over TCP (node-postgres); see
# lib/db/client.ts, which selects the pg driver whenever DATABASE_URL is a
# localhost URL and Neon serverless otherwise. Idempotent: safe to run repeatedly.
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
# 2. Start PostgreSQL and create the app role + database (idempotent)
# ---------------------------------------------------------------------------
echo "[install] Starting PostgreSQL..."
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
# 3. Local environment file (gitignored)
# ---------------------------------------------------------------------------
# A real DATABASE_URL or NEXT_PUBLIC_MAPBOX_TOKEN supplied as a Cursor secret is
# injected into process.env and takes precedence over these local defaults, so
# the app automatically uses hosted services when they are configured.
if [ ! -f "$REPO_DIR/.env.local" ]; then
  echo "[install] Writing .env.local..."
  cat > "$REPO_DIR/.env.local" <<'ENV'
# Local Cloud Agent development environment (gitignored).
DATABASE_URL=postgres://valgate:valgate@127.0.0.1:5432/valgate
NEXT_PUBLIC_MAPBOX_TOKEN=pk.local-dev-placeholder
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
ENV
else
  echo "[install] .env.local already exists; leaving it untouched."
fi

# ---------------------------------------------------------------------------
# 4. Node dependencies
# ---------------------------------------------------------------------------
echo "[install] Installing Node dependencies (npm ci)..."
npm ci

# ---------------------------------------------------------------------------
# 5. Database schema + demo data
# ---------------------------------------------------------------------------
echo "[install] Applying migrations..."
npm run db:migrate

echo "[install] Loading demo seed data..."
npm run seed:neon

echo "[install] Done. Local Valgate dev stack is ready."
