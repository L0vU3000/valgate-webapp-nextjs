// Which document wins when several state an area for the same property.
//
// This is a rule, not a judgement. A model asked "which is more accurate" returns a number with no
// document behind it, and the user cannot answer it either — for a half-legible tax receipt there is
// no fact of the matter. So the machine only ranks by document class, then date, and anything it
// cannot rank is handed to a human as a question with both documents attached.
//
// Scope comes first. Several documents in this corpus state an area that is not this property's:
// a map sheet covers the whole block, an owner sheet belongs to a person. Those are excluded rather
// than ranked low — a "winner" picked from them is wrong with confidence, which is worse than an
// unresolved conflict.

export type DocClass = "hard-title" | "soft-title" | "legal" | "sale" | "tax" | "map" | "unrelated";

/** Strength of a document as evidence of the parcel's area. 0 = not evidence of this parcel at all. */
const CLASS_RANK: Record<DocClass, number> = {
  "hard-title": 5,
  "soft-title": 4,
  legal: 3,
  sale: 2,
  tax: 1,
  map: 0,
  unrelated: 0,
};

/**
 * Classify by what the model read first, filename second.
 *
 * Order matters: "Hard_title" also matches a bare /title/, and "SaleContract" also matches
 * /contract/, so the specific classes are tested before the general ones.
 */
export function docClass(file: string, docType = ""): DocClass {
  const t = `${docType} ${file}`.toLowerCase();
  if (/map|ប្លង់|sheet/.test(t)) return "map";
  if (/photo|image|scan of an id|owner|seller|id card/.test(t)) return "unrelated";
  if (/hard\s*-?\s*title|hardtitle/.test(t)) return "hard-title";
  if (/soft\s*-?\s*title|softtitle|previous\s*title|title|certificate|ownership|register/.test(t))
    return "soft-title";
  if (/tax|receipt|invoice/.test(t)) return "tax";
  if (/sale|purchase|contract|transfer|exchange/.test(t)) return "sale";
  if (/admin|notice|power of attorney|legal|filing|court/.test(t)) return "legal";
  return "unrelated";
}

export type Candidate = {
  /** The area this document states, as a whole number of m². */
  value: number;
  file: string;
  docClass: DocClass;
  /** As printed. Compared as a string: this corpus mixes ISO dates with dd/mm/yyyy and unset dates. */
  date: string;
  /** True for the value already in the database — the incumbent, not a document. */
  declared?: boolean;
};

export type Verdict =
  | { kind: "none" }
  | { kind: "auto"; winner: Candidate }
  | { kind: "human"; tied: Candidate[] };

/**
 * Pick the document a human should be shown as authoritative, or say that no human is needed.
 *
 * Returns `none` when the documents that are evidence of this parcel agree (or there is at most one),
 * `auto` when class or date breaks the tie, and `human` when two documents of the same class carry
 * the same date — the one case where the rule genuinely has nothing left to go on.
 */
export function adjudicate(candidates: Candidate[]): Verdict {
  const docs = candidates.filter((c) => !c.declared && CLASS_RANK[c.docClass] > 0);
  if (new Set(docs.map((c) => c.value)).size < 2) return { kind: "none" };

  const ranked = [...docs].sort(
    (a, b) =>
      CLASS_RANK[b.docClass] - CLASS_RANK[a.docClass] ||
      // ponytail: string compare, so it is only right for the ISO dates the model mostly returns; a
      // dd/mm/yyyy read sorts wrong but still sorts. Parse per-format if a wrong pick shows up.
      b.date.localeCompare(a.date),
  );
  const [first, second] = ranked;
  if (second && second.value !== first.value) {
    if (CLASS_RANK[first.docClass] === CLASS_RANK[second.docClass] && first.date === second.date) {
      return { kind: "human", tied: ranked.filter((c) => c.value !== first.value) };
    }
    return { kind: "auto", winner: first };
  }
  return { kind: "none" };
}

/** The classes that are evidence of this parcel's own area, for reporting. */
export function isEvidence(c: Candidate): boolean {
  return CLASS_RANK[c.docClass] > 0;
}
