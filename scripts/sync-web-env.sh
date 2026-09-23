#!/usr/bin/env bash
#
# sync-web-env.sh — write .env.local from Infisical, merging over the keys
# that never came from Infisical.
#
#   scripts/sync-web-env.sh            # env "staging" -> .env.local
#   scripts/sync-web-env.sh prod       # env "prod"    -> .env.local
#   scripts/sync-web-env.sh staging .env.local.bak   # custom target
#   scripts/sync-web-env.sh --selftest # fixture check, no network or auth
#
# Why merge and not overwrite: .env.local holds hand-authored operator
# switches (DEMO_MODE, DEMO_ALLOW_WRITES, VERCEL_OIDC_TOKEN) that do not
# belong in Infisical — DEMO_MODE in a shared secret store is a footgun.
# Those keys are preserved verbatim from the existing file; every other key
# comes from Infisical. See docs/SECRETS-INFISICAL.md.
#
# Requires the infisical CLI on PATH and an authenticated session
# (`infisical login`), or INFISICAL_TOKEN in the environment.
#
# NEVER prints a secret value: only names, and only in --dry-run.

set -euo pipefail

ENV_NAME="${1:-staging}"
TARGET="${2:-.env.local}"
SECRETS_PATH="/web"

# Keys that stay operator-owned. Never read from Infisical, never overwritten.
LOCAL_ONLY_RE='^(DEMO_MODE|DEMO_ALLOW_WRITES|VERCEL_OIDC_TOKEN|STAGING_DEMO_MODE)$'

selftest() {
  local tmp got want
  tmp="$(mktemp -d)"
  printf 'DEMO_MODE=true\nKEEP_ME=1\nDATABASE_URL=old\n' >"$tmp/target"
  printf 'DATABASE_URL=new\nCLERK_SECRET_KEY=sk_test_x\n' >"$tmp/fresh"

  got="$(merge "$tmp/target" "$tmp/fresh")"
  want="$(printf 'DEMO_MODE=true\nKEEP_ME=1\nDATABASE_URL=new\nCLERK_SECRET_KEY=sk_test_x')"
  [ "$got" = "$want" ] || { echo "FAIL: merge mismatch" >&2; printf '%s\n' "$got" >&2; rm -rf "$tmp"; exit 1; }

  # A local-only key present in Infisical must NOT be imported.
  printf 'DEMO_MODE=false\n' >>"$tmp/fresh"
  got="$(merge "$tmp/target" "$tmp/fresh")" || true
  printf '%s\n' "$got" | grep -q '^DEMO_MODE=true$' \
    || { echo "FAIL: DEMO_MODE was overwritten from Infisical" >&2; rm -rf "$tmp"; exit 1; }

  # Quoted values must be unquoted on BOTH sides (regression: `infisical export
  # --format dotenv` returns `KEY="value"`; keeping the quotes made every URL fail
  # `z.string().url()`, so the app died with `Invalid environment variables` and
  # 10 test files never collected).
  printf 'QUOTED_URL="https://example.invalid"\nALREADY=plain\n' >"$tmp/target"
  printf 'QUOTED_URL="https://fresh.invalid"\nDB="postgresql://u:p@h/d"\n' >"$tmp/fresh"
  got="$(merge "$tmp/target" "$tmp/fresh")"
  printf '%s\n' "$got" | grep -q '^QUOTED_URL=https://fresh.invalid$' \
    || { echo "FAIL: fresh quoted value not unquoted" >&2; printf '%s\n' "$got" >&2; rm -rf "$tmp"; exit 1; }
  printf '%s\n' "$got" | grep -q '^DB=postgresql://u:p@h/d$' \
    || { echo "FAIL: new quoted value not unquoted" >&2; printf '%s\n' "$got" >&2; rm -rf "$tmp"; exit 1; }
  printf '%s\n' "$got" | grep -q '^ALREADY=plain$' \
    || { echo "FAIL: unquoted value was altered" >&2; rm -rf "$tmp"; exit 1; }

  # A value whose quotes are unbalanced/embedded must be left exactly as-is —
  # only one matching surrounding pair is stripped.
  printf 'WEIRD=he said "hi"\n' >"$tmp/fresh"
  got="$(merge /dev/null "$tmp/fresh")"
  printf '%s\n' "$got" | grep -q '^WEIRD=he said "hi"$' \
    || { echo "FAIL: unbalanced-quote value was mangled" >&2; printf '%s\n' "$got" >&2; rm -rf "$tmp"; exit 1; }

  rm -rf "$tmp"
  echo "sync-web-env selftest: OK"
}

