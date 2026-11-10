import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

vi.mock("@/app/(shell)/settings/actions", () => ({
  inviteOrgMemberAction: vi.fn(), removeMemberAction: vi.fn(),
}));

const row = (over: object) => ({
  id: "MEM-1", userId: "USR-1", name: "Ann Owner", email: "Ann@x.com", role: "owner", status: "active",
  invitedAt: null, joinedAt: new Date("2026-03-14T12:00:00Z"), ...over,
});

async function render(members: object[]) {
  const { OrganizationSection } = await import("@/app/(shell)/settings/_components/OrganizationSection");
  return renderToStaticMarkup(createElement(OrganizationSection, {
    data: { orgName: "Acme Holdings", currentUserId: "USR-1", members } as never,
  }));
}

test("owner alone: self row has no actions, empty-state CTA shows", async () => {
  const html = await render([row({})]);
  expect(html).toContain("Acme Holdings");
  expect(html).toContain("(you)");
  expect(html).toContain("Joined Mar 14, 2026");
  expect(html).toContain("Invite a member");
  expect(html).not.toContain(">Remove<");
  expect(html).toContain('for="org-invite-email"');
  expect(html).toContain("Invite as a viewer");
  expect(html).not.toContain("<select");
  expect(html).not.toContain("Make owner");
});

test("other members: actions show, CTA hides, null name and invited date fall back", async () => {
  const html = await render([
    row({}),
    row({ id: "MEM-2", userId: "USR-2", name: null, email: "bo@x.com", role: "member", joinedAt: null, invitedAt: new Date("2026-02-01T12:00:00Z") }),
    row({ id: "MEM-3", userId: "USR-3", name: "Cy", email: "cy@x.com", role: "viewer", joinedAt: null }),
  ]);
  expect(html).not.toContain("Invite a member");
  expect(html).toContain('aria-label="Revoke access for bo@x.com"');
  expect(html).not.toContain("Make ");
  expect(html).toContain("Invited Feb 1, 2026");
  expect(html).toContain("—");
});

import { SharedPortfolioEmptyState } from "@/app/(shell)/portfolio/_components/SharedPortfolioEmptyState";

test("empty shared portfolio has an actionable request addressed to the real owner", () => {
  const html = renderToStaticMarkup(createElement(SharedPortfolioEmptyState, { ownerEmail: "owner@example.com" }));
  expect(html).toContain("view-only access");
  expect(html).toContain("Ask the owner to add a property");
  expect(html).toContain('href="mailto:owner@example.com?');
  expect(html).not.toContain("Add property on the map");
});

test("missing owner contact still offers an actionable copy-request fallback", () => {
  const html = renderToStaticMarkup(createElement(SharedPortfolioEmptyState, { ownerEmail: null }));
  expect(html).toContain("Copy a request for the owner");
  expect(html).not.toContain("mailto:");
});
