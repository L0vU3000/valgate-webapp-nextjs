// Regression coverage for PUBLIC-LAUNCH-PLAN Step 1.2: remove dead navigation to cut
// features. Task 5.5 of the original OpenSpec cut ("grep for orphaned imports and
// dangling links") was never completed, so several real UI surfaces still rendered
// links to routes that don't exist (/pro, /analytics, /estate-planning, /map, /docs).
//
// These checks are policy-based (source text + file existence), not line-number
// assertions, so they survive reformatting and keep failing for as long as a dead
// destination is reachable — see docs/plans/PUBLIC-LAUNCH-PLAN.md §1.2 for the source
// audit this codifies.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { CUT_ROUTE_PREFIXES, resolveNotificationDestination } from "@/lib/navigation/notification-destination";

const ROOT = path.resolve(__dirname, "..");

// Prefixes for features cut from the MVP. No route under app/ serves any of these —
// confirmed by `find app -type d -iname "<name>"` returning nothing for every entry.
// Sourced from the shared resolver so "is this route cut" has exactly one definition
// for both the navigation resolver and this test suite.
const CUT_PREFIXES = CUT_ROUTE_PREFIXES;

// Matches a quoted/backtick string that IS one of the cut destinations, or starts
// with one followed by /, ?, or # (e.g. "/pro/dashboard", `/pro/clients/${id}`).
const CUT_DESTINATION_RE = new RegExp(
  `["'\`](/(?:${CUT_PREFIXES.join("|")})(?:[/?#][^"'\`]*)?)["'\`]`,
  "g",
);

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function exists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// Parses a source file with the TypeScript compiler API so the AST-based checks
// below survive reformatting (spacing, line breaks, quote style) the way the old
// whole-file regex extraction could not.
function parseSourceFile(relPath: string): ts.SourceFile {
  return ts.createSourceFile(relPath, read(relPath), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function findVariableInitializer(sourceFile: ts.SourceFile, name: string): ts.Expression | undefined {
  let found: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

describe("navigation integrity — no dead destinations for cut MVP features", () => {
  it("command palette Navigate group only offers destinations that are real routes", () => {
    const source = read("components/home/CommandPalette.tsx");
    // The Navigate group is the only place in this file with `path:` entries —
    // Properties and Documents items key off `p.id` / `doc.id` instead.
    const destinations = [...source.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(destinations.length).toBeGreaterThan(0);

    for (const dest of destinations) {
      const pathname = dest.split("?")[0].split("#")[0];
      const isCut = CUT_PREFIXES.some((p) => pathname === `/${p}` || pathname.startsWith(`/${p}/`));
      expect(isCut, `${dest} is a cut destination and must not be offered`).toBe(false);
    }

    // Exactly the MVP's real navigate targets: Add Property, All Properties, Settings, Profile.
    expect([...destinations].sort()).toEqual(
      ["/add-property", "/portfolio", "/settings", "/settings?section=profile"].sort(),
    );
  });

  it("AppHeader renders no manager Pro pill and no longer depends on isManager", () => {
    const source = read("components/layout/AppHeader.tsx");
    expect(source).not.toContain("/pro/dashboard");
    expect(source).not.toContain("useIsManager");
    expect(source).not.toContain("isManager");
  });

  it("AppHeaderPropertiesContext no longer exposes an isManager flag", () => {
    const source = read("components/layout/AppHeaderPropertiesContext.tsx");
    expect(source).not.toContain("isManager");
    expect(source).not.toContain("useIsManager");
  });

  it("the manager context banner and org-switch hook are deleted, not just unmounted", () => {
    expect(exists("components/layout/ManagerContextBanner.tsx")).toBe(false);
    expect(exists("lib/hooks/use-switch-org.ts")).toBe(false);
  });

  it("the shell layout no longer mounts the manager banner or fetches manager-only account data for it", () => {
    const source = read("app/(shell)/layout.tsx");
    expect(source).not.toContain("ManagerContextBanner");
    expect(source).not.toContain("listManagedAccounts");
    expect(source).not.toContain("getIsManager");
  });

  it("settings has no Account type nav item, no Standard/Pro control, and no manager-mode wiring", () => {
    const pageSource = read("app/(shell)/settings/_components/SettingsPage.tsx");
    expect(pageSource).not.toContain("account-type");
    expect(pageSource).not.toContain("AccountTypeSection");
    expect(pageSource).not.toContain("AccountTypeControl");
    expect(pageSource).not.toContain("setManagerMode");

    const actionsSource = read("app/(shell)/settings/actions.ts");
    expect(actionsSource).not.toMatch(/export\s+async\s+function\s+setManagerMode/);

    const queriesSource = read("app/(shell)/settings/queries.ts");
    expect(queriesSource).not.toContain("isManager");
  });

  it("settings preserves the owner-side Managers section and its backend, untouched", () => {
    // The plan explicitly preserves is_manager, lib/services/managers.ts, the Clerk
    // webhook, and MCP behavior. This pins that the *unrelated* admin-only Managers
    // settings section (invite code, access requests, granted managers) survives the
    // account-type cleanup rather than being collapsed along with it.
    expect(exists("lib/services/managers.ts")).toBe(true);
    expect(exists("app/(shell)/settings/_components/ManagersSection.tsx")).toBe(true);
    const pageSource = read("app/(shell)/settings/_components/SettingsPage.tsx");
    expect(pageSource).toContain("ManagersSection");
    const queriesSource = read("app/(shell)/settings/queries.ts");
    expect(queriesSource).toContain("managersData");
  });

  it("middleware does not carry a stale public matcher for a /docs route that doesn't exist", () => {
    const source = read("middleware.ts");
    expect(source).not.toMatch(/["']\/docs\(/);
  });

  it("the property progress pillar for the cut Estate Planning page is not a clickable dead link", () => {
    // The pillar itself (beneficiary/estate-verified checks) is real, non-navigation
    // business data and must survive — only its link to the deleted /estate-planning
    // route should go.
    const derivationSource = read("lib/data/derivations/progress.ts");
    expect(derivationSource).toContain('name: "Estate Planning"');
    expect(derivationSource).not.toMatch(/href:\s*[`"]\/estate-planning[`"]/);
  });

  it("every ProgressPillar href resolves to a real property route, and pillars without a surviving page render non-clickable", () => {
    // Walks the AST of the rawPillars array literal rather than regex-matching
    // indentation, so reformatting/reordering the file can't silently drop a
    // pillar out of coverage.
    const rel = "lib/data/derivations/progress.ts";
    const sourceFile = parseSourceFile(rel);
    const rawPillars = findVariableInitializer(sourceFile, "rawPillars");
    expect(rawPillars && ts.isArrayLiteralExpression(rawPillars), "rawPillars array literal not found").toBe(true);
    const elements = (rawPillars as ts.ArrayLiteralExpression).elements;
    expect(elements.length).toBeGreaterThan(0);

    const pillars = elements.map((el) => {
      expect(ts.isObjectLiteralExpression(el), "expected each rawPillars entry to be an object literal").toBe(true);
      const obj = el as ts.ObjectLiteralExpression;
      let key: string | null = null;
      let href: string | null = null;
      for (const prop of obj.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
        if (prop.name.text === "key" && ts.isStringLiteralLike(prop.initializer)) {
          key = prop.initializer.text;
        }
        if (prop.name.text === "href") {
          href = prop.initializer.getText(sourceFile);
        }
      }
      expect(key, "pillar entry missing a key").not.toBeNull();
      return { key: key as string, href };
    });

    // Pins the complete pillar set so a renamed, added, or removed pillar can't
    // silently evade this check — must be updated deliberately alongside progress.ts.
    const EXPECTED_KEYS = ["location", "financials", "rental", "ownership", "safety", "estate", "documents"];
    expect(pillars.map((p) => p.key).sort()).toEqual([...EXPECTED_KEYS].sort());

    // Pillars whose destination page was cut from the MVP: they keep their checks,
    // name, and score, but must not render as a clickable link (see the Estate
    // Planning test above for the precedent this generalizes).
    const NO_LINK_PILLARS = new Set(["estate", "safety"]);

    for (const { key, href } of pillars) {
      if (NO_LINK_PILLARS.has(key)) {
        expect(href, `${key} pillar must not declare an href — no real page exists for it`).toBeNull();
        continue;
      }

      expect(href, `${key} pillar is missing an href`).not.toBeNull();
      const segmentMatch = href!.match(/\/property\/\$\{pid\}\/([a-z-]+)/);
      expect(segmentMatch, `${key} pillar href is not of the form \`/property/\${pid}/<segment>\`: ${href}`).not.toBeNull();
      const segment = segmentMatch![1];
      const pagePath = `app/(shell)/property/[id]/${segment}/page.tsx`;
      expect(
        exists(pagePath),
        `${key} pillar links to /property/\${pid}/${segment} but ${pagePath} does not exist`,
      ).toBe(true);
    }
  });

  it("no cut destination survives as a literal route string in the files this step touches", () => {
    // Mirrors PUBLIC-LAUNCH-PLAN.md's own verify grep, scoped to the surfaces audited
    // for this step (see task write-up). This now also covers the notification
    // `linkTo` payloads in the Pro/manager domain modules below — router.push(n.linkTo)
    // in NotificationsPanel makes them genuinely user-clickable, not dormant. Their
    // non-navigation parsing/domain logic (e.g. ai-context.ts's isProRoute checks,
    // client/portfolio derivation) is untouched and intentionally not scanned here —
    // see the dedicated yieldHref test below for that file.
    const filesToScan = [
      "components/home/CommandPalette.tsx",
      "components/layout/AppHeader.tsx",
      "components/layout/AppHeaderPropertiesContext.tsx",
      "components/layout/Sidebar.tsx",
      "app/(shell)/layout.tsx",
      "app/(shell)/settings/_components/SettingsPage.tsx",
      "app/(shell)/settings/actions.ts",
      "app/(shell)/settings/queries.ts",
      "middleware.ts",
      "lib/data/derivations/progress.ts",
      "components/portfolio/ProgressModal.tsx",
      "app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx",
      "lib/services/portfolio-members.ts",
      "lib/services/client-invitations.ts",
      "lib/services/change-requests.ts",
    ];

    const offenders: string[] = [];
    for (const rel of filesToScan) {
      const matches = [...read(rel).matchAll(CUT_DESTINATION_RE)].map((m) => m[1]);
      if (matches.length > 0) offenders.push(`${rel}: ${matches.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("notification payloads for the cut Pro cockpit drop their dead linkTo but keep their title and description", () => {
    // The Pro cockpit route is gone (see the command palette test above), so a
    // notification's /pro/clients linkTo is a dead, user-clickable destination —
    // NotificationsPanel-style consumers do `if (n.linkTo) router.push(n.linkTo)`.
    // The notification itself (invitation sent/bounced/accepted, change-request
    // decided) is still a real signal, so only the link is dropped, never the row.
    const filesToScan = [
      "lib/services/portfolio-members.ts",
      "lib/services/client-invitations.ts",
      "lib/services/change-requests.ts",
    ];

    for (const rel of filesToScan) {
      const source = read(rel);
      const calls = [...source.matchAll(/insertAccessNotification\(\{[\s\S]*?\}\);/g)].map((m) => m[0]);
      expect(calls.length, `${rel} should still call insertAccessNotification`).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call, `${rel}: notification call missing a title\n${call}`).toMatch(/\btitle\b/);
        expect(call, `${rel}: notification call missing a description\n${call}`).toMatch(/\bdescription\b/);
      }
    }
  });

  it("AI overlay yieldHref never points at a cut Pro/Analytics destination, and the property-specific link resolves to a real route", () => {
    // yieldHref is assigned four times: the default, the property-specific link, the
    // book-wide Pro cockpit, and the Pro client-detail view. isProRoute /
    // pathname.startsWith("/pro") stay as real, non-navigation parsing logic and are
    // not scanned here. Walked via the AST (declaration initializer + every plain
    // `yieldHref = ...` assignment) instead of a whole-file regex, so this can't miss
    // an assignment that gets reformatted or reflowed across lines.
    const rel = "lib/data/derivations/ai-context.ts";
    const sourceFile = parseSourceFile(rel);
    const assignments: string[] = [];
    const visit = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "yieldHref" &&
        node.initializer
      ) {
        assignments.push(node.initializer.getText(sourceFile));
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left) &&
        node.left.text === "yieldHref"
      ) {
        assignments.push(node.right.getText(sourceFile));
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    // Pins the exact assignment count so a removed or newly-added yieldHref
    // assignment can't silently slip out of coverage.
    expect(assignments.length).toBe(4);

    for (const value of assignments) {
      expect(value, `yieldHref assigned a cut destination: ${value}`).not.toMatch(/\/pro\b|\/analytics\b/);
    }

    // Default, former book-wide-dashboard, and former client-detail destinations all
    // point at the real /portfolio route.
    expect(assignments).toContain('"/portfolio"');

    // The property-specific assignment must target a route that actually exists
    // under app/(shell)/property/[id] — not a hardcoded expected string.
    const propertySpecific = assignments.filter((v) => v.includes("${propertyId}"));
    expect(propertySpecific.length).toBe(1);

    const match = propertySpecific[0].match(/\$\{propertyId\}\/([a-z-]+)`/);
    expect(match, `property-specific yieldHref must target a property sub-route: ${propertySpecific[0]}`).not.toBeNull();
    const segment = match![1];
    const pagePath = `app/(shell)/property/[id]/${segment}/page.tsx`;
    expect(
      exists(pagePath),
      `yieldHref targets /property/\${propertyId}/${segment} but ${pagePath} does not exist`,
    ).toBe(true);
  });

  describe("resolveNotificationDestination — shared notification linkTo policy", () => {
    it("returns null for null, undefined, and empty linkTo", () => {
      expect(resolveNotificationDestination(null)).toBeNull();
      expect(resolveNotificationDestination(undefined)).toBeNull();
      expect(resolveNotificationDestination("")).toBeNull();
    });

    it("returns null for protocol-relative and external destinations", () => {
      expect(resolveNotificationDestination("//evil.example.com/phish")).toBeNull();
      expect(resolveNotificationDestination("http://evil.example.com")).toBeNull();
      expect(resolveNotificationDestination("https://valgate.example.com/portfolio")).toBeNull();
      expect(resolveNotificationDestination("javascript:alert(1)")).toBeNull();
      expect(resolveNotificationDestination("mailto:someone@example.com")).toBeNull();
    });

    it("returns null for every cut route, at its root and at a nested descendant path", () => {
      for (const prefix of CUT_ROUTE_PREFIXES) {
        expect(resolveNotificationDestination(`/${prefix}`), `/${prefix} root should be suppressed`).toBeNull();
        expect(
          resolveNotificationDestination(`/${prefix}/nested/path?x=1#y`),
          `/${prefix}/... descendant should be suppressed`,
        ).toBeNull();
      }
    });

    it("does not false-positive on paths that merely share a prefix with a cut route", () => {
      expect(resolveNotificationDestination("/products")).toBe("/products");
      expect(resolveNotificationDestination("/procedures")).toBe("/procedures");
    });

    it("preserves safe same-site relative destinations, including query and hash", () => {
      expect(resolveNotificationDestination("/portfolio")).toBe("/portfolio");
      expect(resolveNotificationDestination("/property/abc123/valuation")).toBe("/property/abc123/valuation");
      expect(resolveNotificationDestination("/settings?section=profile")).toBe("/settings?section=profile");
      expect(resolveNotificationDestination("/property/abc123?orgId=xyz#docs")).toBe(
        "/property/abc123?orgId=xyz#docs",
      );
    });

    it("returns null for backslash targets that WHATWG URL parsing normalizes into an external host", () => {
      // `/\evil.example.com` passes a naive startsWith("/") / startsWith("//") check
      // (it starts with a single forward slash), but new URL() treats backslashes as
      // path separators equivalent to forward slashes, so
      // new URL("/\\evil.example.com", "https://valgate.example.com") resolves to
      // https://evil.example.com — an external host — not a same-site path.
      expect(resolveNotificationDestination("/\\evil.example.com")).toBeNull();
      // Nested variant: a leading empty segment then a backslash pivot, with a real
      // path/query tail — confirms the check isn't just matching the bare host case.
      expect(resolveNotificationDestination("/\\/evil.example.com/nested/path?x=1")).toBeNull();
    });
  });

  it("every notification linkTo router navigation resolves through resolveNotificationDestination", () => {
    // NotificationsPanel consumers each wire onNotificationClick with
    // `if (n.linkTo) router.push(n.linkTo)`-shaped handlers. That raw form is exactly
    // what lets a dead /pro/* (or any other cut-route) linkTo navigate — see the two
    // tests above. Every such handler must instead route through the shared resolver.
    const filesToScan = [
      "components/layout/AppHeader.tsx",
      "components/layout/PhoneTopBar.tsx",
      "components/property/PropertyLayout.tsx",
    ];

    for (const rel of filesToScan) {
      const source = read(rel);

      expect(
        source,
        `${rel} must import resolveNotificationDestination from the shared helper`,
      ).toMatch(
        /import\s*\{\s*resolveNotificationDestination\s*\}\s*from\s*["']@\/lib\/navigation\/notification-destination["']/,
      );

      expect(
        source,
        `${rel} pushes a notification's linkTo directly, bypassing the resolver`,
      ).not.toMatch(/router\.push\(\s*n\.linkTo\s*\)/);

      const handlers = [...source.matchAll(/onNotificationClick=\{[\s\S]*?\}\}/g)];
      expect(handlers.length, `${rel} should wire at least one onNotificationClick handler`).toBeGreaterThan(0);

      for (const [handler] of handlers) {
        expect(
          handler,
          `${rel}: onNotificationClick handler does not route linkTo through resolveNotificationDestination\n${handler}`,
        ).toMatch(/resolveNotificationDestination\(\s*n\.linkTo\s*\)/);
      }
    }
  });
});
