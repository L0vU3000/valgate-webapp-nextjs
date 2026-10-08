import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/(marketing)/page.tsx"), "utf8");

describe("marketing landing page", () => {
  it("mounts the country globe as the hero element", () => {
    expect(page).toContain("<CountryGlobe");
  });

  // The landing page is the hero and nothing else: title, globe, copy, action.
  // Everything that used to sit below the action was removed on purpose, so
  // guard the removals to keep them from creeping back.
  it("ends at the hero action, with nothing below it", () => {
    expect(page).toContain("<CountryGlobe");
    expect(page).not.toContain("coverageByTier");
    expect(page).not.toContain("Where Valgate can read the land register");
    expect(page).not.toContain("Add a property the shortest way");
    expect(page).not.toContain("Start organizing your property records today");
    // One action in the body; the header and footer keep their own links.
    expect(page.match(/<main[\s\S]*?<\/main>/)?.[0].match(/<Link/g)?.length).toBe(1);
  });

  // /property-hero.jpg no longer exists; keep it out of the hero.
  it("does not reference the removed hero image", () => {
    expect(page).not.toContain("property-hero.jpg");
    expect(page).not.toContain("next/image");
  });

  // DESIGN.md: "Hardcode colors" is a Don't. The page must use semantic roles
  // (`bg-surface-base`, `text-secondary`, `bg-interactive-primary`) rather than
  // literal slate/blue classes, which is what made it unable to follow the dark
  // theme in theme.css. Guard the rule so it cannot drift back.
  it("uses semantic tokens, never literal colour classes", () => {
    const literal = page.match(/\b(?:bg|text|border)-(?:slate|blue|gray|zinc)-?\d{0,3}\b/g) ?? [];
    expect(literal).toEqual([]);
    expect(page).toContain("bg-surface-base");
    expect(page).toContain("bg-interactive-primary");
    expect(page).toContain("text-secondary");
  });

  // Both hero actions must clear the 44px touch minimum the system requires.
  it("gives every link the touch-44 target", () => {
    const links = page.match(/<Link/g)?.length ?? 0;
    const targets = page.match(/touch-44/g)?.length ?? 0;
    expect(links).toBeGreaterThan(0);
    expect(targets).toBe(links);
  });
});
