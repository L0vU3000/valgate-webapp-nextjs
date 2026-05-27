# Rule tests (optional)

Add a `.sql` file here only when the team has defined a **specific rule** to verify.

Each test must document:

- **RULE** — what must hold
- **ACTION** — SQL executed
- **EXPECT** — `reject` or `accept`

Run via `scripts/db/run-tests.sh` (wire the file in when added).

Do not add rules based on assumptions; add them when product/schema decisions are explicit.

See [`docs/database/writing-a-test.md`](../../../docs/database/writing-a-test.md).
