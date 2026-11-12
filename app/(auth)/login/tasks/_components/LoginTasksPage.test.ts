import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({}));
vi.mock("next/navigation", () => ({}));
vi.mock("@/components/auth/AuthBrandPanel", () => ({ AuthBrandPanel: () => null }));
vi.mock("@/components/auth/AuthFooter", () => ({ AuthFooter: () => null }));

// B1.3: "Workspace unavailable" is reached on zero memberships or a failed setActive.
// Without a sign-out it is a dead end: the shell's only sign-out sits behind the failing org.
it("workspace-unavailable screen offers a way out", async () => {
  const { WorkspaceUnavailable } = await import("./LoginTasksPage");
  const html = renderToStaticMarkup(createElement(WorkspaceUnavailable, { onSignOut: () => {} }));
  expect(html).toContain("Workspace unavailable");
  expect(html).toMatch(/<button[^>]*>[^<]*Sign out/);
});
