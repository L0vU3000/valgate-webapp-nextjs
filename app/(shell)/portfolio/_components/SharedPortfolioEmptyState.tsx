"use client";

import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";

const REQUEST = "Please add a property to our shared Valgate portfolio so I can view it.";
const CTA = "inline-flex items-center rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function SharedPortfolioEmptyState({ ownerEmail }: { ownerEmail: string | null }) {
  return (
    <EmptyState
      className="py-16"
      icon={<Building2 className="size-5" />}
      title="No properties shared yet"
      description="You have view-only access. Ask the organization owner to add the first property."
      action={ownerEmail ? (
        <a className={CTA} href={`mailto:${ownerEmail}?subject=${encodeURIComponent("Our shared Valgate portfolio")}&body=${encodeURIComponent(REQUEST)}`}>
          Ask the owner to add a property
        </a>
      ) : (
        <button className={CTA} type="button" onClick={async () => {
          try {
            await navigator.clipboard.writeText(REQUEST);
            toast.success("Request copied. Send it to your organization owner.");
          } catch {
            toast.error("Could not copy the request. Please contact your organization owner.");
          }
        }}>
          Copy a request for the owner
        </button>
      )}
    />
  );
}