# strip_quotes <value> -> value without one surrounding quote pair.
# Infisical's dotenv export wraps values that contain shell-hostile characters in
# quotes. Those quotes are SYNTAX, not data. Keeping them is not cosmetic: the value
# becomes literally `"https://…"`, so `z.string().url()` rejects it ("Invalid URL")
# and the whole app fails to boot with `Invalid environment variables`. That is what
# silently broke 10 test files and the local dev env before 2026-09-23 — every
# UPSTASH_REDIS_REST_URL / DATABASE_URL / CLERK_SECRET_KEY was stored quoted.
strip_quotes() {
  local v="$1" q
  q="${v:0:1}"
  if { [ "$q" = '"' ] || [ "$q" = "'" ]; } && [ "$q" = "${v: -1}" ] && [ ${#v} -ge 2 ]; then
    printf '%s' "${v:1:${#v}-2}"
  else
    printf '%s' "$v"
  fi
}

# merge <target-file> <fresh-file> -> stdout
# Target wins for LOCAL_ONLY_RE keys and for keys Infisical does not have;
# the fresh file wins for everything else. Order: target order preserved,
# new keys appended. Quotes are stripped on BOTH sides so a file written by an
# older, quote-preserving run is repaired rather than perpetuated.
merge() {
  awk -v localonly="$LOCAL_ONLY_RE" '
    function unq(v,  q) {
      q=substr(v,1,1)
      if (length(v)>=2 && (q=="\"" || q=="'\''") && q==substr(v,length(v),1)) return substr(v,2,length(v)-2)
      return v
    }
    FNR==NR {
      if ($0 ~ /^[ \t]*(#|$)/) next
      line=$0
      eq=index(line,"=")
      if (eq==0) next
      k=substr(line,1,eq-1)
      gsub(/^[ \t]+|[ \t]+$/,"",k)
      order[++n]=k; tval[k]=k "=" unq(substr(line,eq+1))
      if (k ~ localonly) local[k]=1
      next
    }
    {
      if ($0 ~ /^[ \t]*(#|$)/) next
      line=$0
      eq=index(line,"=")
      if (eq==0) next
      k=substr(line,1,eq-1)
      gsub(/^[ \t]+|[ \t]+$/,"",k)
      if (k ~ localonly) next          # operator-owned: never take it
      fval[k]=k "=" unq(substr(line,eq+1))
      if (!(k in tval)) order[++n]=k
    }
    END {
      for (i=1;i<=n;i++) {
        k=order[i]
        if (k in local) print tval[k]
        else if (k in fval) print fval[k]
        else print tval[k]
      }
    }
  ' "$1" "$2"
}

[ "$ENV_NAME" = "--selftest" ] && { selftest; exit 0; }

command -v infisical >/dev/null \
  || { echo "error: infisical CLI not found. brew install infisical/get-cli/infisical" >&2; exit 1; }

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
[ -f package.json ] || { echo "error: no package.json under $ROOT" >&2; exit 1; }

PROJECT_ARGS=()
# Same default as ~/.hermes/scripts/valgate-infisical-setup.sh: the project id
# is not a secret, and requiring `export INFISICAL_PROJECT_ID` before every run
# is the kind of thing that silently fails months later. Override to point at
# another project.
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-d84d9384-ce77-4aa5-a63b-29312617af15}"
PROJECT_ARGS=(--projectId "$INFISICAL_PROJECT_ID")

FRESH="$(mktemp)"
trap 'rm -f "$FRESH"' EXIT

infisical export "${PROJECT_ARGS[@]+"${PROJECT_ARGS[@]}"}" \
  --env "$ENV_NAME" --path "$SECRETS_PATH" --format dotenv >"$FRESH" 2>/dev/null \
  || { echo "error: infisical export failed for env '$ENV_NAME' path '$SECRETS_PATH'." >&2
       echo "       check 'infisical login' and that the folder exists." >&2; exit 1; }

[ -s "$FRESH" ] || { echo "error: infisical returned no secrets for '$ENV_NAME$SECRETS_PATH'." >&2; exit 1; }

COUNT="$(grep -cE '^[A-Za-z_][A-Za-z0-9_]*=' "$FRESH" || true)"
[ "$COUNT" -gt 0 ] || { echo "error: no KEY=value lines in export." >&2; exit 1; }

if [ -f "$TARGET" ]; then
  cp "$TARGET" "$TARGET.bak"
  merge "$TARGET.bak" "$FRESH" >"$TARGET.tmp"
else
  merge /dev/null "$FRESH" >"$TARGET.tmp"
fi
chmod 600 "$TARGET.tmp"
mv "$TARGET.tmp" "$TARGET"

echo "wrote $TARGET from Infisical env '$ENV_NAME$SECRETS_PATH' ($COUNT keys)"
[ -f "$TARGET.bak" ] && echo "previous file saved to $TARGET.bak"
echo "operator-owned keys preserved: DEMO_MODE, DEMO_ALLOW_WRITES, VERCEL_OIDC_TOKEN"
