// Pure header-slicing for the importer: turn a raw sheet matrix into header-keyed row objects, given
// which row is the header (the AI decides that). Everything above the header row (titles, category
// groups, blank rows) is dropped; empty data rows are skipped. Kept dependency-free (no browser parser
// import) so it's unit-testable in a node environment.

// Find the header row of a sheet deterministically: within the first rows, the header is the row with
// the most non-empty cells that still has data beneath it (title/category/blank rows above it are
// sparser; the header is the fullest row before the data block). Ties go to the earliest row. Done in
// code because asking a model for the exact 0-based index is unreliable (off-by-one onto a blank row).
const HEADER_SCAN_LIMIT = 20;

export function findHeaderRow(matrix: string[][]): number {
  const limit = Math.min(matrix.length, HEADER_SCAN_LIMIT);
  let bestIndex = 0;
  let bestCount = -1;
  for (let i = 0; i < limit; i++) {
    const nonEmpty = (matrix[i] ?? []).filter((c) => c.trim() !== "").length;
    const hasDataBelow = matrix.slice(i + 1).some((row) => row.some((c) => c.trim() !== ""));
    if (hasDataBelow && nonEmpty > bestCount) {
      bestCount = nonEmpty;
      bestIndex = i;
    }
  }
  return bestIndex;
}

export function extractRows(
  matrix: string[][],
  headerRowIndex: number,
): { headers: string[]; rows: Record<string, string>[] } {
  const headerRow = matrix[headerRowIndex] ?? [];
  const headers = headerRow.map((h) => h.trim());
  const rows = matrix
    .slice(headerRowIndex + 1)
    .map((cells) => {
      const out: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h) out[h] = (cells[i] ?? "").trim();
      });
      return out;
    })
    .filter((row) => Object.values(row).some((v) => v !== ""));
  return { headers: headers.filter(Boolean), rows };
}
