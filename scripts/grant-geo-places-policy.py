#!/usr/bin/env python3
"""Apply the geo-places grant to valgate-storage.

`put-user-policy` REPLACES the whole document for a given policy name, so the name matters:
- reuse the deployed name  -> updates it (intended)
- invent a new name        -> silently creates a second, overlapping policy

The repo's session log records the deployed name as `ValgateGeoPlacesBakeoff`; the earlier draft of
this script invented `ValgateGeoPlacesAddressLookup`, which would have duplicated the grant. Run
--list first to see what is actually attached before writing anything.

Usage:
  python3 scripts/grant-geo-places-policy.py --list        # what is attached now?
  python3 scripts/grant-geo-places-policy.py --dry-run     # show the action diff
  python3 scripts/grant-geo-places-policy.py               # apply + read back
"""
import argparse
import json
import subprocess
from pathlib import Path

USER = "valgate-storage"
# The name in conductor-logs/2026-09-28-...-grabmaps-bakeoff.md ("Admin: aws iam put-user-policy
# --policy-name ValgateGeoPlacesBakeoff ..."). Must match what is deployed or this duplicates it.
POLICY_NAME = "ValgateGeoPlacesBakeoff"
POLICY_FILE = Path("conductor-logs/iam-geo-places-policy.json")


def aws(*args: str) -> str:
    r = subprocess.run(["aws", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"FAILED: aws {' '.join(args)}\n{(r.stderr or r.stdout).strip()}")
    return r.stdout


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="list attached inline policies and actions")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.list:
        # Needs iam:ListUserPolicies + iam:GetUserPolicy on the caller. valgate-storage has neither
        # (probed 2026-09-28), so this is an admin-only diagnostic.
        names = json.loads(aws("iam", "list-user-policies", "--user-name", USER))["PolicyNames"]
        print(f"{USER}: {len(names)} inline policies")
        for n in names:
            doc = json.loads(aws("iam", "get-user-policy", "--user-name", USER,
                                 "--policy-name", n))["PolicyDocument"]
            for st in doc["Statement"]:
                actions = st["Action"] if isinstance(st["Action"], list) else [st["Action"]]
                print(f"  {n}  [{st['Sid']}]  {', '.join(actions)}")
                print(f"      on {st['Resource']}")
        return

    doc = json.loads(POLICY_FILE.read_text())
    actions = doc["Statement"][0]["Action"]
    print(f"policy {POLICY_NAME} -> {actions}")

    if args.dry_run:
        print("dry run: not calling IAM")
        return

    aws("iam", "put-user-policy", "--user-name", USER, "--policy-name", POLICY_NAME,
        "--policy-document", json.dumps(doc))
    print("applied")

    # Read back what IAM actually stored — proves the write landed instead of trusting the exit code.
    stored = json.loads(aws("iam", "get-user-policy", "--user-name", USER, "--policy-name",
                            POLICY_NAME, "--query", "PolicyDocument.Statement[0]",
                            "--output", "json"))
    print("verified on server:", stored["Action"])


if __name__ == "__main__":
    main()
