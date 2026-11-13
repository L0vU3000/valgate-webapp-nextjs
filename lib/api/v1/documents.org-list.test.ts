import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/pg-proxy";
import { encodeCursor, decodeCursor } from "@/lib/pagination/cursor";
import type { Ctx } from "@/lib/services/_mapping";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ db: drizzle(query) }));
vi.mock("@/lib/env", () => ({ env: { DEMO_MODE: false } }));

import { listOrgDocumentsPage, summarizeOrgDocuments } from "@/lib/services/documents";

const ctx: Ctx = { orgId: "ORG-0001", userId: "USR-0001", orgRole: "viewer" };
// The proxy supplies only the selected public columns, in projection order.
const row = (id: string, time: number, category: string | null = "Title", propertyId = "PROP-0001", propertyName = "Ocean House") => [
  id, propertyId, null, `Document ${id}`, "document", "application/pdf", "pdf", 12,
  category, null, new Date(time).toISOString(), null, propertyName,
];

beforeEach(() => { query.mockReset(); query.mockResolvedValue({ rows: [] }); });

describe("org documents SQL and paging", () => {
  it("lists across caller-org properties newest first with public columns and propertyName", async () => {
    query.mockResolvedValue({ rows: [row("DOC-0003", 300), row("DOC-0002", 200, "Title", "PROP-0002", "Garden House")] });
    const page = await listOrgDocumentsPage(ctx, { limit: 20 });
    expect(page.items.map((item) => [item.id, item.propertyName])).toEqual([
      ["DOC-0003", "Ocean House"], ["DOC-0002", "Garden House"],
    ]);
    expect(page.nextCursor).toBeNull();
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('"documents"."org_id" =');
    expect(sql).toContain('"properties"."org_id" =');
    expect(params.filter((value: unknown) => value === ctx.orgId)).toHaveLength(2);
    expect(sql).toContain('order by "documents"."uploaded_at" desc, "documents"."id" desc');
    expect(params.at(-1)).toBe(21);
    expect(sql).toMatch(/where "documents"\."org_id" = \$\d+ order by/);
    expect(sql).toMatch(/inner join "properties" on \("documents"\."property_id" = "properties"\."id" and "properties"\."org_id" = \$\d+\)/);
    expect(sql).not.toMatch(/storage_id|uploaded_by|ai_summary|user_id/);
    expect(sql).toContain("image/%");
  });

  it("pages tied timestamps without duplicates or gaps using a descending tuple", async () => {
    query.mockResolvedValueOnce({ rows: [row("DOC-0003", 100), row("DOC-0002", 100), row("DOC-0001", 100)] });
    const first = await listOrgDocumentsPage(ctx, { limit: 2 });
    expect(first.items.map((item) => item.id)).toEqual(["DOC-0003", "DOC-0002"]);
    expect(decodeCursor(first.nextCursor!, ["uploadedAt", "id"])).toEqual({ uploadedAt: 100, id: "DOC-0002" });
    query.mockResolvedValueOnce({ rows: [row("DOC-0001", 100)] });
    const second = await listOrgDocumentsPage(ctx, { limit: 2, cursor: first.nextCursor });
    const [sql, params] = query.mock.calls[1];
    expect(sql).toMatch(/"uploaded_at" < \$\d+ or \("documents"\."uploaded_at" = \$\d+ and "documents"\."id" < \$\d+\)/);
    expect(params).toContain("DOC-0002");
    expect(params.filter((value: unknown) => value === ctx.orgId)).toHaveLength(2);
    expect([...first.items, ...second.items].map((item) => item.id)).toEqual(["DOC-0003", "DOC-0002", "DOC-0001"]);
    expect(second.nextCursor).toBeNull();
  });

  it("filters Title and uncategorized without inventing an enum value", async () => {
    await listOrgDocumentsPage(ctx, { limit: 1, category: "Title" });
    expect(query.mock.calls[0][0]).toMatch(/"category" = \$\d+/);
    expect(query.mock.calls[0][1]).toContain("Title");
    query.mockResolvedValueOnce({ rows: [row("DOC-0001", 100, null)] });
    const page = await listOrgDocumentsPage(ctx, { limit: 1, category: "uncategorized" });
    expect(query.mock.calls[1][0]).toContain('"documents"."category" is null');
    expect(query.mock.calls[1][1]).not.toContain("uncategorized");
    expect(page.items[0].category).toBeNull();
  });

  it.each(["photo", "document"] as const)("derives the %s filter from MIME, including missing MIME as document", async (kind) => {
    await listOrgDocumentsPage(ctx, { limit: 2, kind });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain(kind === "photo" ? '"mime_type" like' : '"mime_type" not like');
    if (kind === "document") expect(sql).toContain('"documents"."mime_type" is null');
    expect(params).toContain("image/%");
  });

  it.each([
    "bad", "", encodeCursor({ uploadedAt: -1, id: "DOC-0001" }),
    encodeCursor({ uploadedAt: "100", id: "DOC-0001" }),
    encodeCursor({ uploadedAt: 1e20, id: "DOC-0001" }),
    encodeCursor({ uploadedAt: 100, id: "" }), encodeCursor({ uploadedAt: 100, id: 1 }),
  ])("rejects malformed cursors before querying: %s", async (cursor) => {
    await expect(listOrgDocumentsPage(ctx, { limit: 20, cursor })).rejects.toThrow("invalid_cursor");
    expect(query).not.toHaveBeenCalled();
  });

  it("summarizes in one org-scoped aggregate, zero-filling all eight buckets", async () => {
    const byCategory = { Title: 2, Rental: 0, Photos: 0, Legal: 0, Financial: 0, Estate: 0, Other: 0, uncategorized: 1 };
    query.mockResolvedValue({ rows: [ [3, 2, byCategory] ] });
    const summary = await summarizeOrgDocuments(ctx, { kind: "document" });
    expect(summary).toEqual({ total: 3, propertyCount: 2, byCategory });
    expect(Object.keys(summary.byCategory)).toHaveLength(8);
    expect(Object.values(summary.byCategory).reduce((a, b) => a + b, 0)).toBe(summary.total);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/count\(distinct (?:"documents"\.)?"property_id"\)/);
    expect(sql).toMatch(/where \("documents"\."org_id" = \$\d+ and/);
    expect(params).toContain(ctx.orgId);
    expect(sql).toContain('"documents"."mime_type" not like');
    expect(sql.match(/count\(\*\) filter/g)).toHaveLength(8);
    expect(sql).toContain('"documents"."category" is null');
    expect(params.slice(0, 14)).toEqual([
      "Title", "Title", "Rental", "Rental", "Photos", "Photos", "Legal", "Legal",
      "Financial", "Financial", "Estate", "Estate", "Other", "Other",
    ]);
    expect(sql).not.toMatch(/group by|limit/);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
