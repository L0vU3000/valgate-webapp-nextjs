#!/usr/bin/env bash
#
# Per-boot startup for the Valgate local development stack.
#
# Brings up the two background services the app needs to talk to a local
# database with zero cloud secrets:
#   1. PostgreSQL 16  — the actual database (listening on 127.0.0.1:5432)
#   2. Neon WebSocket proxy — lets the Neon serverless driver reach local
#      Postgres (listening on 127.0.0.1:5433, forwarding to 5432)
#
# This script is idempotent: it is safe to run on every boot and will not start
# a second copy of a service that is already running.
#
set -euo pipefail

WSPROXY_BIN="$HOME/.local/bin/wsproxy"
WSPROXY_LOG="/tmp/wsproxy.log"

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

echo "[start-dev-env] Starting Neon WebSocket proxy on 127.0.0.1:5433..."
# Only start the proxy if nothing is already listening on port 5433.
if (exec 3<>/dev/tcp/127.0.0.1/5433) 2>/dev/null; then
  echo "[start-dev-env] Neon proxy already running."
else
  # ALLOW_ADDR_REGEX restricts the proxy to forwarding to the local database only.
  LISTEN_PORT=":5433" \
  ALLOW_ADDR_REGEX='^(127\.0\.0\.1|localhost):5432$' \
    nohup "$WSPROXY_BIN" >"$WSPROXY_LOG" 2>&1 &
  # Give it a moment and confirm it came up.
  for _ in $(seq 1 15); do
    if (exec 3<>/dev/tcp/127.0.0.1/5433) 2>/dev/null; then
      break
    fi
    sleep 1
  done
  if (exec 3<>/dev/tcp/127.0.0.1/5433) 2>/dev/null; then
    echo "[start-dev-env] Neon proxy is ready (logs: $WSPROXY_LOG)."
  else
    echo "[start-dev-env] ERROR: Neon proxy did not start; see $WSPROXY_LOG" >&2
    exit 1
  fi
fi

echo "[start-dev-env] Local database stack is up."
