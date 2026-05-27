"use client";

import { Toaster } from "sonner";
import { ProAppHeader } from "./ProAppHeader";
import { WorkspaceTabBar } from "./WorkspaceTabBar";
import { ManagerSidebar } from "./ManagerSidebar";
import { WorkspaceTabProvider } from "./WorkspaceTabProvider";

export function ManagerProShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceTabProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-page font-sans">
        <ProAppHeader />
        <WorkspaceTabBar />
        <div className="flex min-h-0 flex-1">
          <ManagerSidebar />
          <div className="min-w-0 flex-1 overflow-hidden bg-surface-base">
            {children}
          </div>
        </div>
        <Toaster position="bottom-right" richColors />
      </div>
    </WorkspaceTabProvider>
  );
}
