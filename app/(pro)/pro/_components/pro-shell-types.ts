// Client-safe shared shapes for the Pro shell (sidebar, tab bar, header).
// Kept separate from queries.ts because that module is server-only and
// these constants/types are consumed by "use client" components.

export type ClientHealth = "healthy" | "needs-attention" | "critical";

// Shared severity scale for dots/chips across the Pro UI.
export type Severity = "urgent" | "warning" | "info" | "ok" | "neutral";

// The light client row the shell renders (sidebar list, workspace tabs).
export type ShellClient = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  health: ClientHealth;
};

// Manager identity shown in the header and sidebar footer.
export type ShellManager = {
  name: string;
  initials: string;
};

// Health → status dot color, shared by sidebar, tabs, and tables.
export const HEALTH_DOT: Record<ClientHealth, string> = {
  healthy: "bg-emerald-500",
  "needs-attention": "bg-amber-500",
  critical: "bg-red-500",
};
