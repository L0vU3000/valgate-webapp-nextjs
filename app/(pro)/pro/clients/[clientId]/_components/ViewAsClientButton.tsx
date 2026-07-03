import Link from "next/link";
import { Eye } from "lucide-react";

// "View as client" — links to the read-only preview route, which renders the
// owner-facing app scoped to this client's portfolio so the manager sees exactly
// what the client sees. No Clerk org switch: the manager stays in their session.
// Hidden when the client has no linked portfolio org (nothing to preview).
export function ViewAsClientButton({
  clientId,
  hasOrg,
}: {
  clientId: string;
  hasOrg: boolean;
}) {
  if (!hasOrg) {
    return null;
  }

  return (
    <Link
      href={`/pro/clients/${clientId}/as-client`}
      title="See the portfolio exactly as this client sees it"
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-[13px] font-medium text-blue-700 transition-[background-color,transform] hover:bg-blue-100 active:scale-[0.97] dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
    >
      <Eye className="h-4 w-4" />
      View as client
    </Link>
  );
}
