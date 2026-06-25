#!/usr/bin/env bash
# M3 verification — structural integrity of the mechanical copy/delete merge.
# M3 adds no new computation, so the test is: did exactly the right files move,
# did they copy intact, and is the deferred (still-simulated) path unsevered.
# Run from anywhere. Exits non-zero on any failed assertion.
set -u

SRC=/Users/mintrose/conductor/workspaces/valgate-backend-independent/manila-v1
TGT=/Users/mintrose/conductor/workspaces/valgate-webapp-nextjs/backend-migration
fail=0
ok()   { echo "  ok   $1"; }
bad()  { echo "  FAIL $1"; fail=1; }

echo "A. Copy integrity (copied trees match source; exclude M4's intentional changes: pruned __tests__, _result.ts Next-15 patch)"
for d in lib/db lib/auth app/actions drizzle; do
  if diff -r -x __tests__ -x _result.ts "$SRC/$d" "$TGT/$d" >/dev/null 2>&1; then ok "$d matches source"; else bad "$d differs from source"; fi
done
for f in lib/log.ts lib/ratelimit.ts lib/data/wizards.ts drizzle.config.ts \
         lib/data/types/pillar-verification.ts lib/data/derivations/valgate-verified.ts \
         app/api/webhooks/clerk/route.ts; do
  if diff "$SRC/$f" "$TGT/$f" >/dev/null 2>&1; then ok "$f matches source"; else bad "$f differs/missing"; fi
done
# union types: every backend type file copied verbatim
tdiff=$(diff -r "$SRC/lib/data/types" "$TGT/lib/data/types" 2>&1)
if [ -z "$tdiff" ]; then ok "lib/data/types identical to backend union set"; else bad "lib/data/types diverges:\n$tdiff"; fi
# the 5 shared derivations must match backend
for d in analytics portfolio progress property rental; do
  if diff "$SRC/lib/data/derivations/$d.ts" "$TGT/lib/data/derivations/$d.ts" >/dev/null 2>&1; then ok "derivations/$d.ts matches source"; else bad "derivations/$d.ts differs"; fi
done

echo "B. Delete/keep correctness (exact sets)"
db_now=$(ls "$TGT/lib/data/db" | sort | tr '\n' ' ')
db_want="_fs.ts agent-runs.ts clients.ts dbdiagram-state.ts index.ts "
[ "$db_now" = "$db_want" ] && ok "lib/data/db = {clients,agent-runs,dbdiagram-state,_fs,index}" || bad "lib/data/db is: $db_now"
act_now=$(ls "$TGT/lib/actions" | sort | tr '\n' ' ')
act_want="ai-overlay-utils.ts ai-overlay.actions.test.ts ai-overlay.actions.ts ai-tools.ts clients.actions.ts "
[ "$act_now" = "$act_want" ] && ok "lib/actions = 5 deferred files only" || bad "lib/actions is: $act_now"
exp=$(grep -c '^export \* as' "$TGT/lib/data/db/index.ts")
[ "$exp" = "3" ] && ok "index.ts re-exports exactly 3 modules" || bad "index.ts exports $exp modules (want 3)"

echo "C. Deferred-path integrity (the 3 DEFERRED modules must survive; covered danglers are expected → M5)"
# The kept pro/AI files are MIXED: they read deferred domains (clients/agent-runs/dbdiagram-state) AND
# covered domains (properties/payments/leases/…). Only the DEFERRED imports must resolve now — covered
# imports are expected to dangle until M5 repoints them. So: fail only if a deferred-module import is
# broken; merely CATALOGUE covered danglers.
keptfiles="$TGT/lib/data/db/clients.ts $TGT/lib/data/db/agent-runs.ts $TGT/lib/data/db/dbdiagram-state.ts
           $TGT/lib/actions/clients.actions.ts $TGT/lib/actions/ai-overlay.actions.ts
           $TGT/lib/actions/ai-tools.ts $TGT/lib/actions/ai-overlay-utils.ts
           $TGT/app/(pro)/pro/queries.ts $TGT/app/(pro)/pro/actions.ts
           $TGT/app/(shell)/dbdiagram/queries.ts $TGT/app/(shell)/dbdiagram/actions.ts"
sev=0; covered_danglers=0
for f in $keptfiles; do
  [ -f "$f" ] || { bad "kept file missing: $f"; continue; }
  while read -r mod; do
    [ -z "$mod" ] && continue
    base=$(basename "$mod")
    rel=${mod#@/}
    if [ -f "$TGT/$rel.ts" ] || [ -f "$TGT/$rel/index.ts" ]; then continue; fi
    case "$base" in
      clients|agent-runs|dbdiagram-state)
        bad "$(basename "$f") imports DEFERRED '$mod' → broken (deferred path severed!)"; sev=1 ;;
      *)
        covered_danglers=$((covered_danglers + 1)) ;;  # expected: M5 repoints these to services
    esac
  done < <(grep -oE '@/lib/data/db/[a-z-]+' "$f" | sort -u)
done
[ "$sev" = "0" ] && ok "all DEFERRED-module imports in kept files resolve (deferred path intact)"
echo "  note: $covered_danglers covered-domain import(s) in mixed kept files dangle as expected → M5"

echo "D. Merge-collision + auth-shim files untouched (handed to M4 / kept)"
grep -q NEXT_PUBLIC_MAPBOX_TOKEN "$TGT/lib/env.ts"  && ok "env.ts still FE version"        || bad "env.ts changed"
grep -q formatRelativeTime       "$TGT/lib/format.ts" && ok "format.ts still FE version"     || bad "format.ts changed"
grep -q SITE_GATE_PATH           "$TGT/middleware.ts" && ok "middleware.ts still FE site-gate" || bad "middleware.ts changed"
[ -f "$TGT/lib/data/auth-shim.ts" ] && ok "auth-shim.ts kept" || bad "auth-shim.ts deleted"

echo
if [ "$fail" = "0" ]; then echo "M3 VERIFY: PASS"; else echo "M3 VERIFY: FAIL"; fi
exit $fail
