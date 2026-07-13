import { describe, expect, it } from "vitest";
import {
  filterSlashCommands,
  parseSlashQuery,
  SLASH_COMMANDS,
  type SlashCommandGroup,
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

  it("includes pro commands on /pro routes", () => {
    const result = filterSlashCommands("", true);
    expect(result.length).toBe(SLASH_COMMANDS.length);
  });

  it("groups results by domain, never interleaving two domains", () => {
    const result = filterSlashCommands("", true);
    const seen = new Set<SlashCommandGroup>();
    let lastGroup: SlashCommandGroup | null = null;
    for (const c of result) {
      if (c.group !== lastGroup) {
        expect(seen.has(c.group)).toBe(false); // a domain never reappears once it's closed
        seen.add(c.group);
        lastGroup = c.group;
      }
    }
  });

  it("within each domain, all 'ask' commands come before all 'do' commands", () => {
    const result = filterSlashCommands("", true);
    const byGroup = new Map<SlashCommandGroup, string[]>();
    for (const c of result) {
      const categories = byGroup.get(c.group) ?? [];
      categories.push(c.category);
      byGroup.set(c.group, categories);
    }
    for (const categories of byGroup.values()) {
      const lastAskIndex = categories.lastIndexOf("ask");
      const firstDoIndex = categories.indexOf("do");
      if (lastAskIndex !== -1 && firstDoIndex !== -1) {
        expect(lastAskIndex).toBeLessThan(firstDoIndex);
      }
    }
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
