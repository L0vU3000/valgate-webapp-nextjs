"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAuth,
  useSession,
  useClerk,
  useOrganizationList,
  TaskResetPassword,
  TaskSetupMFA,
} from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { selectBestOrganization } from "../../../_lib/org-utils";
import { resolveRedirectUrl, resolveLoginTaskAction } from "../../../_lib/resolve-redirect-url";

export function LoginTasksPage() {
  const { isLoaded, session } = useSession();
  const { isLoaded: isAuthLoaded, orgId } = useAuth();
  const { setActive } = useClerk();
  const { isLoaded: isOrgListLoaded, userMemberships } = useOrganizationList({ userMemberships: true });
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const redirectUrl = resolveRedirectUrl(searchParams.get("redirect_url"), currentOrigin);
  const [resolving, setResolving] = useState(false);
  const [isOrgUnavailable, setIsOrgUnavailable] = useState(false);
  const attemptedDefaultOrgRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isAuthLoaded || !isOrgListLoaded || userMemberships?.isLoading || userMemberships?.data === undefined) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    const action = resolveLoginTaskAction({
      currentTaskKey: session.currentTask?.key ?? null,
      activeOrganizationId: orgId ?? null,
    });

    if (action === "redirect") {
      router.replace(redirectUrl);
      return;
    }

    if (action === "render-task" || attemptedDefaultOrgRef.current) {
      return;
    }

    attemptedDefaultOrgRef.current = true;
    let cancelled = false;

    async function activateDefaultOrg() {
      setResolving(true);
      try {
        const bestOrgId = selectBestOrganization(userMemberships?.data);
        if (cancelled) return;

        if (!bestOrgId) {
          setIsOrgUnavailable(true);
          return;
        }

        await setActive({ organization: bestOrgId });
        if (!cancelled) router.replace(redirectUrl);
      } catch {
        if (!cancelled) {
          toast.error("We could not open your workspace. Please try signing in again.");
          setIsOrgUnavailable(true);
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    }

    void activateDefaultOrg();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isAuthLoaded, isOrgListLoaded, session, orgId, router, redirectUrl, setActive, userMemberships]);

  if (isOrgUnavailable) {
    return (
      <div className="flex min-h-dvh w-full font-sans">
        <div className="flex flex-1">
          <AuthBrandPanel />
          <div className="flex flex-1 items-center justify-center bg-surface-base px-4 py-6 sm:px-6 sm:py-12 lg:px-24 overflow-y-auto">
            <div className="w-full max-w-[440px] text-center space-y-4">
              <h1 className="text-2xl font-semibold text-foreground">Workspace unavailable</h1>
              <p className="text-muted-foreground">
                We couldn&apos;t find an active workspace associated with your account.
                Please contact your administrator for access.
              </p>
              <div className="pt-4">
                {/* Sign out removed to prevent login loop */}
              </div>
            </div>
          </div>
        </div>
        <AuthFooter />
      </div>
    );
  }

  if (!isLoaded || !session?.currentTask || resolving) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-page">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  const taskKey = session.currentTask.key;

  // choose-organization is handled above — never show a manual picker.
  if (taskKey === "choose-organization") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-page">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh w-full font-sans">
      <div className="flex flex-1">
        <AuthBrandPanel />

        <div className="flex flex-1 items-center justify-center bg-surface-base px-4 py-6 sm:px-6 sm:py-12 lg:px-24 overflow-y-auto">
          <div className="w-full max-w-[440px]">
            {taskKey === "reset-password" && (
              <TaskResetPassword redirectUrlComplete={redirectUrl} />
            )}
            {taskKey === "setup-mfa" && (
              <TaskSetupMFA redirectUrlComplete={redirectUrl} />
            )}
          </div>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}
