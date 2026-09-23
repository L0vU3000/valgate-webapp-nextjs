// Pure helpers for the seed id_counters guard (TM1-74).
//
// nextId() allocates `PREFIX-(next-1)`. If `id_counters.next` is at or behind the
// highest PREFIX-NNNN suffix already in a table, the next create collides on the
// primary key. These functions detect that drift without talking to the database,
// so a unit test can replay the PROP next=13 vs 25-row fixture bug.

/**
 * Pull the PREFIX and numeric suffix out of an id like "PROP-0025".
 *
 * Only ids that match UPPERCASE-digits are real nextId() values. Everything
 * else (demo-user, UUIDs, empty strings) is ignored so it cannot pollute a
 * counter.
 */
export function parsePrefixedId(
  id: string,
): { prefix: string; suffix: number } | null {
  if (typeof id !== "string" || id.length === 0) {
    return null;
  }

  const match = /^([A-Z]+)-(\d+)$/.exec(id);
  if (!match) {
    return null;
  }

  const prefix = match[1];
  const suffixText = match[2];
  if (!prefix || !suffixText) {
    return null;
  }

  const suffix = Number(suffixText);
  if (!Number.isFinite(suffix)) {
    return null;
  }

  return { prefix, suffix };
}

/**
 * Record the highest numeric suffix seen for this id's prefix.
 *
 * Ids without a PREFIX-NNNN shape are skipped. The map is mutated in place
 * so the seed loop can fold fixture ids and live table ids into one place.
 */
export function rememberMaxSuffix(
  maxByPrefix: Map<string, number>,
  id: string,
): void {
  const parsed = parsePrefixedId(id);
  if (!parsed) {
    return;
  }

  const current = maxByPrefix.get(parsed.prefix) ?? 0;
  maxByPrefix.set(parsed.prefix, Math.max(current, parsed.suffix));
}

/**
 * The `next` value seed should store for a prefix: one past the highest
 * suffix already in use, so nextId() hands out a fresh id.
 */
export function nextCounterValue(maxSuffix: number): number {
  return maxSuffix + 1;
}

export type CounterDrift = {
  prefix: string;
  counterNext: number | null;
  maxSuffix: number;
  message: string;
};

/**
 * Find prefixes where nextId() would collide with an existing id.
 *
 * A collision happens when `id_counters.next` is missing, or is <= the max
 * existing suffix. nextId() returns next-1, so next must be at least
 * maxSuffix + 1.
 */
export function findIdCounterDrift(
  maxByPrefix: Map<string, number>,
  counterNextByPrefix: Map<string, number>,
): CounterDrift[] {
  const drifts: CounterDrift[] = [];

  for (const [prefix, maxSuffix] of maxByPrefix) {
    const counterNext = counterNextByPrefix.get(prefix);

    if (counterNext === undefined) {
      if (maxSuffix >= 1) {
        drifts.push({
          prefix,
          counterNext: null,
          maxSuffix,
          message: `${prefix}: no id_counters row, but max suffix is ${maxSuffix}`,
        });
      }
      continue;
    }

    if (counterNext <= maxSuffix) {
      drifts.push({
        prefix,
        counterNext,
        maxSuffix,
        message: `${prefix}: counter.next=${counterNext} but max suffix is ${maxSuffix} (would collide)`,
      });
    }
  }

  return drifts;
}

/**
 * Throw if any counter is not strictly ahead of existing suffixes.
 *
 * The error text names the prefixes and points at the greatest() upsert, so
 * a seed run or a unit test fails with the same fix hint.
 */
export function assertIdCountersAheadOfSuffixes(
  maxByPrefix: Map<string, number>,
  counterNextByPrefix: Map<string, number>,
): void {
  const drifts = findIdCounterDrift(maxByPrefix, counterNextByPrefix);
  if (drifts.length === 0) {
    return;
  }

  throw new Error(
    "id_counters drift detected — nextId() would collide:\n" +
      drifts.map((d) => `  - ${d.message}`).join("\n") +
      "\nFix: upsert id_counters with greatest(current, new), not onConflictDoNothing.",
  );
}
