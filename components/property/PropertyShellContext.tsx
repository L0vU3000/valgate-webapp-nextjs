"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Property, PropertyListItem } from "@/lib/data/types/property";
import type { ProgressDetails } from "@/lib/data/types/progress";
import { formatCurrency } from "@/lib/format";

// This provider wraps EVERY property segment (overview, financials, rental, …), so anything it
// statically imports is downloaded on all of them. The progress modal and the profile-edit
// wizard are both closed on load, so we load them lazily (client-only) — their code moves out
// of every segment's initial bundle and into chunks fetched after hydration. No loading
// fallback: both render nothing until opened.
const ProgressModal = dynamic(
  () => import("@/components/portfolio/ProgressModal").then((m) => m.ProgressModal),
  { ssr: false },
);
const PropertyProfileWizard = dynamic(
  () => import("@/components/property/PropertyProfileWizard").then((m) => m.PropertyProfileWizard),
  { ssr: false },
);

type PropertyShellContextValue = {
  progress: number;
  progressDetails: ProgressDetails;
  openProgressModal: () => void;
  openPropertyWizard: () => void;
};

const PropertyShellContext = createContext<PropertyShellContextValue | null>(null);

export function usePropertyShell(): PropertyShellContextValue | null {
  return useContext(PropertyShellContext);
}

function toListItem(property: Property, progressDetails: ProgressDetails): PropertyListItem {
  return {
    id: property.id,
    name: property.name,
    code: property.code,
    type: property.type,
    province: property.province,
    status: property.status,
    totalArea: property.totalArea ?? "",
    title: property.title ?? "",
    buy: property.buyNumeric ? formatCurrency(property.buyNumeric) : "—",
    buyNumeric: property.buyNumeric,
    isArchived: property.isArchived,
    progress: progressDetails.score,
    progressDetails,
  };
}

export function PropertyShellProvider({
  property,
  progressDetails,
  children,
}: {
  property: Property;
  progressDetails: ProgressDetails;
  children: React.ReactNode;
}) {
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [profileWizardOpen, setProfileWizardOpen] = useState(false);
  const listItem = useMemo(
    () => toListItem(property, progressDetails),
    [property, progressDetails],
  );

  const openProgressModal = useCallback(() => setProgressModalOpen(true), []);
  const openPropertyWizard = useCallback(() => setProfileWizardOpen(true), []);

  const value = useMemo<PropertyShellContextValue>(
    () => ({
      progress: progressDetails.score,
      progressDetails,
      openProgressModal,
      openPropertyWizard,
    }),
    [progressDetails, openProgressModal, openPropertyWizard],
  );

  return (
    <PropertyShellContext.Provider value={value}>
      {children}
      <ProgressModal
        property={progressModalOpen ? listItem : null}
        onClose={() => setProgressModalOpen(false)}
      />
      <PropertyProfileWizard
        property={property}
        open={profileWizardOpen}
        onOpenChange={setProfileWizardOpen}
      />
    </PropertyShellContext.Provider>
  );
}
