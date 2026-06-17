import { describe, expect, it } from "vitest";
import {
  filterSlashCommands,
  parseSlashQuery,
  SLASH_COMMANDS,
} from "./slash-commands";

describe("parseSlashQuery", () => {
  it("returns an empty query right after the slash", () => {
    expect(parseSlashQuery("/")).toBe("");
  });

  it("returns the lower-cased text typed after the slash", () => {
    expect(parseSlashQuery("/Over")).toBe("over");
  });

  it("returns null when the input does not start with a slash", () => {
    expect(parseSlashQuery("who is overdue?")).toBeNull();
  });

  it("returns null once a space is typed (template inserted)", () => {
    expect(parseSlashQuery("/owner-statement for Client Sok")).toBeNull();
  });
});

describe("filterSlashCommands", () => {
  it("hides pro-only commands on consumer routes", () => {
    const result = filterSlashCommands("", false);
    expect(result.every((c) => c.scope === "all")).toBe(true);
    expect(result.find((c) => c.command === "/owner-statement")).toBeUndefined();
  });

  it("includes pro commands on /pro routes and surfaces them first", () => {
    const result = filterSlashCommands("", true);
    expect(result.length).toBe(SLASH_COMMANDS.length);
    const firstAllIndex = result.findIndex((c) => c.scope === "all");
    const lastProIndex = result.map((c) => c.scope).lastIndexOf("pro");
    expect(lastProIndex).toBeLessThan(firstAllIndex);
  });

  it("matches on command, title, and keywords", () => {
    expect(filterSlashCommands("rent", true).some((c) => c.command === "/rent-roll")).toBe(true);
    expect(filterSlashCommands("arrears", true).some((c) => c.command === "/overdue")).toBe(true);
    expect(filterSlashCommands("ltv", true).some((c) => c.command === "/equity")).toBe(true);
  });

  it("returns nothing for a query that matches no command", () => {
    expect(filterSlashCommands("zzzzz", true)).toHaveLength(0);
  });
});
