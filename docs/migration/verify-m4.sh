#!/usr/bin/env bash
# M4 verification — deps + config reconcile. The phase test: the copied backend layer and merged
# config must COMPILE, with all residual tsc errors confined to the M5 wiring set (import of deleted
# sim modules) + orphaned FE seed tooling. Run from anywhere. Exits non-zero on any failed assertion.
set -u

TGT=/Users/mintrose/conductor/workspaces/valgate-webapp-nextjs/backend-migration
cd "$TGT" || exit 2
fail=0
ok()  { echo "  ok   $1"; }
bad() { echo "  FAIL $1"; fail=1; }

echo "A. Dependencies declared in package.json"
for d in drizzle-orm @neondatabase/serverless ws @t3-oss/env-nextjs @upstash/ratelimit @upstash/redis \
         drizzle-kit @types/ws dotenv; do
  grep -q "\"$d\"" package.json && ok "$d declared" || bad "$d missing from package.json"
done
grep -qE '"next": *"15' package.json        && ok "next pinned to 15.x"      || bad "next is not 15.x"
grep -qE '"@clerk/nextjs": *"\^7\.5' package.json && ok "@clerk/nextjs ^7.5.x" || bad "@clerk/nextjs not bumped"
grep -qE '"zod": *"\^4\.4' package.json      && ok "zod ^4.4.x"              || bad "zod not bumped"

echo "B. New deps actually installed (node_modules)"
for m in drizzle-orm @neondatabase/serverless @t3-oss/env-nextjs @upstash/ratelimit ws; do
  [ -d "node_modules/$m" ] && ok "$m installed" || bad "$m not installed (run npm install)"
done

echo "C. Merge-file shapes + test prune"
grep -q "createEnv" lib/env.ts && ! grep -qE '^import "server-only"' lib/env.ts \
  && ok "env.ts = createEnv, no server-only import (client map components can import)" || bad "env.ts shape wrong"
grep -q "NEXT_PUBLIC_MAPBOX_TOKEN" lib/env.ts && ok "env.ts exposes NEXT_PUBLIC_MAPBOX_TOKEN" || bad "env.ts missing MAPBOX"
grep -q "clerkMiddleware" middleware.ts && grep -q "hasClerk" middleware.ts && grep -q "__clerk" middleware.ts \
  && ok "middleware.ts = DEMO_MODE-aware clerk wrap + merged matcher" || bad "middleware.ts shape wrong"
grep -q "revalidateTag(tag)" app/actions/_result.ts && ! grep -q 'revalidateTag(tag,' app/actions/_result.ts \
  && ok "_result.ts revalidateTag single-arg (Next 15)" || bad "_result.ts still Next-16 2-arg"
testdirs=$(find lib app -type d -name __tests__ 2>/dev/null)
[ -z "$testdirs" ] && ok "copied backend __tests__ pruned" || bad "stray __tests__: $testdirs"

echo "D. tsc gate — run once, classify"
npx tsc --noEmit > /tmp/verify-m4-tsc.txt 2>&1 || true
files() { grep -E "error TS" /tmp/verify-m4-tsc.txt | sed -E 's/\([0-9]+,[0-9]+\): error TS.*//' | sort -u; }
total=$(grep -cE "error TS" /tmp/verify-m4-tsc.txt)
echo "  (tsc reported $total error lines)"

# D1: ZERO errors allowed in copied backend code / merged config / overwritten shared derivations
protected=$(files | grep -E '^(lib/services/|lib/db/|lib/auth/|app/actions/|lib/env\.ts|middleware\.ts|lib/ratelimit\.ts|lib/log\.ts|lib/data/wizards\.ts|lib/data/types/|lib/data/derivations/(analytics|portfolio|progress|property|rental|valgate-verified)\.ts)')
[ -z "$protected" ] && ok "no errors in copied backend / merged config / shared derivations" \
  || bad "errors in protected files:\n$protected"

# D2: every residual erroring file must be in an expected M5-wiring / seed-tooling bucket
unexpected=$(files | grep -vE '(queries\.ts|actions\.ts|_components/.*\.tsx|^app/\(shell\)/layout\.tsx|^components/|^lib/actions/|-wizard\.ts|progress-context\.ts|^lib/data/properties\.ts|derivations/(ai-context|portfolio-snapshot)\.ts|use-notifications\.ts|professional-form\.ts|^scripts/)')
[ -z "$unexpected" ] && ok "all residual errors confined to M5 wiring + seed tooling" \
  || bad "unexpected erroring files:\n$unexpected"

# D3: residual errors are the expected classes (missing module/export/property + their any-cascades)
badcodes=$(grep -oE "error TS[0-9]+" /tmp/verify-m4-tsc.txt | sort -u | grep -vE 'TS(2307|2305|2339|7006|2362|2552|2304)$')
[ -z "$badcodes" ] && ok "residual error codes all in the deleted-import + cascade family" \
  || bad "unexpected error codes: $badcodes"

echo
if [ "$fail" = "0" ]; then echo "M4 VERIFY: PASS"; else echo "M4 VERIFY: FAIL"; fi
exit $fail
