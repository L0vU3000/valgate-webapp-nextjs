"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOrganization, useSignIn, useSignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { clerkErrorMessage } from "../../_lib/clerk-errors";
import { getInviteePrefillNameAction } from "../../actions";

type FieldErrors = Partial<Record<"fullName" | "password" | "confirmPassword" | "agreed", string>>;

function getPasswordStrength(password: string): {
  score: number;
  label: string;
} {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: "Weak" };
  if (score === 2) return { score: 2, label: "Moderate" };
  if (score === 3) return { score: 3, label: "Good" };
  return { score: 4, label: "Strong" };
}

const STRENGTH_COLORS = ["", "bg-red-400", "bg-amber-400", "bg-blue-500", "bg-green-500"];

async function finalizeSession(
  auth: NonNullable<ReturnType<typeof useSignIn>["signIn"]> | NonNullable<ReturnType<typeof useSignUp>["signUp"]>,
  router: ReturnType<typeof useRouter>,
) {
  await auth.finalize({
    navigate: ({ decorateUrl }) => {
      const url = decorateUrl("/launch");
      if (url.startsWith("http")) {
        window.location.href = url;
      } else {
        router.push(url);
      }
    },
  });
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { organization } = useOrganization();

  const [token, setToken] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [paramsReady, setParamsReady] = useState(false);

  const [fullName, setFullName] = useState("");
  const [inviteeName, setInviteeName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSigningIn, setAutoSigningIn] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const strength = getPasswordStrength(password);

  useEffect(() => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : searchParams;
    setToken(params.get("__clerk_ticket"));
    setAccountStatus(params.get("__clerk_status"));
    setParamsReady(true);
  }, [searchParams]);

  // Pre-fill "Full name" with the name the manager already typed for this invitee
  // (Step 2 of the onboarding wizard), if any — still editable, just saves a retype.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getInviteePrefillNameAction(token).then(({ name }) => {
      if (cancelled || !name) return;
      setInviteeName(name);
      setFullName((current) => current || name);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Existing user with an active session — send them to the portfolio launcher.
  useEffect(() => {
    if (accountStatus === "complete" || organization) {
      router.replace("/launch");
    }
  }, [accountStatus, organization, router]);

  // Existing user who needs to sign in with the invitation ticket.
  useEffect(() => {
    if (!token || accountStatus !== "sign_in" || !signIn || organization) {
      return;
    }

    let cancelled = false;

    async function signInWithTicket() {
      setAutoSigningIn(true);
      try {
        const { error } = await signIn.ticket({ ticket: token! });
        if (error) {
          toast.error(clerkErrorMessage(error, "Could not accept this invitation."));
          return;
        }
        if (signIn.status === "complete") {
          await finalizeSession(signIn, router);
        } else {
          toast.error("Sign-in could not be completed. Please try again.");
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(clerkErrorMessage(err, "Could not accept this invitation."));
        }
      } finally {
        if (!cancelled) setAutoSigningIn(false);
      }
    }

    void signInWithTicket();
    return () => {
      cancelled = true;
    };
  }, [token, accountStatus, signIn, organization, router]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (!fullName.trim()) nextErrors.fullName = "Please enter your name";
    if (password.length < 8) nextErrors.password = "Password must be at least 8 characters";
    if (confirmPassword !== password) nextErrors.confirmPassword = "Passwords don't match";
    if (!agreed) nextErrors.agreed = "Please accept the terms to continue";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !signUp) return;
    if (!validate()) return;

    setIsLoading(true);
    try {
      const parts = fullName.trim().split(/\s+/);
      const { error: ticketError } = await signUp.ticket({
        ticket: token,
        firstName: parts[0],
        lastName: parts.slice(1).join(" ") || undefined,
        legalAccepted: agreed,
        unsafeMetadata: { accountType: "owner" },
      });

      if (ticketError) {
        toast.error(clerkErrorMessage(ticketError, "Could not accept this invitation."));
        return;
      }

      const { error: passwordError } = await signUp.password({ password });
      if (passwordError) {
        toast.error(clerkErrorMessage(passwordError, "Could not set your password."));
        return;
      }

      if (signUp.status === "complete") {
        await finalizeSession(signUp, router);
      } else {
        toast.error("Account setup could not be completed. Please try again.");
      }
    } catch (err) {
      toast.error(clerkErrorMessage(err, "Could not create your account."));
    } finally {
      setIsLoading(false);
    }
  }

  if (!paramsReady) {
    return (
      <InvitationShell>
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[--val-primary-dark]" aria-hidden />
        </div>
      </InvitationShell>
    );
  }

  if (!token) {
    return (
      <InvitationShell>
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-[30px] font-semibold text-foreground font-display leading-[36px]">
            Invitation link invalid
          </h2>
          <p className="text-base text-[#434655]">
            This link is missing its invitation token. Ask your manager to resend the invitation,
            then open the new email link directly.
          </p>
          <p className="text-[12px] text-slate-500">
            If this keeps happening, confirm your Clerk dashboard allows redirect URL{" "}
            <code className="rounded bg-slate-100 px-1">/accept-invitation</code> and that{" "}
            <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_APP_URL</code> matches the
            site you are visiting.
          </p>
          <Link
            href="/login"
            className="text-[--val-primary-dark] hover:underline transition-colors text-sm font-medium"
          >
            Go to login
          </Link>
        </div>
      </InvitationShell>
    );
  }

  if (accountStatus === "sign_in") {
    return (
      <InvitationShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-8 animate-spin text-[--val-primary-dark]" aria-hidden />
          <h2 className="text-[30px] font-semibold text-foreground font-display leading-[36px]">
            Accepting your invitation…
          </h2>
          <p className="text-base text-[#434655]">
            {autoSigningIn
              ? "Signing you in and opening your portfolio."
              : "Preparing your portfolio access."}
          </p>
        </div>
      </InvitationShell>
    );
  }

  if (accountStatus === "complete") {
    return (
      <InvitationShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-8 animate-spin text-[--val-primary-dark]" aria-hidden />
          <p className="text-base text-[#434655]">Opening your portfolio…</p>
        </div>
      </InvitationShell>
    );
  }

  return (
    <InvitationShell>
      <div className="flex flex-col gap-2 mb-10">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-[#e4efff] px-3 py-1 text-[11.5px] font-medium text-[--val-primary-dark]">
          <Building2 className="size-3.5" />
          Portfolio invitation
        </div>
        <h2 className="text-[30px] font-semibold text-foreground font-display leading-[36px]">
          {inviteeName ? `Welcome, ${inviteeName.trim()}` : "Join your portfolio"}
        </h2>
        <p className="text-base text-[#434655]">
          Your property manager invited you to Valgate. Create your account to view and manage your properties.
        </p>
      </div>

      <form onSubmit={handleSignUp} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-fullName" className="text-sm font-medium text-text-secondary">
            Full name
          </Label>
          <Input
            id="invite-fullName"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-11"
          />
          {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-password" className="text-sm font-medium text-text-secondary">
            Password
          </Label>
          <div className="relative">
            <Input
              id="invite-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737686]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {password && (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full ${
                      level <= strength.score ? STRENGTH_COLORS[strength.score] : "bg-[#e5e7ef]"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-[#737686]">{strength.label}</span>
            </div>
          )}
          {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-confirmPassword" className="text-sm font-medium text-text-secondary">
            Confirm password
          </Label>
          <Input
            id="invite-confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Repeat your password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-11"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        <label className="flex items-start gap-3 py-2 cursor-pointer select-none">
          <div className="flex items-center h-5 shrink-0">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="size-4 rounded border-border-default accent-interactive-primary cursor-pointer"
            />
          </div>
          <span className="text-xs text-[#434655] leading-[18px]">
            I agree to the Terms of Service and Privacy Policy.
          </span>
        </label>
        {errors.agreed && <p className="-mt-2 text-xs text-red-500">{errors.agreed}</p>}

        <div id="clerk-captcha" />

        <Button
          type="submit"
          className="auth-submit-btn group w-full h-12 text-base font-semibold rounded-md flex items-center justify-center gap-2 shadow-[0px_1px_2px_0px_rgba(0,74,198,0.2)]"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Creating account…
            </>
          ) : (
            <>
              Accept invitation
              <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>
    </InvitationShell>
  );
}

function InvitationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh w-full font-sans">
      <div className="flex flex-1">
        <AuthBrandPanel />
        <div className="flex flex-1 items-center justify-center bg-surface-base px-4 py-6 sm:px-6 sm:py-12 lg:px-40 overflow-y-auto">
          <div className="auth-animate w-full max-w-[448px]">
            <div className="lg:hidden mb-8 flex items-center gap-2">
              <Image src="/valgate-icon.svg" width={28} height={28} alt="" />
              <span className="text-xl font-extrabold font-display tracking-[-0.4px]">Valgate</span>
            </div>
            {children}
          </div>
        </div>
      </div>
      <AuthFooter />
    </div>
  );
}

export function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <InvitationShell>
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-[--val-primary-dark]" aria-hidden />
          </div>
        </InvitationShell>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
