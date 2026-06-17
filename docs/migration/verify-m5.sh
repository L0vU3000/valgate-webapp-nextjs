#!/usr/bin/env bash
# M5 verification — the read/write rewrites. The phase test: the whole app compiles + builds, the
# simulated covered-domain layer is fully gone (only the 3 deferred domains remain simulated), and
# the orphans are deleted. Browser/DB smoke is separate (needs a live Neon URL + site password).
# Run from anywhere. Exits non-zero on any failed assertion.
set -u
TGT=/Users/mintrose/conductor/workspaces/valgate-webapp-nextjs/backend-migration
cd "$TGT" || exit 2
fail=0
ok()  { echo "  ok   $1"; }
bad() { echo "  FAIL $1"; fail=1; }

echo "A. tsc clean (the 438 → 0)"
n=$(npx tsc --noEmit 2>&1 | grep -cE "error TS")
[ "$n" = "0" ] && ok "npx tsc --noEmit = 0 errors" || bad "tsc has $n errors"

echo "B. No covered simulated-db imports remain (only the 3 deferred may)"
# subpath imports @/lib/data/db/<name>
bad_sub=$(grep -rhoE "@/lib/data/db/[a-z-]+" app components lib 2>/dev/null | sort -u \
  | grep -vE "@/lib/data/db/(clients|agent-runs|dbdiagram-state|_fs)$")
[ -z "$bad_sub" ] && ok "no covered @/lib/data/db/* subpath imports" || bad "covered db subpaths remain:\n$bad_sub"

echo "C. getCurrentUserId only in deferred-touching files"
allow='app/\(pro\)/pro/(queries|actions)\.ts|app/\(shell\)/dbdiagram/(queries|actions)\.ts|lib/actions/clients\.actions\.ts|lib/actions/ai-overlay\.actions\.ts|lib/data/auth-shim\.ts|lib/data/derivations/ai-context\.ts'
stray=$(grep -rln "getCurrentUserId" app components lib 2>/dev/null | grep -vE "$allow")
[ -z "$stray" ] && ok "getCurrentUserId confined to deferred files" || bad "getCurrentUserId leaked into:\n$stray"

echo "D. Orphans deleted"
for f in lib/data/financials-wizard.ts lib/data/location-wizard.ts lib/data/rental-wizard.ts \
         lib/data/ownership-wizard.ts lib/data/estate-wizard.ts scripts/seed.ts scripts/seed-pro.ts; do
  [ -e "$f" ] && bad "$f still present" || :; done
[ -d scripts/fixtures ] && bad "scripts/fixtures still present" || ok "5 wizards + seed.ts/seed-pro.ts/fixtures deleted"

echo "E. Deferred layer + auth-shim preserved; uploadDocument added"
for f in clients agent-runs dbdiagram-state _fs index; do
  [ -f "lib/data/db/$f.ts" ] && : || bad "deferred lib/data/db/$f.ts missing"; done
[ -f lib/data/auth-shim.ts ] && ok "deferred db modules + auth-shim intact" || bad "auth-shim.ts missing"
grep -q "export async function uploadDocument" app/actions/documents.ts \
  && ok "uploadDocument server action present" || bad "uploadDocument missing"

echo "F. Shell routes opt out of static prerender (auth+DB dynamic)"
grep -q 'export const dynamic = "force-dynamic"' "app/(shell)/layout.tsx" \
  && ok "(shell) layout is force-dynamic" || bad "(shell) layout not force-dynamic — build will hit the DEMO_MODE guard"

echo
if [ "$fail" = "0" ]; then echo "M5 VERIFY: PASS (run 'npm run build' for the full prerender gate; browser/DB smoke separate)"; else echo "M5 VERIFY: FAIL"; fi
exit $fail
