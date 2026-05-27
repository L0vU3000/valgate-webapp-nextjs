#!/usr/bin/env bash
# Shared psql runner: local psql, or docker exec into valgate-db-test.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://valgate:valgate@localhost:5433/valgate_test}"
PGUSER="${PGUSER:-valgate}"
PGDATABASE="${PGDATABASE:-valgate_test}"
CONTAINER="${VALGATE_DB_CONTAINER:-valgate-db-test}"

psql_via_docker() {
  if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
    echo "Container $CONTAINER is not running. Run: docker compose -f docker-compose.db-test.yml up -d" >&2
    exit 1
  fi
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 "$@"
}

psql_file() {
  local file="$1"
  shift || true
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@" -f "$file"
  else
    docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 "$@" < "$file"
  fi
}

psql_sql() {
  local sql="$1"
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "$sql"
  else
    echo "$sql" | psql_via_docker
  fi
}
