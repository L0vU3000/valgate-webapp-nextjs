#!/usr/bin/env python3
"""Grant geo-places:ReverseGeocode to the principal the app already uses.

The address-pin feature needs ReverseGeocode, which returned AccessDeniedException (2026-09-28):
the existing policy granted only SearchText. This merges the action into the SAME statement rather
than adding a second one, so the policy stays a single least-privilege block.

Usage:  python3 scripts/grant-geo-places-policy.py [--dry-run]
"""
import argparse
import json
import subprocess
from pathlib import Path

USER = "valgate-storage"
POLICY_NAME = "ValgateGeoPlacesAddressLookup"
POLICY_FILE = Path("conductor-logs/iam-geo-places-policy.json")


def run(cmd: list[str]) -> str:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"FAILED: {' '.join(cmd)}\n{r.stderr or r.stdout}")
    return r.stdout


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    # Inline the policy as a single-line JSON argument. The document is small and fixed, so this
    # avoids the temp-file + file:// dance that breaks when the path has spaces.
    doc = json.loads(POLICY_FILE.read_text())
    actions = doc["Statement"][0]["Action"]
    print(f"policy {POLICY_NAME} -> actions {actions}")

    if args.dry_run:
        print("dry run: not calling IAM")
        return

    run([
        "aws", "iam", "put-user-policy",
        "--user-name", USER,
        "--policy-name", POLICY_NAME,
        "--policy-document", json.dumps(doc),
    ])
    print("applied")

    # Read back what IAM actually stored — proves the write landed instead of trusting the exit code.
    out = run([
        "aws", "iam", "get-user-policy",
        "--user-name", USER,
        "--policy-name", POLICY_NAME,
        "--query", "PolicyDocument.Statement[0].Action",
        "--output", "json",
    ])
    print("verified on server:", json.loads(out))


if __name__ == "__main__":
    main()
