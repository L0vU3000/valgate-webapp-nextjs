#!/usr/bin/env bash
#
# Per-boot startup for the Valgate local development database.
#
# Brings up local PostgreSQL 16 on 127.0.0.1:5432. The app connects to it
# directly over TCP via node-postgres — see lib/db/client.ts, which selects the
# pg driver whenever DATABASE_URL points at localhost (and Neon serverless
# otherwise). Idempotent: safe to run on every boot.
#
set -euo pipefail

echo "[start-dev-env] Starting PostgreSQL 16..."
# pg_ctlcluster returns non-zero if the cluster is already running; that is fine.
sudo pg_ctlcluster 16 main start 2>/dev/null || true

# Wait until Postgres is actually accepting connections before continuing.
for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "[start-dev-env] ERROR: PostgreSQL did not become ready on 127.0.0.1:5432" >&2
  exit 1
fi
echo "[start-dev-env] PostgreSQL is ready."
