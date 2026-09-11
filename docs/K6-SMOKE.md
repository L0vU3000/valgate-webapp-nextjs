# k6 smoke load test

A 1-VU, 30-second read-only probe of `/login`, `/app`, and `/property/{id}`.
This is how TM1-71 turns the high-traffic audit's "can support 100-500 DAU"
opinion into a measured p95 and error rate.

**Status: local-only.** Nothing here runs in GitHub Actions. Wiring k6 into
CI is a separate, owner-approved phase — this change does not touch
`.github/workflows/ci.yml` or any other workflow.

## Files

| Path | Purpose |
|---|---|
| `load/smoke.js` | The k6 script. No default host. GET-only. |

## Required environment

| Variable | Required | Purpose |
|---|---|---|
| `BASE_URL` | Yes | Deployed URL to hit, e.g. a Vercel preview. The script throws if this is unset or blank — it will never fall back to production or localhost. |
| `PROPERTY_ID` | No | Property id for the third URL. Default `PROP-0001`. |
| `K6_SESSION_COOKIE` | Only for signed-in pages | Cookie header value from an already-signed-in browser session on that same host (`__session=...`). Without it, `/app` and `/property/{id}` still run, but on a Clerk development instance they return **404** (`protect-rewrite`, `dev-browser-missing`) instead of the signed-in shell. That is the TM1-62 Clerk test-user blocker. |

Install k6 separately ([Grafana k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)); it is not an npm dependency.

## Running

```bash
BASE_URL="https://<preview>.vercel.app" k6 run load/smoke.js
```

Signed-in (after TM1-62, paste cookies from a browser already on that host):

```bash
BASE_URL="https://<preview>.vercel.app" \
  K6_SESSION_COOKIE='__session=...; __client_uat=...' \
  k6 run load/smoke.js
```

Concurrency is **1 VU for 30 seconds** (k6's smoke shape). Override on the
command line if you want a heavier run (`k6 run --vus 5 --duration 1m ...`).

## What it does not do

- No GitHub Actions job, no secrets, no Vercel API.
- No form submit, no writes, no `/api/v1` calls.
- No default `BASE_URL`.
- No Clerk user provisioning (that is TM1-62).

## Recorded baseline

Recorded 2026-09-11 with k6 v1.3.0 against the live production host, **no
session cookie** (TM1-62 still open). Command:

```bash
BASE_URL=https://www.valgate.co k6 run load/smoke.js
```

Replace this table when a preview URL + Clerk test user are available.

| Field | Value |
|---|---|
| Target | `https://www.valgate.co` |
| Concurrency | 1 VU |
| Duration | 30 s |
| Iterations | 27 (81 HTTP requests) |
| `http_req_failed` | **0.00%** (0 / 81) |
| p95 `http_req_duration` (all) | **58 ms** (max 239 ms) |
| p95 `{page:login}` | **67 ms** (HTTP 200) |
| p95 `{page:app}` | **43 ms** (HTTP 404 Clerk protect-rewrite) |
| p95 `{page:property}` | **49 ms** (HTTP 404 Clerk protect-rewrite) |
| Checks | 100% (81 / 81) |
| Session | none |

`/login` is a real page load. `/app` and `/property/PROP-0001` are Clerk
signed-out **404** protect-rewrites on this Clerk development instance
(`x-clerk-auth-reason: protect-rewrite, dev-browser-missing`), so those two
p95s are "edge + 404 HTML", not authenticated SSR. This 1-VU smoke does not
by itself prove 100–500 DAU; it is the first measured number in the repo.
