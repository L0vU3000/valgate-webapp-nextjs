// Client-side spreadsheet parsing for the bulk property importer. Turns a user's uploaded CSV or
// Excel file into a plain { headers, rows } shape the rest of the flow works with. Runs in the
// browser (it takes a File), so no "server-only" here.

import Papa from "papaparse";
// This version of read-excel-file has no root export; the main-thread browser build is at the
// `/browser` subpath. `readSheet(file)` reads the first sheet and returns rows (arrays of cells),
// first row = headers. (The default export returns per-sheet wrappers, not rows.)
import { readSheet } from "read-excel-file/browser";

export const MAX_IMPORT_ROWS = 100;

export type ParsedSheet = {
  headers: string[];
  // One object per data row, keyed by header. Every value is a string (we normalise/parse later).
  rows: Record<string, string>[];
};

export class SpreadsheetError extends Error {}

// Detects CSV vs Excel by extension, parses accordingly, and enforces the row cap. Throws a
// SpreadsheetError with a user-facing message on unsupported files or when the cap is exceeded.
export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  let sheet: ParsedSheet;

  if (name.endsWith(".csv")) {
    sheet = await parseCsv(file);
  } else if (name.endsWith(".xlsx")) {
    sheet = await parseXlsx(file);
  } else {
    throw new SpreadsheetError("Unsupported file. Please upload a .csv or .xlsx spreadsheet.");
  }

  if (sheet.headers.length === 0) {
    throw new SpreadsheetError("That file has no column headers in its first row.");
  }
  if (sheet.rows.length === 0) {
    throw new SpreadsheetError("That file has headers but no data rows.");
  }
  if (sheet.rows.length > MAX_IMPORT_ROWS) {
    throw new SpreadsheetError(
      `That file has ${sheet.rows.length} rows. Bulk import currently supports up to ${MAX_IMPORT_ROWS} at a time — please split it and try again.`,
    );
  }
  return sheet;
}

function parseCsv(file: File): Promise<ParsedSheet> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).map((h) => h.trim()).filter(Boolean);
        // Papa gives objects keyed by header; coerce every value to a trimmed string.
        const rows = result.data
          .map((row) => {
            const out: Record<string, string> = {};
            for (const h of headers) out[h] = String(row[h] ?? "").trim();
            return out;
          })
          .filter((row) => Object.values(row).some((v) => v !== ""));
        resolve({ headers, rows });
      },
      error: (err) => reject(new SpreadsheetError(err.message)),
    });
  });
}

async function parseXlsx(file: File): Promise<ParsedSheet> {
  // readSheet returns an array of rows, each row an array of cell values (first sheet).
  const matrix = await readSheet(file);
  if (matrix.length === 0) return { headers: [], rows: [] };

  const headers = matrix[0]!.map((c) => String(c ?? "").trim());
  const rows = matrix
    .slice(1)
    .map((cells) => {
      const out: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h) out[h] = String(cells[i] ?? "").trim();
      });
      return out;
    })
    .filter((row) => Object.values(row).some((v) => v !== ""));

  return { headers: headers.filter(Boolean), rows };
}
