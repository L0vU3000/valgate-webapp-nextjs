import { describe, expect, it } from "vitest";
import { adjudicate, docClass, isEvidence, type Candidate } from "./doc-precedence";

const c = (
  value: number,
  file: string,
  docType: string,
  date = "",
  declared = false,
): Candidate => ({ value, file, docClass: docClass(file, docType), date, declared });

describe("docClass", () => {
  it("reads a hard title as a hard title, not as a bare title", () => {
    expect(docClass("KD_04_HardTitle.pdf", "Hard title")).toBe("hard-title");
  });

  it("reads a camel-cased contract as a sale, not as generic legal", () => {
    expect(docClass("PP_030_031_032_033_SaleContract.pdf", "Sale contract")).toBe("sale");
  });

  it("reads a previous title as a title, so the date rule can supersede it", () => {
    expect(docClass("KD_09_PreviousTitle.pdf", "Previous title")).toBe("soft-title");
  });

  it("does not call a map sheet or an owner sheet evidence of the parcel", () => {
    expect(isEvidence(c(324035, "SR_01-02-03_Map.pdf", "Map sheet"))).toBe(false);
    expect(isEvidence(c(1800, "KPS_07_Owner.pdf", "Owner ID"))).toBe(false);
  });
});

describe("adjudicate", () => {
  it("prefers a title to a tax receipt whatever their dates", () => {
    const verdict = adjudicate([
      c(342, "KD_09_Tax.pdf", "Tax receipt", "2021-03-04"),
      c(1204, "KD_09_PreviousTitle.pdf", "Previous title", "2019-08-01"),
    ]);
    expect(verdict).toMatchObject({ kind: "auto", winner: { value: 1204 } });
  });

  it("prefers the newer of two documents of the same class", () => {
    const verdict = adjudicate([
      c(4518, "SR_011_softTitle.pdf", "Soft title", "2020-01-10"),
      c(4575, "SR_011_AdminDoc.pdf", "Soft title", "2024-06-02"),
    ]);
    expect(verdict).toMatchObject({ kind: "auto", winner: { value: 4575 } });
  });

  it("asks a human only when class and date are both tied", () => {
    const verdict = adjudicate([
      c(334, "a_Tax.pdf", "Tax receipt", "2022-02-02"),
      c(374, "b_Tax.pdf", "Tax receipt", "2022-02-02"),
    ]);
    expect(verdict.kind).toBe("human");
  });

  it("finds no conflict when the documents that are evidence agree", () => {
    // The SR block: two titles agree, and the map sheet that disagrees is the whole block, not this
    // parcel — so it is excluded rather than allowed to invent a conflict.
    const verdict = adjudicate([
      c(324035, "SR_01-02-03_Map.pdf", "Map sheet"),
      c(18138, "SR_01_Hard_title.pdf", "Hard title", "2023-01-01"),
      c(18138, "SR_01_Sale.pdf", "Sale contract", "2022-01-01"),
    ]);
    expect(verdict.kind).toBe("none");
  });

  it("does not use the value already in the database to break a tie", () => {
    // The stored value is the incumbent, not a document. Letting it vote would make every conflict
    // resolve in favour of whoever entered the row first.
    const verdict = adjudicate([c(9999, "", "", "", true), c(1204, "a_Hard_title.pdf", "Hard title")]);
    expect(verdict.kind).toBe("none");
  });
});
