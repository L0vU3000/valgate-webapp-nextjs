"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Copy, Check, Eye, Pencil, Trash2, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * "Connect Claude" — the in-app entry point for the Valgate MCP connector.
 *
 * This is a pure product-UI surface: it explains what connecting Claude does, hands the
 * user their MCP URL to paste into Claude, and walks them through the steps. It is NOT
 * the OAuth consent screen (that is a separate, mid-OAuth surface at /oauth-consent).
 *
 * Everything shown here is honest about the LIVE server. The capability list below is
 * derived directly from the tools/resources registered on the /mcp endpoint
 * (mcp-server/register.ts + writes.ts + resources.ts). Write tools ARE always registered;
 * the service layer — not this UI — enforces the caller's org role, so we list Modify and
 * Delete plainly rather than pretending the connection is read-only.
 */

// A permission group as the user should understand it — plain language, not raw tool names.
type CapabilityGroup = {
  key: string;
  label: string;
  icon: typeof Eye;
  destructive: boolean;
  items: string[];
};

const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    key: "view",
    label: "View",
    icon: Eye,
    destructive: false,
    items: [
      "See which of your workspaces you're connected to",
      "Find and list your properties",
      "Open a property's full record — leases, tenants, payments, valuations, safety, documents",
      "See each property's completeness score",
      "See portfolio stats — occupancy, total value, this month's rent",
    ],
  },
  {
    key: "modify",
    label: "Modify",
    icon: Pencil,
    destructive: false,
    items: [
      "Create a new property",
      "Edit a property's details",
      "Log a maintenance issue",
      "Create and edit leases",
      "Add and edit tenants",
      "Record and edit rent payments",
    ],
  },
  {
    key: "delete",
    label: "Delete",
    icon: Trash2,
    destructive: true,
    items: [
      "Preview what deleting a property would remove",
      "Permanently delete a property (asks you to confirm twice first)",
      "Delete a lease, tenant, or payment — each behind a confirm step",
    ],
  },
];

// The connect steps, kept as data so the numbered list stays easy to read and edit.
const CONNECT_STEPS: string[] = [
  "In Claude, open Settings → Connectors → Add custom connector.",
  "Paste the connector URL above and continue.",
  "Sign in to Valgate and approve the access shown on the consent screen.",
];

export function ConnectClaudeSection({
  mcpUrl,
  style,
}: {
  mcpUrl: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pb-6 sm:pb-8 border-b border-[#e8eaed]"
      style={style}
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-[18px] sm:text-[24px] leading-tight text-foreground">
          Connect Claude
        </h2>
        <p className="font-sans text-[14px] leading-[20px] text-tertiary">
          Let Claude read and update your Valgate properties on your behalf, straight from a chat.
        </p>
      </div>

      <div className="col-span-1 sm:col-span-2 bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="size-[48px] rounded-[12px] bg-blue-50 flex items-center justify-center text-[#2563eb] shrink-0">
            <Sparkles className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col">
            <h3 className="font-display font-semibold text-[15px] sm:text-[18px] text-val-heading">
              AI assistant
            </h3>
            <p className="font-sans text-[14px] leading-[20px] text-tertiary">
              Ask Claude about your properties, log maintenance, and more.
            </p>
          </div>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button className="border border-[#d1d5db] rounded-[8px] px-[17px] py-[9px] font-sans font-medium text-[14px] leading-[20px] text-val-heading hover:bg-[#f5f6f7] hover:border-[#b0b8c4] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] transition-all duration-150 shrink-0 cursor-pointer">
              Set up
            </button>
          </SheetTrigger>
          <ConnectClaudeSheet mcpUrl={mcpUrl} />
        </Sheet>
      </div>
    </section>
  );
}

// The detailed setup content, shown in a right-side drawer.
function ConnectClaudeSheet({ mcpUrl }: { mcpUrl: string }) {
  return (
    <SheetContent side="right" className="w-full sm:max-w-[560px]">
      <SheetHeader>
        <SheetTitle>Connect Claude to your Valgate workspace</SheetTitle>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-7">
        <p className="font-sans text-[14px] leading-[21px] text-tertiary">
          Add Valgate as a connector in Claude and you can ask it about your portfolio, pull up
          a property&apos;s full record, or log a maintenance issue — all from a normal chat.
        </p>

        {/* What Claude can do — grouped View / Modify / Delete */}
        <div className="flex flex-col gap-4">
          <h4 className="font-display font-semibold text-[15px] text-val-heading">
            What Claude can do
          </h4>
          <div className="flex flex-col gap-3">
            {CAPABILITY_GROUPS.map((group) => (
              <CapabilityCard key={group.key} group={group} />
            ))}
          </div>
        </div>

        {/* The connector URL + copy */}
        <div className="flex flex-col gap-2">
          <h4 className="font-display font-semibold text-[15px] text-val-heading">
            Your connector URL
          </h4>
          <p className="font-sans text-[13px] leading-[18px] text-tertiary">
            Paste this into Claude when it asks for a custom connector.
          </p>
          <CopyableUrl mcpUrl={mcpUrl} />
        </div>

        {/* Step-by-step */}
        <div className="flex flex-col gap-3">
          <h4 className="font-display font-semibold text-[15px] text-val-heading">
            How to connect
          </h4>
          <ol className="flex flex-col gap-2.5">
            {CONNECT_STEPS.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#eef2f8] font-sans text-[12px] font-semibold text-val-heading">
                  {index + 1}
                </span>
                <span className="font-sans text-[14px] leading-[21px] text-foreground">{step}</span>
              </li>
            ))}
          </ol>
          <p className="font-sans text-[13px] leading-[19px] text-tertiary">
            Works in the Claude desktop app and on claude.ai. Adding a custom connector may
            require a paid Claude plan.
          </p>
        </div>

        {/* Honest expectations about the sign-in provider */}
        <div className="rounded-[10px] border border-[#d1d5db] bg-[#f5f6f7] p-4">
          <p className="font-sans text-[13px] leading-[19px] text-tertiary">
            When Claude opens the sign-in and approval step, that screen is currently hosted by
            our authentication provider and may not be fully Valgate-branded yet. That&apos;s
            expected — approving there connects Claude to your account.
          </p>
        </div>

        {/* Managing/removing the connection later.
            TODO(later phase): show a live "Claude is connected" status + a Disconnect action.
            That needs reading/revoking the user's Clerk OAuth grants, which is deferred — see
            docs/plans/mcp-connect-inapp-page-execution.md (Open question). */}
        <p className="font-sans text-[13px] leading-[19px] text-tertiary">
          To manage or remove this connection later, open Claude&apos;s Connectors settings.
        </p>
      </SheetBody>
    </SheetContent>
  );
}

