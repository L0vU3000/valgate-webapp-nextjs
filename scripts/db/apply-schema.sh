#!/usr/bin/env bash
# Apply docs/database/prototype/schema.sql (destructive: drops public schema).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/psql.sh
source "${ROOT}/scripts/db/lib/psql.sh"

SCHEMA="${ROOT}/docs/database/prototype/schema.sql"

if [[ ! -f "$SCHEMA" ]]; then
  echo "Missing schema: $SCHEMA" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1 && ! docker inspect "${VALGATE_DB_CONTAINER:-valgate-db-test}" >/dev/null 2>&1; then
  echo "Need psql or running Docker container. Start: docker compose -f docker-compose.db-test.yml up -d" >&2
  exit 1
fi

echo "→ Resetting public schema…"
psql_sql "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"

echo "→ Applying docs/database/prototype/schema.sql"
psql_file "$SCHEMA"

echo "✓ Schema applied"
