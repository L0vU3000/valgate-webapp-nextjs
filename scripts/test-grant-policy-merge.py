#!/usr/bin/env python3
"""Self-check for the IAM merge logic in grant-geo-places-policy.py.

The dangerous operation is `merge()`: `put-user-policy` replaces the whole document, so a bad merge
SILENTLY DELETES permissions. These assertions pin the three ways it can go wrong.

Run: python3 scripts/test-grant-policy-merge.py
"""
import importlib.util
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "grant", Path(__file__).with_name("grant-geo-places-policy.py")
)
grant = importlib.util.module_from_spec(spec)
spec.loader.exec_module(grant)

GEO = {"Statement": [{"Effect": "Allow", "Action": ["geo-places:ReverseGeocode"],
                      "Resource": "arn:aws:geo-places:ap-southeast-1::provider/default"}]}

# 1. THE dangerous case: adding a geo action must not evict S3 actions that share no Resource.
live = {"Statement": [
    {"Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
     "Resource": "arn:aws:s3:::valgate-documents-dev-867418408748-ap-southeast-2-an/*"},
    {"Effect": "Allow", "Action": ["geo-places:SearchText"],
     "Resource": "arn:aws:geo-places:ap-southeast-1::provider/default"},
]}
merged, added = grant.merge(live, GEO)
flat = [a for s in merged["Statement"] for a in s["Action"]]
assert added == ["geo-places:ReverseGeocode"], added
for keep in ("s3:PutObject", "s3:GetObject", "s3:DeleteObject", "geo-places:SearchText"):
    assert keep in flat, f"merge DROPPED {keep}"
# The S3 statement must survive as its own statement, not be absorbed into the geo one.
assert any(s["Resource"].startswith("arn:aws:s3:::") for s in merged["Statement"])

# 2. Idempotent: applying twice reports nothing new and does not duplicate the action.
again, added2 = grant.merge(merged, GEO)
assert added2 == [], added2
assert [a for s in again["Statement"] for a in s["Action"]].count("geo-places:ReverseGeocode") == 1

# 3. A brand-new Resource gets appended rather than merged into an unrelated statement.
fresh, added3 = grant.merge({}, {"Statement": [{"Effect": "Allow", "Action": ["s3:PutObject"],
                                                "Resource": "arn:aws:s3:::other/*"}]})
assert added3 == ["s3:PutObject"] and len(fresh["Statement"]) == 1

# 4. merge() must not mutate the live document it was handed.
assert live["Statement"][1]["Action"] == ["geo-places:SearchText"], "live doc was mutated"

print("merge self-check: 4/4 passed")
