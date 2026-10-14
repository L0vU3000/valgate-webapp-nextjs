#!/usr/bin/env bash
#
# push-web-env.sh — push Infisical /web secrets into a Vercel environment.
#
#   scripts/push-web-env.sh                      # dry run: show the plan
#   scripts/push-web-env.sh --apply              # apply it
#   scripts/push-web-env.sh prod production --apply
#   scripts/push-web-env.sh --selftest           # offline fixture check
#
# WHY A SCRIPT AND NOT THE NATIVE INFISICAL↔VERCEL SYNC
# The native sync is bidirectional by default (isAutoSyncEnabled defaults ON,
# isEnabled is NOT the auto-sync switch) and its Secret Deletion step can remove
# destination keys. On 2026-09-21 that blanked 18 production+preview values.
# This script is deliberately one-way, non-destructive, and never writes a blank.
#
# THREE INVARIANTS — do not weaken any of them:
#   1. NEVER push an empty value. An empty Infisical secret is "not configured",
#      not "set this to nothing". Writing it is how the 09-21 incident happened.
#   2. NEVER delete a Vercel key. Keys Vercel has but Infisical lacks are KEPT
#      and reported. Nothing here can remove a value.
#   3. ALWAYS compare NORMALIZED values. `infisical export` quotes values, and
#      can double-quote them. Comparing raw text makes byte-identical secrets
#      look different and pushes a literal-quoted value over a good one.
#      (Real near-miss: this file once reported UPSTASH_* as UPDATE and would
#      have written `'"https://…"'` into production Redis.)
#   3b. ...but a DESTINATION wearing two or more quote layers is a literal-quoted
#      value and must be REPAIRED, not normalized away as SAME. Normalizing both
#      sides without this check let `push && pull` converge on a poisoned value:
#      Vercel held `"https://…"`, every later run saw SAME, and UPSTASH_* stayed
#      broken in Preview AND Production until it was fixed by hand on 2026-09-30.
#
# Never prints a secret value — names and fingerprints only.

set -euo pipefail

INFISICAL_ENV="staging"
VERCEL_ENV="preview"
APPLY=0
SECRETS_PATH="/web"
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-d84d9384-ce77-4aa5-a63b-29312617af15}"

# Infisical holds scratch/junk secrets that must not reach a runtime.
SKIP_RE='^(HERMES_|TEST_|VPS_|LOCAL_)'

# Platform-injected names. `vercel env pull` writes these into the pulled file but
# `vercel env ls` never lists them, so without this they land in the KEEP bucket
# and get reported as destination-only secrets that Infisical is "silent" about.
# They are not secrets and nobody manages them; neither pushed nor counted.
PLATFORM_RE='^(VERCEL|TURBO_|NX_)'

