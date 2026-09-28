#!/usr/bin/env python3
"""Grant geo-places:ReverseGeocode to valgate-storage — additively.

WHY THIS IS NOT A BLIND WRITE
-----------------------------
`aws iam put-user-policy` REPLACES the entire document for a policy name. It does not merge. So
writing a "desired" document over the live one silently DELETES every action the file happens not to
list. This script therefore reads the deployed policy first and unions the new actions into it.

If reading is denied (valgate-storage cannot read its own policies) the script ABORTS. That is
deliberate: a blind write is exactly how you would drop S3 access while "adding" a geo permission.

Also note: the policy NAME must match the deployed one. Inventing a new name creates a SECOND,
overlapping policy and leaves the original in place — the grant appears to work while the old policy
still governs.

Usage (needs an admin principal with iam:GetUserPolicy + iam:PutUserPolicy):
  python3 scripts/grant-geo-places-policy.py --list       # what is attached right now?
  python3 scripts/grant-geo-places-policy.py --dry-run    # show the merge, touch nothing
  python3 scripts/grant-geo-places-policy.py              # read -> merge -> write -> read back
"""
import argparse
import json
import subprocess
from pathlib import Path

USER = "valgate-storage"
# Must equal the deployed name (conductor-logs/2026-09-28-...-grabmaps-bakeoff.md). A different name
# duplicates the grant instead of updating it.
POLICY_NAME = "ValgateGeoPlacesBakeoff"
POLICY_FILE = Path("conductor-logs/iam-geo-places-policy.json")


class Denied(SystemExit):
    pass


def aws(*args: str) -> str:
    r = subprocess.run(["aws", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise Denied(f"aws {' '.join(args[:4])} …\n{(r.stderr or r.stdout).strip()}")
    return r.stdout


def merge(current: dict, additions: dict) -> tuple[dict, list[str]]:
    """Union `additions` into `current`, matching statements by (Effect, Resource).

    Returns (merged, actions_actually_new) so the caller can report what changed rather than
    claiming success blindly.
    """
    out = json.loads(json.dumps(current))  # deep copy; the live doc must not be mutated in place
    # A user can legitimately have NO policy under this name yet (first grant). Don't KeyError.
    out.setdefault("Version", "2012-10-17")
    out.setdefault("Statement", [])
    added: list[str] = []

    for src in additions["Statement"]:
        target = next(
            (s for s in out["Statement"]
             if s.get("Effect") == src["Effect"] and s.get("Resource") == src["Resource"]),
            None,
        )
        if target is None:
            out["Statement"].append(src)
            added.extend(src["Action"])
            continue

        have = target["Action"] if isinstance(target["Action"], list) else [target["Action"]]
        for a in src["Action"]:
            if a not in have:
                have.append(a)
                added.append(a)
        target["Action"] = sorted(have)

    return out, added


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="list attached inline policies + actions")
    ap.add_argument("--dry-run", action="store_true", help="show the merge, call nothing destructive")
    args = ap.parse_args()

    additions = json.loads(POLICY_FILE.read_text())
    want = additions["Statement"][0]["Action"]

    if args.list:
        names = json.loads(aws("iam", "list-user-policies", "--user-name", USER))["PolicyNames"]
        print(f"{USER}: {len(names)} inline policies")
        for n in names:
            doc = json.loads(aws("iam", "get-user-policy", "--user-name", USER,
                                 "--policy-name", n))["PolicyDocument"]
            for st in doc["Statement"]:
                acts = st["Action"] if isinstance(st["Action"], list) else [st["Action"]]
                print(f"  {n} [{st.get('Sid')}] {', '.join(acts)}")
        return

    try:
        current = json.loads(aws("iam", "get-user-policy", "--user-name", USER,
                                 "--policy-name", POLICY_NAME))["PolicyDocument"]
    except Denied as e:
        print(f"BLOCKED — cannot read the live policy, so a blind write would risk DROPPING actions.\n{e}")
        print(f"\nRun this with an admin principal. Actions wanted: {want}")
        raise SystemExit(1)

    merged, added = merge(current, additions)
    print(f"live actions : {[a for s in current['Statement'] for a in (s['Action'] if isinstance(s['Action'], list) else [s['Action']])]}")
    print(f"adding       : {added or 'nothing (already granted)'}")

    if not added:
        print("already up to date; nothing to write")
        return

    if args.dry_run:
        print("dry run: not writing")
        return

    aws("iam", "put-user-policy", "--user-name", USER, "--policy-name", POLICY_NAME,
        "--policy-document", json.dumps(merged))

    # Read back what IAM actually stored — proves the write landed instead of trusting the exit code.
    stored = json.loads(aws("iam", "get-user-policy", "--user-name", USER, "--policy-name",
                            POLICY_NAME))["PolicyDocument"]
    now = [a for s in stored["Statement"] for a in (s["Action"] if isinstance(s["Action"], list) else [s["Action"]])]
    print(f"verified on server: {now}")

    # A write that dropped something is worse than no write — assert nothing went missing.
    missing = [a for s in current["Statement"]
               for a in (s["Action"] if isinstance(s["Action"], list) else [s["Action"]])
               if a not in now]
    if missing:
        raise SystemExit(f"ERROR: write dropped actions {missing} — restore from the AWS console")
    print("no action lost")


if __name__ == "__main__":
    main()
