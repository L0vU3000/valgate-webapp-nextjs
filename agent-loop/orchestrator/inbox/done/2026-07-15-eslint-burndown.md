---
type: lint
priority: normal
created: 2026-07-15
---

Drain the 63 ESLint warnings in `app lib components` toward zero without introducing
any `tsc` errors or breaking any of the 165 passing tests. "Done" = warning count is 0
(or every remaining warning is documented as intentional), with `tsc` still at 0 errors
and `vitest` still green. This is the first pipeline's seed ticket.
