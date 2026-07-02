// Pure portfolio helpers shared by portfolio-members.ts and client-invitations.ts.
// Lives in its own leaf module (no imports of either) so those two don't have to
// import each other — this file exists to break that import cycle.
import "server-only";
import type { PropertyTypeChoice, NewProperty } from "@/lib/data/types/property";

// Phase 6: three-tier portfolio role.
export type PortfolioRole = "admin" | "member" | "viewer";

// Maps our PortfolioRole to the Clerk org role string.
export function clerkRoleForPortfolioRole(role: PortfolioRole): string {
  if (role === "admin") return "org:admin";
  if (role === "member") return "org:member";
  return "org:viewer";
}

export type PropertyStub = {
  name: string;
  type: string;
  value?: number;
};

function stubTypeToPropertyType(rawType: string): PropertyTypeChoice {
  const key = rawType.trim().toLowerCase();
  if (key === "residential") return "residential";
  if (key === "commercial") return "commercial";
  if (key === "land") return "land";
  return "other";
}

export function buildPropertyFromStub(stub: PropertyStub): NewProperty {
  return {
    name: stub.name,
    type: stubTypeToPropertyType(stub.type),
    status: "Vacant",
    lat: 0,
    lng: 0,
    totalArea: "",
    title: "—",
    buyNumeric: stub.value ?? 0,
    currentMarketValue: stub.value,
  };
}
