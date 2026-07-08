// Slash-command definitions for the Valgate Agent command bar (spec §4.3).
//
// These are *data only* — no React — so the set is easy to read, extend, and
// unit-test. The chat input parses what the user types after "/" and shows a
// menu of matching commands; selecting one inserts its `template` into the
// textarea for the user to complete. The templates are plain natural-language
// prompts (with [bracketed] slots the user fills in), so they route through the
// existing reply engine without needing any new parsing.
//
// The MCP-aligned action entries (add-property, add-lease, etc.) mirror the
// non-destructive VALGATE_TOOLS from mcp-server/tool-defs.ts. The AI model
// already has those tools registered via PRO_TOOLS in lib/actions/ai-tools.ts,
// so typing "/add-tenant" → inserting a template → Enter triggers the same
// underlying create_tenant tool that the MCP connector runs.

export type SlashCommandCategory = "ask" | "do";

// Shown as a section header above each group in the slash menu, in this order.
export const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  ask: "Ask",
  do: "Do",
};

const CATEGORY_ORDER: SlashCommandCategory[] = ["ask", "do"];

export type SlashCommand = {
  /** The trigger the user types, including the leading slash. */
  command: string;
  /** Short human label shown in the menu. */
  title: string;
  /** One-line hint shown under the title. */
  description: string;
  /** The prompt inserted into the input when the command is chosen. */
  template: string;
  /** Extra words that should also match this command while filtering. */
  keywords: string[];
  /**
   * "pro"  — only relevant in the manager cockpit (/pro/*).
   * "all"  — relevant to both owners and managers.
   * On consumer routes we hide "pro" commands so the menu stays relevant.
   */
  scope: "pro" | "all";
  /**
   * "ask" — a read-only question; answered from context/read tools, nothing is written.
   * "do"  — executes a real mutation, backed 1:1 by a shared VALGATE_TOOLS write tool
   *         (the same tool the MCP connector exposes).
   */
  category: SlashCommandCategory;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/overdue",
    title: "Overdue rent",
    description: "Who hasn't paid this month, and by how much",
    template: "Who is overdue on rent this month, and by how much?",
    keywords: ["arrears", "late", "unpaid", "collection"],
    scope: "all",
    category: "ask",
  },
  {
    command: "/rent-roll",
    title: "Rent roll",
    description: "Expected vs collected rent this month",
    template: "Show me the rent roll — expected vs collected rent this month.",
    keywords: ["rent", "collected", "expected", "income"],
    scope: "all",
    category: "ask",
  },
  {
    command: "/owner-statement",
    title: "Owner statement",
    description: "Generate a monthly statement for a client",
    template: "Generate the owner statement for [client] for [month].",
    keywords: ["report", "statement", "owner", "monthly", "packet"],
    scope: "pro",
    category: "ask",
  },
  {
    command: "/work-orders",
    title: "Work orders",
    description: "Open maintenance items by priority and client",
    template: "List the open work orders by priority and client.",
    keywords: ["maintenance", "repairs", "vendor", "tickets"],
    scope: "pro",
    category: "ask",
  },
  {
    command: "/assign-vendor",
    title: "Assign vendor",
    description: "Assign a vendor to a work order",
    template: "Assign vendor [vendor id] to work order [maintenance item id].",
    keywords: ["vendor", "contractor", "dispatch", "maintenance"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/compliance",
    title: "Compliance",
    description: "Certificates and inspections status",
    template: "What certificates or inspections are expiring in the next 90 days?",
    keywords: ["certificate", "inspection", "safety", "expiry", "risk"],
    scope: "all",
    category: "ask",
  },
  {
    command: "/expiring",
    title: "Expiring leases",
    description: "Leases ending soon",
    template: "Which leases expire in the next 90 days?",
    keywords: ["lease", "renewal", "ending", "vacancy"],
    scope: "all",
    category: "ask",
  },
  {
    command: "/value",
    title: "Property value",
    description: "Current market value of a property",
    template: "What is the current value of [property]?",
    keywords: ["valuation", "worth", "price", "market"],
    scope: "all",
    category: "ask",
  },
  {
    command: "/equity",
    title: "Equity & LTV",
    description: "Equity position and loan-to-value",
    template: "What is the equity and LTV for [property]?",
    keywords: ["equity", "ltv", "mortgage", "loan"],
    scope: "all",
    category: "ask",
  },
  {
    command: "/reassign",
    title: "Reassign property",
    description: "Move a property to a different client",
    template: "Reassign [property] to client [client].",
    keywords: ["reassign", "move", "client", "owner", "portfolio"],
    scope: "pro",
    category: "do",
  },

  // ── MCP action tools — one entry per VALGATE_TOOLS non-destructive tool ──
  // (/find-properties is a read, so it's categorized "ask" below despite living in this block.)
  {
    command: "/add-property",
    title: "Add property",
    description: "Add a new property to the workspace",
    template: "Add a new property. Name: [name], Type: [type], Status: [status], Purchase value: [amount], Area: [area].",
    keywords: ["create", "new", "property", "add"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/edit-property",
    title: "Edit property",
    description: "Change fields on an existing property",
    template: "Update property [id]. Change [field] to [value].",
    keywords: ["update", "change", "edit", "property", "modify"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/find-properties",
    title: "Search properties",
    description: "List all properties in the workspace",
    template: "Show me all properties in this workspace.",
    keywords: ["search", "list", "find", "properties", "portfolio"],
    scope: "pro",
    category: "ask",
  },
  {
    command: "/find-vendors",
    title: "Search professionals",
    description: "List vendors and professionals in the directory",
    template: "Show me all professionals/vendors in this workspace's directory.",
    keywords: ["search", "list", "find", "vendor", "professional", "contractor", "directory"],
    scope: "pro",
    category: "ask",
  },
  {
    command: "/add-lease",
    title: "Add lease",
    description: "Create a lease on a property",
    template: "Create a new lease on property [property id]. Unit: [unit], Monthly rent: [amount], Start: [date], End: [date].",
    keywords: ["create", "new", "lease", "rental", "contract"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/edit-lease",
    title: "Edit lease",
    description: "Change fields on an existing lease",
    template: "Update lease [id]. Change [field] to [value].",
    keywords: ["update", "change", "edit", "lease", "modify"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/add-tenant",
    title: "Add tenant",
    description: "Add a tenant to a property",
    template: "Add a tenant to property [property id]. Name: [name], Unit: [unit], Rent: [amount].",
    keywords: ["create", "new", "tenant", "add", "resident"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/edit-tenant",
    title: "Edit tenant",
    description: "Change fields on an existing tenant",
    template: "Update tenant [id]. Change [field] to [value].",
    keywords: ["update", "change", "edit", "tenant", "modify"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/add-payment",
    title: "Record payment",
    description: "Record a rent payment or fee",
    template: "Record a [kind] payment on lease [lease id]. Amount: [amount], Date: [date], Method: [method].",
    keywords: ["record", "payment", "rent", "fee", "deposit", "add"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/edit-payment",
    title: "Edit payment",
    description: "Change fields on an existing payment",
    template: "Update payment [id]. Change [field] to [value].",
    keywords: ["update", "change", "edit", "payment", "modify"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/maintenance",
    title: "Record maintenance",
    description: "Log a maintenance issue against a property",
    template: "Log a maintenance issue on property [property id]. Title: [title], Severity: [severity].",
    keywords: ["maintenance", "repair", "issue", "log", "record"],
    scope: "pro",
    category: "do",
  },
  {
    command: "/edit-maintenance",
    title: "Edit maintenance item",
    description: "Change status, severity, cost, or vendor on a maintenance item",
    template: "Update maintenance item [id]. Change [field] to [value].",
    keywords: ["update", "change", "edit", "maintenance", "modify", "status"],
    scope: "pro",
    category: "do",
  },
];

/**
 * If the input is a slash command still being typed (starts with "/" and has
 * no space yet, e.g. "/", "/over"), return the lower-cased query after the
 * slash. Otherwise return null — meaning the slash menu should not be shown.
 * Once a template with spaces is inserted, this returns null and the menu hides.
 */
export function parseSlashQuery(input: string): string | null {
  const match = input.match(/^\/(\S*)$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Filter the command set by the typed query. On a manager (/pro) route, pro
 * commands are included; on consumer routes they're hidden entirely. Results
 * are grouped by category ("ask" before "do") so the menu can render section
 * headers; within a category, original declaration order is preserved.
 */
export function filterSlashCommands(query: string, isPro: boolean): SlashCommand[] {
  const pool = SLASH_COMMANDS.filter((c) => isPro || c.scope === "all");
  const q = query.trim().toLowerCase();

  const matched =
    q === ""
      ? pool
      : pool.filter(
          (c) =>
            c.command.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q) ||
            c.keywords.some((k) => k.includes(q)),
        );

  // Stable sort: group by category in CATEGORY_ORDER, preserve relative order within a category.
  return matched
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ap = CATEGORY_ORDER.indexOf(a.c.category);
      const bp = CATEGORY_ORDER.indexOf(b.c.category);
      return ap !== bp ? ap - bp : a.i - b.i;
    })
    .map((x) => x.c);
}
