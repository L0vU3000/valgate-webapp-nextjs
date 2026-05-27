#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/psql.sh
source "${ROOT}/scripts/db/lib/psql.sh"

TESTS_DIR="${ROOT}/scripts/db/tests"

run_sql() {
  local file="$1"
  echo ""
  echo "━━━ $(basename "$file") ━━━"
  psql_file "$file"
}

if ! command -v psql >/dev/null 2>&1 && ! docker inspect "${VALGATE_DB_CONTAINER:-valgate-db-test}" >/dev/null 2>&1; then
  echo "Need psql or running Docker container." >&2
  exit 1
fi

run_sql "${TESTS_DIR}/00_helpers.sql"
run_sql "${TESTS_DIR}/verify-catalog.sql"
run_sql "${TESTS_DIR}/constraints.sql"
run_sql "${TESTS_DIR}/flows/01_property_lifecycle.sql"
run_sql "${TESTS_DIR}/flows/02_lease_payment.sql"
run_sql "${TESTS_DIR}/flows/03_documents.sql"
run_sql "${TESTS_DIR}/flows/04_estate_successor.sql"
run_sql "${TESTS_DIR}/flows/05_clerk_membership_seed.sql"

# Optional: scripts/db/tests/rules/*.sql (register explicitly when added)

echo ""
echo "✓ All database tests passed"
