"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useSession,
  useClerk,
  TaskResetPassword,
  TaskSetupMFA,
} from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { resolveDefaultHomeOrgAction } from "../../../actions";

const DEFAULT_REDIRECT = "/launch";

function resolveRedirectUrl(raw: string | null): string {
  if (!raw) return DEFAULT_REDIRECT;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return DEFAULT_REDIRECT;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return raw.startsWith("/") ? raw : DEFAULT_REDIRECT;
  }
}

export function LoginTasksPage() {
  const { isLoaded, session } = useSession();
  const { setActive } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = resolveRedirectUrl(searchParams.get("redirect_url"));
  const [resolving, setResolving] = useState(false);
  const attemptedDefaultOrgRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!session.currentTask) {
      router.replace(redirectUrl);
      return;
    }

    if (session.currentTask.key !== "choose-organization" || attemptedDefaultOrgRef.current) {
      return;
    }

    attemptedDefaultOrgRef.current = true;
    let cancelled = false;

    async function activateDefaultOrg() {
      setResolving(true);
      try {
        const { clerkOrgId } = await resolveDefaultHomeOrgAction();
        if (cancelled) return;

        if (!clerkOrgId) {
          toast.error("We could not open your workspace. Please try signing in again.");
          router.replace("/login");
          return;
        }

        await setActive({ organization: clerkOrgId });
        if (!cancelled) router.replace(redirectUrl);
      } catch {
        if (!cancelled) {
          toast.error("We could not open your workspace. Please try signing in again.");
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    }

    void activateDefaultOrg();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, session, router, redirectUrl, setActive]);

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
