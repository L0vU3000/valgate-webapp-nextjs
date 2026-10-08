# Operator step: grant `geo-places:ReverseGeocode`

**Status: APPLIED AND VERIFIED 2026-09-29.**

The policy `ValgateGeoPlacesBakeoff` now holds two statements — `SearchText` and `ReverseGeocode`,
both on `arn:aws:geo-places:ap-southeast-1::provider/default`. Applied by the owner in the AWS
console (JSON tab, two separate statements; the earlier "add a new action to the existing statement"
approach would have worked too).

Evidence (this machine, after the edit):

```
$ aws geo-places reverse-geocode --region ap-southeast-1 \
    --query-position 104.9239 11.5454 --language en \
    --query 'ResultItems[0].Address.Street' --output text
Street 398

 104.9282 11.5564  -> Preah Sihanouk Boulevard 274
 104.9180 11.5500  -> Street 113
 104.9350 11.5400  -> Street 369
```

And through the app's own service module (`lib/services/address.ts`), real AWS, no mocks:

```
$ npm run test:db   # tests/grabmaps-address.db.test.ts
Test Files  1 passed (1) | Tests  2 passed (2)
```

**Two traps that cost time here — both were live:**

1. `--query` on a denied call prints an **empty line**, and the AWS CLI emits a leading blank line
   before its error. A `head -1` retry loop therefore looks like it "succeeded" while actually
   failing. Check for `AccessDenied` explicitly, or use `--output json` and read the whole body.
2. **IAM propagation was not the cause of the delay** — 8 attempts over 2.5 minutes stayed denied,
   then the grant worked. The lag was console save→attach, not propagation. Do not burn time
   re-polling a correct policy; verify the policy is *attached* first.

**What this unblocks:** the add-property wizard's pin→address feature. Dragging the map pin calls
`/api/v1/address/reverse`, which returned `AccessDeniedException` until now. Address *search*
(`SearchText`) was never blocked.

---

## Historic: how to apply it (admin principal)

```bash
python3 scripts/grant-geo-places-policy.py
```

That script is **read → merge → write → read back**, for a reason: `aws iam put-user-policy`
**replaces the entire document** for a policy name. It does not merge. Writing a desired-state file
over the live policy silently deletes every action the file doesn't list.

If it cannot read the live policy it **aborts with exit 1** rather than writing. That is the correct
behaviour, not a bug — a blind write is how you drop S3 access while "adding" a geo permission.

`--list` prints every attached inline policy and its actions. Run that first if nobody has recorded
the full grant set: `valgate-storage` cannot read its own policies, so the complete set is currently
**unknown to anyone** who hasn't looked at the console.

### Equivalent manual path (use this when you have no admin profile)

Confirmed 2026-09-29: this machine has **only** `[default]` = `valgate-storage`, no SSO, no role to
assume, and `valgate-storage` cannot perform *any* IAM action (not even `iam:ListUsers`). So there is
no `AWS_PROFILE=<admin>` to find — the script cannot be run here by anyone. A human with console
access must do it, either by pasting the script to their own machine or via the console below.

Console → IAM → Users → `valgate-storage` → Permissions → the policy named
**`ValgateGeoPlacesBakeoff`** → Edit → **Visual** tab → add `geo-places:ReverseGeocode`.

Do **not** use the JSON tab — it overwrites the existing statements. For reference, the intended
final statement for that policy is:

```json
{
  "Sid": "GeoPlacesAddressLookup",
  "Effect": "Allow",
  "Action": ["geo-places:SearchText", "geo-places:ReverseGeocode"],
  "Resource": "arn:aws:geo-places:ap-southeast-1::provider/default"
}
```

Do **not** rename the policy. A new name creates a second overlapping policy and leaves the original
in place, so the grant appears to work while the old policy still governs.

---

## Verify (no IAM read permission needed)

This is the real proof — it exercises the API, not the policy document:

```bash
aws geo-places reverse-geocode --region ap-southeast-1 \
  --query-position 104.9239 11.5454 --language en \
  --query 'ResultItems[0].Address.Street' --output text
```

- Before: `AccessDeniedException ... not authorized to perform: geo-places:ReverseGeocode`
- After: a street name, e.g. `Street 398`

IAM changes are eventually consistent — allow ~30s before re-testing.

Then confirm end-to-end in the app: `/add-property?step=2` on **localhost:3001**, pick an address,
drag the pin, and watch the address fields follow.

---

## What is granted today (probed live 2026-09-28, not read from a file)

| Action | State |
|---|---|
| `s3:PutObject` / `s3:GetObject` / `s3:DeleteObject` | ALLOW |
| `s3:ListBucket` | DENY (deliberate — the app presigns, never lists) |
| `geo-places:SearchText` | ALLOW |
| `geo-places:ReverseGeocode` | **DENY ← this step** |
| `iam:GetUserPolicy` / `iam:ListUserPolicies` | DENY (cannot self-audit) |

Two probe traps, both of which produced false readings while writing this:

- **`s3:GetObject`/`HeadObject` must be probed against an EXISTING key.** Without `s3:ListBucket`, S3
  returns `403` for a *missing* key even when `GetObject` is allowed — so a nonexistent-key probe
  reports a false DENY.
- **`conductor-logs/iam-geo-places-policy.json` is a draft, not a record.** At `f048f1d` it listed
  four actions including `Autocomplete` and `GetPlace`; probes show only `SearchText` is live. Do not
  treat any committed policy file as current state.

## Scope note

Combining this with the S3 grant into one document is *possible* (`conductor-logs/iam-valgate-storage-policy.json`,
388 chars vs the 2048 inline cap) but needs `--list` first, or the replace-by-name behaviour above can
drop access. The additive change here needs no such audit.

`Autocomplete` and `GetPlace` are **not** needed: `SearchText` returns address + position in one hop,
so the minimal grant is two geo actions, not four.
