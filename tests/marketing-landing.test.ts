import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/(marketing)/page.tsx"), "utf8");

describe("marketing landing page", () => {
  // MARKETING_SPEC §3: no nav bar and no globe — the product preview card is the visual.
  it("has no globe and no header nav", () => {
    expect(page).not.toContain("CountryGlobe");
    expect(page).not.toContain("<header");
    expect(page).not.toContain("<nav");
  });

  it("keeps the spec's single headline and both register actions", () => {
    expect(page.match(/<h1/g)?.length).toBe(1);
    expect(page).toContain("Every property you own, in one instrument.");
    expect(page.match(/href="\/register"/g)?.length).toBe(2);
    expect(page).toContain('href="/login"');
  });

  // §3.2 anchor rule: no 52pt mono figure on this screen.
  it("has no 52pt hero figure", () => {
    expect(page).not.toContain("text-[52px]");
  });

  // /property-hero.jpg no longer exists; keep it out of the hero.
  it("does not reference the removed hero image", () => {
    expect(page).not.toContain("property-hero.jpg");
    expect(page).not.toContain("next/image");
  });

  // DESIGN.md: "Hardcode colors" is a Don't. Semantic roles only, so the page
  // follows the dark theme in theme.css.
  it("uses semantic tokens, never literal colour classes", () => {
    const literal = page.match(/\b(?:bg|text|border)-(?:slate|blue|gray|zinc)-?\d{0,3}\b/g) ?? [];
    expect(literal).toEqual([]);
    expect(page).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(page).toContain("bg-surface-base");
    expect(page).toContain("from-brand-deep");
    expect(page).toContain("text-secondary");
  });

  it("gives every link the touch-44 target", () => {
    const links = page.match(/<Link/g)?.length ?? 0;
    const targets = page.match(/touch-44/g)?.length ?? 0;
    expect(links).toBeGreaterThan(0);
    expect(targets).toBe(links);
  });

  it("hides both decorative brand bars from assistive tech", () => {
    expect(page.match(/aria-hidden className="[^"]*bg-brand/g)?.length).toBe(2);
  });
});
