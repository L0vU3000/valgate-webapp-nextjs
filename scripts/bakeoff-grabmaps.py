#!/usr/bin/env python3
"""GrabMaps half of the address bake-off — the Q15 comparison.

Runs the SAME 23-address corpus that scripts/bakeoff-mapbox.py measured, so the two
halves are comparable. Reuses the corpus already stashed in conductor-logs/bakeoff-mapbox.json
rather than re-reading the DB.

Needs: geo-places:SearchText on arn:aws:geo-places:ap-southeast-1::provider/default
Usage: python3 scripts/bakeoff-grabmaps.py [--out conductor-logs/bakeoff-grabmaps.json]
"""
import json
import subprocess
import sys
import argparse
from pathlib import Path

REGION = "ap-southeast-1"
PROVIDER = f"arn:aws:geo-places:{REGION}::provider/default"
CORPUS = Path("conductor-logs/bakeoff-mapbox.json")


def search_text(query: str, bias_lng: float, bias_lat: float) -> dict:
    """One-hop SearchText. Returns Position + Address, which is what we can legally store.

    NOTE: do NOT pass --additional-features. The only value it accepts is from
    SearchTextAdditionalFeature and the enum name is not exposed in the CLI help; passing
    "Address" fails with ValidationException. The default response already carries a full
    Address (Label/Street/District/SubDistrict/PostalCode), which is all we need.
    """
    cmd = [
        "aws", "geo-places", "search-text",
        "--region", REGION,
        "--query-text", query,
        "--max-results", "5",
        "--bias-position", str(bias_lng), str(bias_lat),
        "--cli-error-format", "json",
        "--output", "json",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return {"error": _err(r.stderr)}
    try:
        return json.loads(r.stdout or "{}")
    except json.JSONDecodeError as e:
        return {"error": f"bad json: {e}"}


def _err(stderr: str) -> str:
    """Surface the real AWS message, not the boilerplate 'use --cli-error-format' tail."""
    try:
        d = json.loads(stderr)
        return f"{d.get('Code','')}: {d.get('Message','')}".strip()[:300]
    except Exception:
        return (stderr or "unknown").strip().splitlines()[-1][:300]


def classify(result: dict) -> dict:
    """Street-level or not?

    The response Address is FLAT (Label/Street/District/SubDistrict/Locality/PostalCode) — it is
    NOT an AddressComponents array, which is what an earlier version of this script wrongly
    looked for (that bug made every row report locality-level).
    """
    items = (result.get("ResultItems") or [])
    if not items:
        return {"hits": 0, "hit": False}
    top = items[0]
    addr = top.get("Address") or {}
    label = addr.get("Label") or top.get("Title") or ""
    return {
        "hits": len(items),
        "hit": True,
        "top_label": label,
        "position": top.get("Position") or [],
        "place_type": top.get("PlaceType", ""),
        # The presence of a Street component is exactly what separates a street address from a
        # district/locality centroid.
        "street_level": bool(addr.get("Street")),
        "street": addr.get("Street", ""),
        "district": addr.get("District", ""),
        "sub_district": addr.get("SubDistrict", ""),
        "postal_code": addr.get("PostalCode", ""),
        "distance_m": top.get("Distance"),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="conductor-logs/bakeoff-grabmaps.json")
    args = ap.parse_args()

    # Live preflight: fail loudly rather than write a file full of identical errors.
    who = subprocess.run(["aws", "sts", "get-caller-identity", "--output", "json"],
                         capture_output=True, text=True)
    if who.returncode != 0:
        print("AWS identity unavailable:", who.stderr.strip()[-200:])
        return 2
    arn = json.loads(who.stdout)["Arn"]

    probe = search_text("Phnom Penh", 104.9282, 11.5564)
    if "error" in probe:
        print("BLOCKED: geo-places not callable by this principal.")
        print("  principal:", arn)
        print("  error    :", probe["error"])
        print("\nFix: grant geo-places:SearchText to this user (see PREREQ below).")
        return 3

    corpus = json.loads(CORPUS.read_text())
    if not isinstance(corpus, list):
        corpus = corpus.get("results") or corpus.get("addresses") or []

    out, street_hits, hit_count = [], 0, 0
    for row in corpus:
        q = row.get("query") or ""
        lng = row.get("lng", 104.9282)
        lat = row.get("lat", 11.5564)
        res = search_text(q, lng, lat)
        c = {"error": res["error"]} if "error" in res else classify(res)
        if c.get("hit"):
            hit_count += 1
        if c.get("street_level"):
            street_hits += 1
        out.append({**{k: row.get(k) for k in ("id", "query", "city", "province")}, "grabmaps": c})
        print(f"{row.get('id','?'):<12} {'HIT ' if c.get('hit') else 'MISS'} "
              f"{'STREET' if c.get('street_level') else 'locality'} {c.get('top_label','')[:58]}")

    n = len(out)
    summary = {
        "provider": "amazon-location/grabmaps",
        "region": REGION,
        "principal": arn,
        "corpus_size": n,
        "hits": hit_count,
        "street_level": street_hits,
        "street_level_rate": round(street_hits / n, 3) if n else 0,
    }
    Path(args.out).write_text(json.dumps({"summary": summary, "results": out}, indent=2))
    print(f"\nGrabMaps: {hit_count}/{n} hit, {street_hits}/{n} street-level  -> {args.out}")
    print("Compare against the Mapbox half: conductor-logs/bakeoff-mapbox.json (0/23 street-level).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