function CapabilityCard({ group }: { group: CapabilityGroup }) {
  const Icon = group.icon;
  return (
    <div
      className={`rounded-[10px] border p-3.5 ${
        group.destructive ? "border-[#fecdd3] bg-[#fff1f2]" : "border-[#e8eaed] bg-white"
      }`}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Icon
          className={`w-4 h-4 ${group.destructive ? "text-[#e11d48]" : "text-slate-500"}`}
          strokeWidth={2}
        />
        <span
          className={`font-sans font-semibold text-[13px] uppercase tracking-[0.04em] ${
            group.destructive ? "text-[#9f1239]" : "text-slate-600"
          }`}
        >
          {group.label}
        </span>
        {group.destructive && (
          <span className="ml-auto inline-flex items-center gap-1 font-sans text-[11px] font-medium text-[#9f1239]">
            <AlertTriangle className="w-3 h-3" strokeWidth={2.25} />
            Destructive
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1.5">
        {group.items.map((item, index) => (
          <li
            key={index}
            className="font-sans text-[13px] leading-[19px] text-foreground pl-3.5 relative before:content-[''] before:absolute before:left-0 before:top-[8px] before:size-1 before:rounded-full before:bg-slate-400"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Read-only URL field with the one precious blue accent on its Copy button.
function CopyableUrl({ mcpUrl }: { mcpUrl: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      .writeText(mcpUrl)
      .then(() => {
        setCopied(true);
        toast.success("Connector URL copied");
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {
        toast.error("Could not copy the URL. Select it and copy manually.");
      });
  }

  return (
    <div className="flex items-stretch gap-2">
      <input
        type="text"
        readOnly
        value={mcpUrl}
        aria-label="Valgate MCP connector URL"
        onFocus={(event) => event.currentTarget.select()}
        className="flex-1 min-w-0 bg-[#f5f6f7] border border-[#d1d5db] rounded-[8px] px-[13px] py-[10px] font-mono text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white transition-all duration-150"
      />
      <button
        onClick={handleCopy}
        aria-label="Copy connector URL"
        className="flex items-center gap-1.5 bg-[#2563eb] text-white font-sans font-medium text-[14px] leading-[20px] px-4 rounded-[8px] hover:bg-blue-700 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] transition-all duration-150 shrink-0 cursor-pointer"
      >
        {copied ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
