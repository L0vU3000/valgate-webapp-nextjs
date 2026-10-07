"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getLocationWizardBoundaryAction } from "@/app/actions/properties";
import { PropertyBoundaryCard } from "@/app/(shell)/property/[id]/_components/PropertyBoundaryCard";

/**
 * Wizard step 4 — the land boundary.
 *
 * This is the step verification used to be. Verification is gone, so the thing that actually proves
 * the location is the boundary itself: a KMZ upload, or a hand-drawn ring on the Location tab.
 *
 * The KMZ control is the SAME `PropertyBoundaryCard` the Location page uses, not a second one — it
 * owns its preview/commit flow and POSTs to the same routes, and refreshes the router when it lands.
 * Wrapping it here means there is one upload implementation, not two that drift.
 *
 * The step has no `fields`, so the wizard's step validation is a no-op for it and "Continue" is not
 * the way forward — the user attaches a boundary (or not) and closes. That is deliberate: a boundary
 * is optional, and gating the wizard on it would trap anyone whose parcel has no KMZ.
 */
export function BoundaryStep({
  propertyId,
  propertyName,
}: {
  propertyId: string;
  propertyName: string;
}) {
  const [props, setProps] = useState<
    { hasBoundary: boolean; declaredM2: number; measuredM2: number | null } | null
  >(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getLocationWizardBoundaryAction(propertyId)
      .then((r) => {
        if (!live) return;
        if (r.ok) setProps(r.data);
        else setFailed(true);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [propertyId]);

  if (failed) {
    return (
      <p className="text-[13px] text-slate-500">
        Couldn&apos;t load the boundary for this property. Close this window and try again.
      </p>
    );
  }

  if (!props) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-slate-500">
        <Loader2 className="size-4 animate-spin" />
        Loading boundary…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-500">
        Attach the land boundary, or draw it by hand on the Location tab. This is what pins the
        property to its exact parcel.
      </p>
      <PropertyBoundaryCard
        propertyId={propertyId}
        propertyName={propertyName}
        hasBoundary={props.hasBoundary}
        declaredM2={props.declaredM2}
        measuredM2={props.measuredM2}
      />
    </div>
  );
}
