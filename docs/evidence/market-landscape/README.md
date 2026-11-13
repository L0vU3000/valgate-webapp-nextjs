# Market landscape — evidence (2026-11-02)

Local dev server (`DEMO_MODE=true`, ORG-0001 seed on the Neon dev branch), live realestate.com.kh.

| File | State | Flag |
|---|---|---|
| `market-landscape-ok-desktop.png` | Meanchey stats, sale + rent medians, district medians | `MARKET_LANDSCAPE_ENABLED=true` |
| `market-landscape-ok-listings-desktop.png` | "Recent listings in Chak Angrae Leu", nearest first; placeholder-located rows say "location approximate" | on |
| `market-landscape-ok-attribution-desktop.png` | "Data © realestate.com.kh" under the listings | on |
| `market-landscape-ok-phone.png` | 390 × 844 bottom sheet, Market section | on |
| `market-landscape-unmatched-desktop.png` | Pin with no address; geocoder names no portal district → "Fix property address" | on |
| `market-landscape-disabled-desktop.png` | Default: flag unset → "isn't switched on yet" + "Browse realestate.com.kh" | unset |

HTTP check of the iOS contract, same server:

```
GET /api/v1/properties/PROP-0015/market-landscape → 200
coverage ok · area Meanchey / Chak Angrae Leu / Phnom Penh
stats.sale median 135000 (697) · stats.rent median 600 (1051) · districtMedians 8 · listings 12
GET /api/v1/properties/PROP-NOPE/market-landscape → 404
```

Not captured: `unsupported` (no seeded property outside Cambodia) and the error/retry state —
both covered by unit tests (`lib/services/market-landscape.test.ts`, route test).
