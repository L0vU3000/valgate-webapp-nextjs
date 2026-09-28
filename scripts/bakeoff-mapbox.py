#!/usr/bin/env python3
"""Mapbox half of the Cambodian address bake-off. Reads the demo seed's real
Khmer addresses, queries Mapbox geocoding v5, and reports hit rate + which
admin components come back. Writes JSON to the workspace for the GrabMaps half
to be diffed against later.

  python3 scripts/bakeoff-mapbox.py /path/to/.env.local
"""
import json, os, re, sys, time, urllib.parse, urllib.request, glob

ENV = sys.argv[1] if len(sys.argv) > 1 else ".env.local"
tok = None
for line in open(ENV):
    if line.startswith("NEXT_PUBLIC_MAPBOX_TOKEN="):
        tok = line.split("=", 1)[1].strip()
if not tok:
    sys.exit(f"no NEXT_PUBLIC_MAPBOX_TOKEN in {ENV}")

SEED = "public/data/users/demo-user/properties"
ADDRS = []
for d in sorted(glob.glob(f"{SEED}/*")):
    for f in glob.glob(os.path.join(d, "*.json")):
        try:
            j = json.load(open(f))
        except Exception:
            continue
        def walk(o):
            if isinstance(o, dict):
                if o.get("addressLine"):
                    yield o
                for v in o.values():
                    yield from walk(v)
            elif isinstance(o, list):
                for v in o:
                    yield from walk(v)
        for o in walk(j):
            ADDRS.append({
                "id": os.path.basename(d),
                "query": o["addressLine"],
                "city": o.get("city"), "province": o.get("province"),
                "country": o.get("country"),
            })

# Dedupe: several PROP-000x share the same street.
seen, uniq = set(), []
for a in ADDRS:
    if a["query"] not in seen:
        seen.add(a["query"]); uniq.append(a)

def geocode(q, **extra):
    p = {"access_token": tok, "limit": 5,
         "types": "address,place,locality,neighborhood", **extra}
    url = ("https://api.mapbox.com/geocoding/v5/mapbox.places/"
           + urllib.parse.quote(q) + ".json?" + urllib.parse.urlencode(p))
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.load(r)

def probe(a):
    """Three shapes: bare, country=kh, country=kh + proximity to Phnom Penh."""
    out = {}
    for label, extra in (
        ("bare", {}),
        ("country_kh", {"country": "kh"}),
        ("kh_proximity", {"country": "kh", "proximity": "104.9282,11.5564"}),
    ):
        try:
            d = geocode(a["query"], **extra)
        except Exception as e:
            out[label] = {"error": str(e)}; continue
        feats = d.get("features", [])
        top = feats[0] if feats else None
        ctx = {c["id"].split(".")[0]: c["text"] for c in (top or {}).get("context", [])}
        out[label] = {
            "n": len(feats),
            "hit": bool(top),
            "top_place_name": (top or {}).get("place_name"),
            "top_relevance": (top or {}).get("relevance"),
            "top_type": (top or {}).get("place_type"),
            "ctx": ctx,
        }
        time.sleep(0.12)
    return out

results = []
for a in uniq:
    r = probe(a)
    a["mapbox"] = r
    results.append(a)
    b = r["bare"]; k = r["kh_proximity"]
    print(f"{a['id']:9} {a['query'][:52]:54} bare={'HIT ' if b['hit'] else 'MISS'} "
          f"kh+prox={'HIT ' if k['hit'] else 'MISS'} n={k['n']}")

os.makedirs("conductor-logs", exist_ok=True)
out_path = "conductor-logs/bakeoff-mapbox.json"
json.dump(results, open(out_path, "w"), indent=1)

for label in ("bare", "country_kh", "kh_proximity"):
    hits = sum(1 for a in results if a["mapbox"][label]["hit"])
    print(f"\n{label}: {hits}/{len(results)} = {100*hits//len(results)}% hit")
print(f"\nwrote {out_path}")
