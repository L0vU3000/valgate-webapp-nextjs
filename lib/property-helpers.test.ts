import { describe, expect, it } from "vitest";
import { getPropertyTableEmptyStateKind } from "./property-helpers";

describe("getPropertyTableEmptyStateKind", () => {
  it("returns 'none' when there are rows to show", () => {
    expect(
      getPropertyTableEmptyStateKind({ pageRowsCount: 3, totalCount: 10, showArchived: false }),
    ).toBe("none");
  });

  it("returns 'archived-empty' for an empty archived view regardless of total count", () => {
    expect(
      getPropertyTableEmptyStateKind({ pageRowsCount: 0, totalCount: 0, showArchived: true }),
    ).toBe("archived-empty");
    expect(
      getPropertyTableEmptyStateKind({ pageRowsCount: 0, totalCount: 5, showArchived: true }),
    ).toBe("archived-empty");
  });

  it("returns 'first-use' when the owner genuinely has zero properties", () => {
    expect(
      getPropertyTableEmptyStateKind({ pageRowsCount: 0, totalCount: 0, showArchived: false }),
    ).toBe("first-use");
  });

  it("returns 'filtered-empty' when properties exist but filters hide all of them", () => {
    expect(
      getPropertyTableEmptyStateKind({ pageRowsCount: 0, totalCount: 12, showArchived: false }),
    ).toBe("filtered-empty");
  });
});
