#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="${ROOT}/docker-compose.db-test.yml"
WAIT_DOCKER="${WAIT_DOCKER:-1}"

wait_for_postgres() {
  if [[ "$WAIT_DOCKER" != "1" ]]; then
    return 0
  fi
  if ! command -v docker >/dev/null 2>&1; then
    if ! command -v psql >/dev/null 2>&1; then
      echo "Install Docker (recommended) or psql + running Postgres." >&2
      echo "Set DATABASE_URL if not using docker-compose.db-test.yml defaults." >&2
      exit 1
    fi
    return 0
  fi
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^valgate-db-test$'; then
    echo "→ Starting test Postgres…"
    docker compose -f "$COMPOSE_FILE" up -d
  fi
  echo "→ Waiting for Postgres…"
  for _ in $(seq 1 30); do
    if docker exec valgate-db-test pg_isready -U valgate -d valgate_test >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Postgres did not become ready." >&2
  exit 1
}

if command -v psql >/dev/null 2>&1 || {
  command -v docker >/dev/null 2>&1 &&
    docker inspect valgate-db-test >/dev/null 2>&1;
}; then
  wait_for_postgres
  "${ROOT}/scripts/db/apply-schema.sh"
  "${ROOT}/scripts/db/run-tests.sh"
else
  echo "→ No psql/Docker; using embedded Postgres (Node)…"
  exec node "${ROOT}/scripts/db/test-schema.mjs"
fi
