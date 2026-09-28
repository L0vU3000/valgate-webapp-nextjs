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
    """One-hop SearchText. Returns Position + Address, which is what we can legally store."""
    cmd = [
        "aws", "geo-places", "search-text",
        "--region", REGION,
        "--query-text", query,
        "--max-results", "5",
        "--bias-position", str(bias_lng), str(bias_lat),
        "--additional-features", "Address",
        "--output", "json",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return {"error": r.stderr.strip().splitlines()[-1][:300] if r.stderr else "unknown"}
    try:
        return json.loads(r.stdout or "{}")
    except json.JSONDecodeError as e:
        return {"error": f"bad json: {e}"}


def classify(result: dict) -> dict:
    """Street-level or not? GrabMaps Address has Label + AddressComponents; the presence of a
    street component (Street / AddressNumber) is what distinguishes street from locality."""
    items = (result.get("ResultItems") or [])
    if not items:
        return {"hits": 0, "hit": False}
    top = items[0]
    comps = {c.get("ComponentType"): c for c in ((top.get("Address") or {}).get("AddressComponents") or [])}
    label = (top.get("Address") or {}).get("Label") or top.get("Title") or ""
    pos = top.get("Position") or []
    return {
        "hits": len(items),
        "hit": True,
        "top_label": label,
        "position": pos,
        "types": top.get("PlaceType", ""),
        "street_level": bool(comps.get("Street") or comps.get("AddressNumber")),
        "components": sorted(comps.keys()),
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
