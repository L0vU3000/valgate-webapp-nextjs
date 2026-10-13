import { describe, it, expect } from "vitest";
import { normalizeDigits, printedArea } from "./printed-area";

// Every input here is a string this corpus actually printed. The point of the rule is that the
// comparison downstream can be believed: a false mismatch hides a real one.
describe("printedArea", () => {
  it("reads the plain and grouped spellings of a stated area", () => {
    expect(printedArea("725 ម២")).toBe("725");
    expect(printedArea("2860 ម២")).toBe("2860");
    expect(printedArea("1,407 ម៉ែត្រក្រឡា")).toBe("1407");
    expect(printedArea("2830 m2")).toBe("2830");
    expect(printedArea("324035m²")).toBe("324035");
  });

  it("reads Khmer numerals instead of skipping them", () => {
    expect(normalizeDigits("០១២៣៤៥៦៧៨៩")).toBe("0123456789");
    expect(printedArea("២,២២២ ម៉ែត្រការ៉េ")).toBe("2222");
    expect(printedArea("១៣០,៩១ម២")).toBe("13091");
  });

  it("joins a space-grouped number rather than reading its first group", () => {
    // "01 87 00" is 18,700 — reading it as 01 is how a property looked like one square metre.
    expect(printedArea("01 87 00")).toBe("18700");
  });

  it("refuses dimensions, however the document joins them", () => {
    expect(printedArea("14m x 38m")).toBe("");
    expect(printedArea("25 m × 38 m")).toBe("");
    expect(printedArea("ទទឹង 34,4 ម៉ែត្រ និង បណ្ដោយ 70,5 ម៉ែត្រ")).toBe("");
    expect(printedArea("width 34.4 m and length 70.5 m")).toBe("");
  });

  it("refuses a share of a parcel", () => {
    expect(printedArea("1/2 ៦០០ម២")).toBe("");
  });

  it("still returns a bare number, so a misplaced field fails loudly instead of vanishing", () => {
    // `48,20` is a form line the model put in `area_raw` on seven tax receipts. It is a number, so it
    // is compared and reported as a mismatch — the rule cannot know it belongs to another field.
    expect(printedArea("48,20")).toBe("4820");
  });

  it("returns empty for no string at all", () => {
    expect(printedArea("")).toBe("");
    expect(printedArea("មួយរយ")).toBe("");
  });
});
