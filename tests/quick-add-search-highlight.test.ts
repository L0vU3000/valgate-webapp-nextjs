import { expect, it } from "vitest";
import {
  suggestionRowsSignature,
  moveHighlight,
} from "@/app/(shell)/_components/quick-add";

it("preserves an arrow selection across fresh arrays but resets for changed rows", () => {
  const rows = [{ id: "first" }, { id: "second" }];
  const previous = suggestionRowsSignature(rows);
  const highlight = moveHighlight(0, rows.length, 1);
  const reset = (next: typeof rows) =>
    suggestionRowsSignature(next) === previous ? highlight : 0;
  expect(reset(rows.map((row) => ({ ...row })))).toBe(1);
  expect(reset([...rows].reverse())).toBe(0);
  expect(reset([{ id: "new" }])).toBe(0);
  expect(reset([])).toBe(0);
});
