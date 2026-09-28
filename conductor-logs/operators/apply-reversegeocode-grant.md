# Operator step: grant `geo-places:ReverseGeocode`

**Status: NOT APPLIED.** `valgate-storage` cannot read or write its own IAM policies
(`iam:GetUserPolicy`, `iam:ListUserPolicies`, `iam:PutUserPolicy` all return AccessDenied), and this
machine holds no admin credentials — `~/.aws/{config,credentials}` contain only `[default]` =
`valgate-storage`, no SSO, no admin profile.

**What it unblocks:** the add-property wizard's pin→address feature. Dragging the map pin calls
`/api/v1/address/reverse`, which fails with `AccessDeniedException` until this lands. Address *search*
(`SearchText`) already works.

---

## The command (admin principal)

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

### Equivalent manual path

Console → IAM → Users → `valgate-storage` → Permissions → the policy named
**`ValgateGeoPlacesBakeoff`** → Edit → Visual tab → add `geo-places:ReverseGeocode`.

Use the **Visual** tab; the JSON tab overwrites existing statements.

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
