#!/usr/bin/env python3
"""Compare Mapbox geocoding query shapes against the real Khmer demo addresses,
to pick the fix empirically instead of guessing.

  python3 scripts/bakeoff-mapbox-variants.py /path/to/.env.local
"""
import sys, re, json, urllib.parse, urllib.request, collections

ENV = sys.argv[1] if len(sys.argv) > 1 else ".env.local"
tok = None
for line in open(ENV):
    if line.startswith("NEXT_PUBLIC_MAPBOX_TOKEN="):
        tok = line.split("=", 1)[1].strip().strip('"').strip("'")
if not tok:
    sys.exit("no NEXT_PUBLIC_MAPBOX_TOKEN")

import glob
ADDRS = []
for f in sorted(glob.glob("public/data/users/demo-user/properties/*/location.json")):
    d = json.load(open(f))
    line = (d.get("addressLine") or "").strip()
    city = (d.get("city") or "").strip()
    if line:
        ADDRS.append((f.split("/")[-2], f"{line}, {city}", city))

KH = "104.93,11.56"  # Phnom Penh

# V0 is exactly what app/_shared/add-property/_lib/use-geocode.ts ships today.
VARIANTS = {
    "V0 current (no country/proximity)": "limit=5&types=address,place,locality,neighborhood",
    "V1 +country+proximity": "limit=5&types=address,place,locality,neighborhood&country=kh&proximity=" + KH,
    "V2 +country+prox, addr/place only": "limit=5&types=address,place&country=kh&proximity=" + KH,
    "V3 +country+prox, address only": "limit=5&types=address&country=kh&proximity=" + KH,
    "V4 +country+prox, addr/poi": "limit=5&types=address,poi&country=kh&proximity=" + KH,
}


def q(query, params):
    url = (
        "https://api.mapbox.com/geocoding/v5/mapbox.places/"
        + urllib.parse.quote(query)
        + f".json?access_token={tok}&{params}"
    )
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            return json.load(r).get("features") or []
    except Exception as e:
        return {"__err": str(e)}


def sangkat(addr):
    """The address's own neighbourhood token, e.g. 'Veal Vong' from '..., Veal Vong, 7 Makara'."""
    p = [x.strip() for x in addr.split(",")]
    return p[-2] if len(p) >= 3 else None


results = {}
for name, params in VARIANTS.items():
    hits = 0
    street = 0
    sangkat_ok = 0
    sangkat_n = 0
    types = collections.Counter()
    for pid, addr, city in ADDRS:
        feats = q(addr, params)
        if isinstance(feats, dict) or not feats:
            continue
        hits += 1
        top = feats[0]
        t = tuple(top.get("place_type") or [])
        types[t] += 1
        if any(x in t for x in ("address", "poi")):
            street += 1
        sk = sangkat(addr)
        if sk:
            sangkat_n += 1
            if sk.lower() in (top.get("place_name") or "").lower():
                sangkat_ok += 1
    results[name] = {
        "hit": f"{hits}/{len(ADDRS)}",
        "street_precision": f"{street}/{hits}" if hits else "0/0",
        "sangkat_matches": f"{sangkat_ok}/{sangkat_n}" if sangkat_n else "0/0",
        "top_types": {",".join(k): v for k, v in types.items()},
    }

print(json.dumps(results, indent=2))
json.dump(results, open("conductor-logs/bakeoff-mapbox-variants.json", "w"), indent=2)
