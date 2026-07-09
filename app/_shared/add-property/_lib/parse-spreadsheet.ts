// Client-side spreadsheet parsing for the bulk property importer. Turns a user's uploaded CSV or
// Excel file into raw per-sheet cell matrices — NO assumption about which sheet holds the properties
// or which row is the header (real Valgate templates are multi-sheet with title/category rows on top).
// An AI step downstream picks the property sheet + header row. Runs in the browser (takes a File).

import Papa from "papaparse";
// This version of read-excel-file has no root export; the main-thread browser build is at the
// `/browser` subpath. Its default export reads the whole workbook and returns one wrapper per sheet
// ({ sheet: name, data: rows }).
import readXlsxFile from "read-excel-file/browser";

export const MAX_IMPORT_ROWS = 100;

// One worksheet as a raw matrix of trimmed string cells (rows × columns), header position unknown.
export type SheetMatrix = { name: string; matrix: string[][] };

export class SpreadsheetError extends Error {}

const cell = (c: unknown): string => String(c ?? "").trim();

// Detect CSV vs Excel by extension and return every sheet as a raw string matrix.
export async function parseWorkbook(file: File): Promise<SheetMatrix[]> {
  const name = file.name.toLowerCase();
  let sheets: SheetMatrix[];

  if (name.endsWith(".csv")) {
    sheets = [await parseCsv(file)];
  } else if (name.endsWith(".xlsx")) {
    sheets = await parseXlsx(file);
  } else {
    throw new SpreadsheetError("Unsupported file. Please upload a .csv or .xlsx spreadsheet.");
  }

  // Keep only sheets that actually have some content.
  const nonEmpty = sheets.filter((s) => s.matrix.some((row) => row.some((c) => c !== "")));
  if (nonEmpty.length === 0) {
    throw new SpreadsheetError("That file appears to be empty.");
  }
  return nonEmpty;
}

function parseCsv(file: File): Promise<SheetMatrix> {
  return new Promise((resolve, reject) => {
    // header: false — we don't know which row is the header yet, so parse raw rows.
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        const matrix = result.data.map((row) => row.map(cell));
        resolve({ name: file.name.replace(/\.csv$/i, ""), matrix });
      },
      error: (err) => reject(new SpreadsheetError(err.message)),
    });
  });
}

async function parseXlsx(file: File): Promise<SheetMatrix[]> {
  // Default export returns [{ sheet, data }] for every worksheet in the workbook.
  const sheets = await readXlsxFile(file);
  return sheets.map((s) => ({
    name: s.sheet,
    matrix: s.data.map((row) => row.map(cell)),
  }));
}
