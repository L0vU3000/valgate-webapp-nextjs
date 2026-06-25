import Link from "next/link";
import { Building2 } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { OpenAccountButton } from "@/app/(pro)/pro/_components/OpenAccountButton";
import { proSecondaryButtonClass } from "@/app/(pro)/pro/_components/pro-modal";
import type { ManagedAccount, MyAccessRequest } from "@/lib/services/managers";

// Returns up to 2 initials from an organisation name — used for the avatar circle.
function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}

// Formats the lastActivityAt date as an absolute "Mon DD" or "Mon DD, YYYY" string.
// Absolute formatting avoids SSR/client hydration mismatches that relative time ("3 days ago") causes.
// Returns "Never active" when no date is recorded on the membership.
function formatLastActive(date: Date | null): string {
  if (!date) return "Never active";

  const d = new Date(date); // handles both Date objects and ISO strings (post-RSC serialisation)
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  }).format(d);
}

// Neutral badge for access level — no colour accent, no border-left stripe, borders only.
function LevelBadge({ level }: { level: "view" | "full" }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      {level === "full" ? "Full" : "View"}
    </span>
  );
}

// The managed-accounts rollup section rendered at the top of /pro/dashboard for managers.
//
// Anatomy:
//   Header: "Managed accounts (N)" + secondary "Add account" link
//   Body: one bordered row per approved account (avatar · name + meta · level badge · Open button)
//   Footer: muted pending sub-list (when > 0 pending requests)
//   Empty state: teaching copy + Add account link (when accounts.length === 0)
//
// Design rules (from .impeccable.md Professional section):
//   - Borders over shadows (1px slate-200, no box-shadow)
//   - No side-stripe accent borders on list rows (background tint only for pending footer)
//   - Neutral badges: border only, slate text
//   - "Add account" and "Open" use proSecondaryButtonClass — never blue
export function ManagedAccountsSection({
  accounts,
  pending,
}: {
  accounts: ManagedAccount[];
  pending: MyAccessRequest[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-[13.5px] font-semibold text-slate-900">
          Managed accounts
          {accounts.length > 0 && (
            <span className="ml-1.5 font-normal text-slate-400">
              ({accounts.length})
            </span>
          )}
        </h2>
        <Link href="/pro/add-account" className={proSecondaryButtonClass}>
          + Add account
        </Link>
      </div>

      {/* ── Account rows ───────────────────────────────────────────── */}
      {accounts.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {accounts.map((account) => (
            <li
              key={account.orgId}
              className="flex items-center gap-4 px-5 py-3.5"
            >
              {/* Avatar — initials in a slate circle */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11.5px] font-semibold text-slate-600">
                {initials(account.name)}
              </div>

              {/* Name + last-active / property count */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-slate-800">
                  {account.name}
                </p>
                <p className="text-[12px] text-slate-400" suppressHydrationWarning>
                  {/* suppressHydrationWarning: formatLastActive calls new Date() which can
                      differ by milliseconds between SSR and client hydration. */}
                  Last active {formatLastActive(account.lastActivityAt)}
                  {" · "}
                  {account.propertyCount === 1
                    ? "1 property"
                    : `${account.propertyCount} properties`}
                </p>
              </div>

              {/* Access level badge — neutral, no colour accent */}
              <LevelBadge level={account.level} />

              {/* Open — setActive into this org and navigate to the owner portfolio */}
              <OpenAccountButton clerkOrgId={account.clerkOrgId} />
            </li>
          ))}
        </ul>
      ) : (
        /* ── Empty state ─────────────────────────────────────────── */
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Building2
            className="h-8 w-8 text-slate-300"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="text-[13.5px] font-medium text-slate-600">
            No managed accounts yet
          </p>
          <p className="max-w-xs text-[12.5px] leading-relaxed text-slate-400">
            Add an owner account using their invite code to start managing their
            portfolio.
          </p>
          <Link
            href="/pro/add-account"
            className={cn("mt-2", proSecondaryButtonClass)}
          >
            + Add account
          </Link>
        </div>
      )}

      {/* ── Pending requests sub-list ───────────────────────────────
          Shown below accounts (or below the empty state) when the manager
          has outstanding requests that the owner hasn't decided yet.       */}
      {pending.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Pending requests ({pending.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {pending.map((req) => (
              <li
                key={req.id}
                className="flex items-center gap-2 text-[12.5px] text-slate-500"
              >
                <span
                  className="h-1 w-1 shrink-0 rounded-full bg-slate-300"
                  aria-hidden
                />
                <span className="font-medium text-slate-600">
                  {req.ownerOrgName}
                </span>
                <span className="text-slate-300">—</span>
                <span>
                  {req.requestedLevel === "full" ? "Full" : "View"} access
                  requested
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
