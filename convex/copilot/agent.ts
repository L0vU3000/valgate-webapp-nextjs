"use node";

// Placeholder agent wiring. This will be expanded to use a real agent runtime and tools.

export type CopilotEvent =
  | { kind: "token"; payload: string }
  | { kind: "final"; payload: string }
  | { kind: "intent"; payload: any }
  | { kind: "tool_start"; payload: { name: string; args?: any } }
  | { kind: "tool_result"; payload: { name: string; result?: any } }
  | { kind: "citations"; payload: Array<{ fileId: string; title?: string; url?: string }> };

export type ToolContext = {
  orgId: string;
  userId: string;
};

export async function ragSearch(_ctx: ToolContext, _query: string) {
  // TODO: Vector search in copilot_index and return citation candidates
  return [] as Array<{ fileId: string; snippet: string }>;
}

export async function vaultNavigator(_ctx: ToolContext, _target: { route: string }) {
  return { kind: "intent", payload: { type: "NAVIGATE", route: _target.route } } as const;
}

export async function mapboxTool(_ctx: ToolContext, _args: any) {
  // TODO: Call Mapbox APIs using env token and return intent payloads
  return { kind: "intent", payload: { type: "MAP_FLY_TO", lng: 104.9, lat: 11.55, zoom: 10 } } as const;
}

export async function neonSqlRO(_ctx: ToolContext, _sql: string) {
  // TODO: Execute read-only Neon SQL after guardrails validation
  return { rows: [] };
}