# peel_quotes <value> -> value with ALL surrounding quote layers removed.
# Iterative on purpose: one pass is not enough when the exporter double-quotes.
peel_quotes() {
  local v="$1" q
  while :; do
    [ ${#v} -ge 2 ] || break
    q="${v:0:1}"
    { [ "$q" = '"' ] || [ "$q" = "'" ]; } || break
    [ "$q" = "${v: -1}" ] || break
    v="${v:1:${#v}-2}"
  done
  printf '%s' "$v"
}

# fingerprint <value> -> first 8 of sha256 of the PEELED value, or <EMPTY>
fingerprint() {
  local v; v="$(peel_quotes "$1")"
  [ -n "$v" ] || { printf '<EMPTY>'; return; }
  printf '%s' "$v" | shasum -a 256 | cut -c1-8
}

# read_key <KEY> <file> -> peeled value of KEY in dotenv FILE (empty if absent).
read_key() {
  local k="$1" f="$2" v
  v="$(awk -v key="$k" '
    $0 ~ /^[ \t]*(#|$)/ { next }
    { line=$0; sub(/^[ \t]*export[ \t]+/, "", line)
      eq=index(line,"="); if (eq==0) next
      kk=substr(line,1,eq-1); gsub(/^[ \t]+|[ \t]+$/,"",kk)
      if (kk==key) { print substr(line,eq+1); exit } }' "$f" 2>/dev/null)"
  peel_quotes "$v"
}

selftest() {
  local tmp; tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN
  # peel_quotes contract, including the DOUBLE-quoted case that caused the near-miss
  [ "$(peel_quotes '"a"')" = "a" ]                       || { echo "FAIL: dquote" >&2; return 1; }
  [ "$(peel_quotes "'a'")" = "a" ]                       || { echo "FAIL: squote" >&2; return 1; }
  [ "$(peel_quotes "\"'a'\"")" = "a" ]                   || { echo "FAIL: double-quote layer" >&2; return 1; }
  [ "$(peel_quotes '"'"'"a"'"'"')" = "a" ]               || { echo "FAIL: quote sandwich" >&2; return 1; }
  [ "$(peel_quotes 'he said "hi"')" = 'he said "hi"' ]   || { echo "FAIL: inner quotes mangled" >&2; return 1; }
  [ "$(peel_quotes '"unbalanced')" = '"unbalanced' ]     || { echo "FAIL: unbalanced quote altered" >&2; return 1; }
  [ "$(peel_quotes '')" = '' ]                           || { echo "FAIL: empty" >&2; return 1; }
  [ "$(peel_quotes '"')" = '"' ]                         || { echo "FAIL: lone quote" >&2; return 1; }
  # a lone trailing quote must NOT be stripped (length guard)
  [ "$(peel_quotes 'x"')" = 'x"' ]                       || { echo "FAIL: trailing quote stripped" >&2; return 1; }
  # fingerprint is quoting-insensitive — the invariant 3 regression
  [ "$(fingerprint "\"'sk_live_x'\"")" = "$(fingerprint 'sk_live_x')" ] \
    || { echo "FAIL: fingerprint not quoting-insensitive" >&2; return 1; }
  [ "$(fingerprint '')" = '<EMPTY>' ]                    || { echo "FAIL: empty fingerprint" >&2; return 1; }
  [ "$(fingerprint '""')" = '<EMPTY>' ]                  || { echo "FAIL: quoted-empty not EMPTY" >&2; return 1; }

  # invariant 3 end-to-end: same secret, different quoting, must plan SAME (not UPDATE)
  printf 'A="x y"\n' >"$tmp/cur"; printf "A=\"'x y'\"\n" >"$tmp/fresh"
  plan "$tmp/cur" "$tmp/fresh" >"$tmp/plan"
  grep -q '^SAME A$' "$tmp/plan" || { echo "FAIL: quoting difference not collapsed" >&2; cat "$tmp/plan" >&2; return 1; }

  # the LITERAL-quoted case must NOT collapse. A destination value wearing two
  # quote layers is broken, even though it peels to the same canonical string —
  # otherwise a poisoned key is reported SAME forever and never repaired.
  printf 'A=""x""\n' >"$tmp/cur"; printf 'A=x\n' >"$tmp/fresh"
  plan "$tmp/cur" "$tmp/fresh" >"$tmp/plan"
  grep -q '^UPDATE A$' "$tmp/plan" \
    || { echo "FAIL: literal-quoted destination not flagged for repair" >&2; cat "$tmp/plan" >&2; return 1; }
  # ...and a healed (single-layer-free) value must settle back to SAME.
  printf 'A=x\n' >"$tmp/cur"; printf 'A=x\n' >"$tmp/fresh"
  plan "$tmp/cur" "$tmp/fresh" >"$tmp/plan"
  grep -q '^SAME A$' "$tmp/plan" \
    || { echo "FAIL: healed value not idempotent" >&2; cat "$tmp/plan" >&2; return 1; }

  # invariant 1: an empty fresh value must never be scheduled
  printf 'A=1\n' >"$tmp/cur"; printf 'A=\nB=2\n' >"$tmp/fresh"
  plan "$tmp/cur" "$tmp/fresh" >"$tmp/plan"
  grep -q '^SKIP_EMPTY A$' "$tmp/plan"    || { echo "FAIL: empty not skipped" >&2; cat "$tmp/plan" >&2; return 1; }
  grep -q '^ADD B$' "$tmp/plan"           || { echo "FAIL: new non-empty key not added" >&2; cat "$tmp/plan" >&2; return 1; }
  # quoted-empty must also be treated as empty
  printf 'A=1\n' >"$tmp/cur"; printf 'A=""\n' >"$tmp/fresh"
  plan "$tmp/cur" "$tmp/fresh" >"$tmp/plan"
  grep -q '^SKIP_EMPTY A$' "$tmp/plan"    || { echo "FAIL: quoted-empty not skipped" >&2; cat "$tmp/plan" >&2; return 1; }

  # invariant 2: a Vercel-only key must never be scheduled for deletion
  printf 'A=1\nONLY_VERCEL=keep\n' >"$tmp/cur"; printf 'A=1\n' >"$tmp/fresh"
  plan "$tmp/cur" "$tmp/fresh" >"$tmp/plan"
  grep -q '^KEEP ONLY_VERCEL$' "$tmp/plan" || { echo "FAIL: vercel-only key not kept" >&2; cat "$tmp/plan" >&2; return 1; }
  grep -qiE 'delete|remove' "$tmp/plan"    && { echo "FAIL: plan mentions delete/remove" >&2; cat "$tmp/plan" >&2; return 1; }

  # invariant 3: platform vars Vercel injects must not be reported as "kept"
  # destination-only secrets. `env pull` writes them, `env ls` never lists them.
  printf 'A=1\nVERCEL_URL=https://x\nVERCEL=1\nTURBO_CACHE=local:x\nNX_DAEMON=false\n' >"$tmp/cur"
  printf 'A=1\n' >"$tmp/fresh"
  plan "$tmp/cur" "$tmp/fresh" >"$tmp/plan"
  grep -qE '^KEEP (VERCEL|TURBO_|NX_)' "$tmp/plan" \
    && { echo "FAIL: platform var counted as a destination secret" >&2; cat "$tmp/plan" >&2; return 1; }
  grep -q '^KEEP REAL_SECRET$' "$tmp/plan" || {
    # a genuine destination-only secret must STILL be kept (guard, not a blanket mute)
    printf 'A=1\nVERCEL=1\nREAL_SECRET=keep\n' >"$tmp/cur"
    plan "$tmp/cur" "$tmp/fresh" >"$tmp/plan"
    grep -q '^KEEP REAL_SECRET$' "$tmp/plan" \
      || { echo "FAIL: real destination-only secret stopped being kept" >&2; cat "$tmp/plan" >&2; return 1; }
  }

  echo "push-web-env selftest: OK"
}

# plan <current-file> <fresh-file> -> stdout. One directive per line:
#   ADD <KEY> | UPDATE <KEY> | SAME <KEY> | KEEP <KEY> | SKIP_EMPTY <KEY> | SKIP_JUNK <KEY>
#
# NOTE: cur/fresh MUST arrive via -v, not as trailing operands. An awk operand of
# the form name=value is applied only when sequentially reached (after BEGIN), so
# load() would read an empty filename and emit a silently blank plan.
plan() {
  local cur="$1" fresh="$2"
  awk -v skipre="$SKIP_RE" -v plat="$PLATFORM_RE" -v cur="$cur" -v fresh="$fresh" -v mainfile="$cur" '
    function unq(v,  q) {
      while (length(v) >= 2) {
        q=substr(v,1,1)
        if (q != "\"" && q != "'"'"'") break
        if (q != substr(v,length(v),1)) break
        v=substr(v,2,length(v)-2)
      }
      return v
    }
    # lay(v) -> how many complete outer quote layers v wears. MUST peel by the same
    # rule as unq(); kept separate because awk scalars are not by-reference.
    function lay(v,  q,n) {
      n=0
      while (length(v) >= 2) {
        q=substr(v,1,1)
        if (q != "\"" && q != "'"'"'") break
        if (q != substr(v,length(v),1)) break
        v=substr(v,2,length(v)-2); n++
      }
      return n
    }
    function load(f,  line,eqk,eq,k,v) {
      while ((getline line < f) > 0) {
        if (line ~ /^[ \t]*(#|$)/) continue
        sub(/^[ \t]*export[ \t]+/, "", line)
        eq=index(line,"="); if (eq==0) continue
        k=substr(line,1,eq-1); gsub(/^[ \t]+|[ \t]+$/,"",k)
        v=unq(substr(line,eq+1))
        if (f==mainfile) { curval[k]=v; curraw[k]=substr(line,eq+1); curorder[++nc]=k }
        else             { frval[k]=v;  frorder[++nf]=k }
      }
      close(f)
    }
    BEGIN { load(cur); load(fresh) }
    END {
      for (i=1;i<=nf;i++) {
        k=frorder[i]
        if (k ~ skipre)          { print "SKIP_JUNK " k; continue }
        if (frval[k]=="")        { print "SKIP_EMPTY " k; continue }
        if (!(k in curval))      { print "ADD " k; continue }
        # A destination wearing TWO OR MORE quote layers is a literal-quoted value (a
        # value written with its quotes included), NOT the single optional wrapper
        # dotenv adds — so it is broken even when it peels to the same canonical
        # string as the source. Without this, `push && pull` converges on a poisoned
        # value and every later run reports SAME, so the corruption can never heal.
        # One layer stays SAME: `vercel env pull` quoting `x y` as "x y" is normal.
        if (curval[k]==frval[k] && lay(curraw[k]) <= 1) { print "SAME " k; continue }
        print "UPDATE " k
      }
      for (i=1;i<=nc;i++) {
        k=curorder[i]
        if (!(k in frval) && k !~ plat) print "KEEP " k
      }
    }
  '
}

main() {
  command -v infisical >/dev/null || { echo "error: infisical CLI not found" >&2; exit 1; }
  command -v vercel    >/dev/null || { echo "error: vercel CLI not found" >&2; exit 1; }
  ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"
  [ -f package.json ] || { echo "error: no package.json under $ROOT" >&2; exit 1; }

  local tmp inf_file ver_file
  tmp="$(mktemp -d)"; TMPDIR_VG="$tmp"; trap 'rm -rf "${TMPDIR_VG:-}"' EXIT
  inf_file="$tmp/infisical.env"; ver_file="$tmp/vercel.env"

  echo "Infisical /web [$INFISICAL_ENV]  ->  Vercel [$VERCEL_ENV]   ($([ $APPLY = 1 ] && echo APPLY || echo DRY RUN))"
  echo

  infisical export --projectId "$INFISICAL_PROJECT_ID" --env "$INFISICAL_ENV" \
    --path "$SECRETS_PATH" --format dotenv --silent >"$inf_file" 2>/dev/null \
    || { echo "error: infisical export failed (check 'infisical login')." >&2; exit 1; }
  [ -s "$inf_file" ] || { echo "error: infisical returned no secrets." >&2; exit 1; }

  vercel env pull --environment="$VERCEL_ENV" --yes "$ver_file" >/dev/null 2>&1 \
    || { echo "error: vercel env pull failed." >&2; exit 1; }
  [ -s "$ver_file" ] || { echo "error: vercel env pull wrote nothing." >&2; exit 1; }

  # Read into an array WITHOUT word-splitting on values containing spaces.
  local -a directives=(); local line
  while IFS= read -r line; do [ -n "$line" ] && directives+=("$line"); done < <(plan "$ver_file" "$inf_file")

  local adds=0 updates=0 same=0 keeps=0 blanks=0 junk=0
  for line in "${directives[@]}"; do
    case "$line" in
      "ADD "*)    adds=$((adds+1));;     "UPDATE "*) updates=$((updates+1));;
      "SAME "*)   same=$((same+1));;     "KEEP "*)   keeps=$((keeps+1));;
      "SKIP_EMPTY "*) blanks=$((blanks+1));; "SKIP_JUNK "*) junk=$((junk+1));;
    esac
  done

  echo "  to ADD     : $adds"
  echo "  to UPDATE  : $updates"
  echo "  unchanged  : $same"
  echo "  KEPT on Vercel (Infisical silent — never deleted): $keeps"
  echo "  skipped, empty in Infisical (invariant 1): $blanks"
  echo "  skipped, not runtime secrets: $junk"
  echo

  # Name every key that would change, with its fingerprint, so the plan is auditable.
  for line in "${directives[@]}"; do
    case "$line" in
      "ADD "*|"UPDATE "*)
        local k="${line#* }"
        echo "  [${line%% *}]  $k  ->  fp=$(fingerprint "$(read_key "$k" "$inf_file")")";;
    esac
  done
  for line in "${directives[@]}"; do
    case "$line" in
      "SKIP_EMPTY "*) echo "  [skip:empty]  ${line#SKIP_EMPTY }  (Infisical has it blank; Vercel keeps its value)";;
      "SKIP_JUNK "*)  echo "  [skip:junk]   ${line#SKIP_JUNK }";;
      "KEEP "*)       [ "${VERBOSE_KEEP:-0}" = 1 ] && echo "  [keep]        ${line#KEEP }";;
    esac
  done

  if [ $APPLY = 0 ]; then
    echo
    echo "DRY RUN — nothing written. Re-run with --apply."
    return 0
  fi

  # Apply: ADD and UPDATE only. We never remove, so an existing name is
  # overwritten in place with --force and no Vercel key can disappear.
  local n=0 v
  for line in "${directives[@]}"; do
    case "$line" in
      "ADD "*|"UPDATE "*)
        local k="${line#* }"
        v="$(read_key "$k" "$inf_file")"
        [ -n "$v" ] || { echo "  !! internal error: $k empty at apply time" >&2; continue; }
        # Value goes via stdin, never argv (argv is visible in `ps`).
        if printf '%s' "$v" | vercel env add "$k" "$VERCEL_ENV" --force --no-sensitive -y >/dev/null 2>&1; then
          n=$((n+1)); echo "  set $k"
        else
          echo "  FAILED $k" >&2
        fi
        unset v
        ;;
    esac
  done
  echo
  echo "wrote $n value(s) to Vercel [$VERCEL_ENV]"
  echo "Vercel only applies env changes to NEW deployments — redeploy to pick these up."
}

case "${1:-}" in
  --selftest) selftest; exit 0;;
  --help|-h) sed -n '2,22p' "$0"; exit 0;;
esac

# Parse: [infisical-env] [vercel-env] [--apply]
args=()
for a in "$@"; do
  case "$a" in
    --apply) APPLY=1;;
    *) args+=("$a");;
  esac
done
[ ${#args[@]} -ge 1 ] && INFISICAL_ENV="${args[0]}"
[ ${#args[@]} -ge 2 ] && VERCEL_ENV="${args[1]}"

main
