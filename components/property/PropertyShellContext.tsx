"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Property, PropertyListItem } from "@/lib/data/types/property";
import type { ProgressDetails } from "@/lib/data/types/progress";
import { ProgressModal } from "@/components/portfolio/ProgressModal";
import { PropertyProfileWizard } from "@/components/property/PropertyProfileWizard";
import { formatCurrency } from "@/lib/format";

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
