"use client";

import { useEffect, useState } from "react";
import { ProModal } from "@/app/(pro)/pro/_components/pro-modal";
import { MethodChooser } from "./MethodChooser";
import { OnboardClientFlow } from "./OnboardClientWizard";
import { ConnectExistingClient } from "./ConnectExistingClient";

type Mode = "choose" | "new" | "connect";

type RequestRow = {
  id: string;
  ownerOrgName: string;
  requestedLevel: "view" | "full";
  status: "pending" | "approved" | "denied";
  createdAt: number;
};

export function AddClientModal({
  open,
  onOpenChange,
  initialMode,
  unassignedProperties,
  managerName,
  managerEmail,
  requests,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode: Mode;
  unassignedProperties: Array<{ id: string; name: string }>;
  managerName: string;
  managerEmail: string;
  requests: RequestRow[];
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  // Reset to the requested branch each time the modal opens.
  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <ProModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add a client"
    >
      {mode === "choose" && (
        <MethodChooser onPick={setMode} onCancel={handleClose} />
      )}
      {mode === "new" && (
        <OnboardClientFlow
          onBack={() => setMode("choose")}
          unassignedProperties={unassignedProperties}
        />
      )}
      {mode === "connect" && (
        <ConnectExistingClient
          onBack={() => setMode("choose")}
          managerName={managerName}
          managerEmail={managerEmail}
          requests={requests}
        />
      )}
    </ProModal>
  );
}
