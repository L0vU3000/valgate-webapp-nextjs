// User-facing product changelog.
//
// This is a HAND-CURATED file, not a feed. When a release ships, a human writes
// plain-language entries here — translating engineering commits (e.g.
// "fix(pro): close IDOR") into things a user actually cares about (e.g.
// "Managers now only see the portfolios they were granted"). The git commit log
// is the drafting *source*; it is never read at runtime.
//
// Only add an entry for a commit that has actually landed on `main`. Work still
// in progress on a feature branch doesn't belong here yet — add it once it
// ships, not before.
//
// Newest release goes at the TOP of the array. The first entry's `version` is
// what the Help menu compares against to decide whether to show the "unread" dot.

// The kind of change an entry describes. Drives the little colored badge in the
// "What's new" modal. Keep this list short and stable.
export type ChangeTag = "New" | "Improved" | "Fixed";

// One line item within a release.
export type ChangelogEntry = {
  tag: ChangeTag;
  text: string;
};

// One shipped release.
export type ChangelogRelease = {
  // Semantic-ish version string, "x.y.z". Used for display AND for the unread
  // comparison, so keep it a real, increasing version.
  version: string;
  // ISO date (YYYY-MM-DD). Formatted for display in the modal.
  date: string;
  entries: ChangelogEntry[];
};

// Releases, newest first. Curated from the commit history.
export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "1.0.3",
    date: "2026-07-08",
    entries: [
      {
        tag: "New",
        text: "Managers can now update a client's portfolio through an audited, permission-checked write path.",
      },
      {
        tag: "Improved",
        text: "The client dashboard tabs — Financials, Work Orders, Compliance, and Activity — have been rebuilt with clearer, live data.",
      },
      {
        tag: "Fixed",
        text: "Managers now only ever see the portfolios they've actually been granted access to.",
      },
    ],
  },
  {
    version: "1.0.2",
    date: "2026-07-02",
    entries: [
      {
        tag: "New",
        text: "The Valgate AI assistant can now make real changes for you — creating properties, leases, tenants, and recording payments.",
      },
      {
        tag: "New",
        text: "Connect Valgate to Claude and manage your portfolio straight from your AI assistant.",
      },
      {
        tag: "Improved",
        text: "Settings and account pages have been reorganised into a single, cleaner shell.",
      },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-06-29",
    entries: [
      {
        tag: "New",
        text: "Documents now open in a full file viewer with an automatic AI summary.",
      },
      {
        tag: "New",
        text: "Adding a property can now be paused and resumed — your progress is saved as a draft.",
      },
    ],
  },
];

// The newest version in the changelog. `undefined` only if the list is empty.
export function getLatestChangelogVersion(): string | undefined {
  return CHANGELOG[0]?.version;
}

// Compare two "x.y.z" version strings. Returns a positive number when `a` is
// newer than `b`, negative when older, 0 when equal. Parsing is defensive:
// missing or non-numeric parts count as 0, so a malformed version never throws —
// it just sorts low, which makes the unread check err toward showing the dot.
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const partsB = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);
  for (let index = 0; index < length; index += 1) {
    const valueA = partsA[index] ?? 0;
    const valueB = partsB[index] ?? 0;
    if (valueA !== valueB) {
      return valueA - valueB;
    }
  }
  return 0;
}
