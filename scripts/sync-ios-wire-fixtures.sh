#!/usr/bin/env bash
# Optional first argument overrides the iOS repo root for worktree layouts.
set -euo pipefail
export LC_ALL=C

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$repo_root/tests/fixtures/api-v1-wire"
ios_root="${1:-$repo_root/../../../valgate-ios}"
ios_tests="$ios_root/Tests/ValgateiOSTests"

fixtures=("$source_dir"/*.json)
if [[ ! -f "${fixtures[0]}" ]]; then
  echo "No API v1 wire fixtures found. Run npm run wire:export first." >&2
  exit 1
fi

# Always keep a local revision, even when no iOS checkout is available.
web_sha="$(git -C "$repo_root" rev-parse --short HEAD)"
{
  printf 'web-sha=%s\n' "$web_sha"
  for fixture in "${fixtures[@]}"; do
    digest="$(shasum -a 256 "$fixture")"
    printf '%s %s\n' "${digest%% *}" "${fixture##*/}"
  done
} > "$source_dir/FIXTURES.rev"

if [[ ! -d "$ios_tests" ]]; then
  echo "iOS test directory not found: $ios_tests"
  echo "Kept FIXTURES.rev locally in $source_dir (no fixtures copied)."
  exit 0
fi

destination="$ios_tests/Fixtures/api-v1"
mkdir -p "$destination"
cp "${fixtures[@]}" "$source_dir/FIXTURES.rev" "$destination/"
echo "Synced ${#fixtures[@]} API v1 wire fixtures and FIXTURES.rev to $destination"
