"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Mail, Check, ArrowLeft, Loader2, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useSignUp, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { clerkErrorMessage } from "../../_lib/clerk-errors";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  hint: string;
} {
  if (!password) return { score: 0, label: "", hint: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: "Weak", hint: "Add uppercase letters and numbers." };
  if (score === 2) return { score: 2, label: "Moderate", hint: "Add a symbol." };
  if (score === 3) return { score: 3, label: "Good", hint: "Almost there." };
  return { score: 4, label: "Strong", hint: "Great password!" };
}

const STRENGTH_COLORS = ["", "bg-red-400", "bg-amber-400", "bg-blue-500", "bg-green-500"];

// The two roles a new user can pick at sign-up. Stored in Clerk unsafeMetadata
// on first creation; the webhook copies it to users.is_manager in Neon.
type AccountType = "owner" | "manager";

type FieldErrors = Partial<Record<"fullName" | "email" | "password" | "confirmPassword" | "agreed", string>>;

export function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useSignUp();
  const clerk = useClerk();

  // Org invitation tickets belong on the dedicated accept flow.
  useEffect(() => {
    const ticket = searchParams.get("__clerk_ticket");
    if (!ticket) return;
    const query = searchParams.toString();
    router.replace(query ? `/accept-invitation?${query}` : "/accept-invitation");
  }, [router, searchParams]);

  const [step, setStep] = useState<"form" | "verify">("form");
  // Owner is the default — the vast majority of sign-ups are property owners.
  const [accountType, setAccountType] = useState<AccountType>("owner");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Verify step
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const strength = getPasswordStrength(password);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  function validate(): boolean {
    const e: FieldErrors = {};
    if (!fullName.trim()) e.fullName = "Please enter your name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Enter a valid email";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (confirmPassword !== password) e.confirmPassword = "Passwords don't match";
    if (!agreed) e.agreed = "Please accept the terms to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Step 1: create the Clerk sign-up and email the verification code (Future/signals API).
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const parts = fullName.trim().split(/\s+/);
      const { error } = await signUp.password({
        emailAddress: email,
        password,
        firstName: parts[0],
        lastName: parts.slice(1).join(" ") || undefined,
        legalAccepted: agreed,
        // accountType is copied to users.is_manager by the webhook when the user is created.
        unsafeMetadata: { accountType },
      });
      if (error) {
        toast.error(clerkErrorMessage(error, "Could not create your account. Please try again."));
        return;
      }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        toast.error(clerkErrorMessage(sendError, "Could not send the verification code."));
        return;
      }
      setStep("verify");
      setResendIn(45);
    } catch (err) {
      toast.error(clerkErrorMessage(err, "Could not create your account. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }

  // Step 2: verify the code, sign in, then create + activate the user's personal workspace (D2).
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    setVerifying(true);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) {
        toast.error(clerkErrorMessage(error, "That code didn't work. Please try again."));
        return;
      }
      if (signUp.status !== "complete") {
        toast.error("Verification isn't complete yet. Please try again.");
        return;
      }

      // Managers need a personal home org (their Pro cockpit workspace). Create and
      // activate it before finalize() so the session is not stuck on choose-organization.
      if (accountType === "manager") {
        try {
          const firstName = fullName.trim().split(/\s+/)[0] || "Manager";
          const org = await clerk.createOrganization({ name: `${firstName}'s Workspace` });
          await clerk.setActive({ organization: org.id });
        } catch (err) {
          toast.error(clerkErrorMessage(err, "Could not create your manager workspace. Please try again."));
          return;
        }
      }

      // Clerk's "Create first organization automatically" setting creates + activates the
      // owner's org during sign-up for non-manager accounts.
      // navigate callback is required — Clerk needs it to handle Safari ITP cookie redirects.
      // /launch reads is_manager and redirects each account type to the right landing page.
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/launch");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    } catch (err) {
      toast.error(clerkErrorMessage(err, "Verification failed. Please try again."));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0) return;
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        toast.error(clerkErrorMessage(error, "Could not resend the code."));
        return;
      }
      setResendIn(45);
      toast.success("We sent a new code.");
    } catch (err) {
      toast.error(clerkErrorMessage(err, "Could not resend the code."));
    }
  }

  return (
    <div className="flex flex-col min-h-dvh w-full font-sans">

      {/* ── Main - Auth Shell Wrapper ── */}
      <div className="flex flex-1">

        {/* Section - Brand Panel (Left/Top) */}
        <AuthBrandPanel />

        {/* Right content area — switches between form and verify */}
        {step === "form" ? (
          <div className="flex flex-1 items-center justify-center bg-surface-base px-4 py-6 sm:px-6 sm:py-12 lg:px-40 overflow-y-auto">
            <div className="auth-animate w-full max-w-[448px]">

              {/* Mobile brand anchor — hidden on lg+ since AuthBrandPanel is visible */}
              <div
                className="lg:hidden mb-8 flex items-center gap-2"
                data-auth-item
                style={{ "--auth-delay": "0ms" } as React.CSSProperties}
              >
                <Image src="/valgate-icon.svg" width={28} height={28} alt="" />
                <span className="text-xl font-extrabold font-display tracking-[-0.4px]">Valgate</span>
              </div>

              <div
                className="flex flex-col gap-2 mb-10"
                data-auth-item
                style={{ "--auth-delay": "0ms" } as React.CSSProperties}
              >
                <h2 className="text-[30px] font-semibold text-foreground font-display leading-[36px]">
                  Create your account
                </h2>
                <p className="text-base text-[#434655]">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[--val-primary-dark] hover:underline transition-colors">
                    Log in
                  </Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

                {/* ── Account type picker — owner (default) or manager ── */}
                <div
                  className="flex flex-col gap-2"
                  data-auth-item
                  style={{ "--auth-delay": "60ms" } as React.CSSProperties}
                >
                  <Label className="text-sm font-medium text-text-secondary">
                    I am a…
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Owner card */}
                    <button
                      type="button"
                      onClick={() => setAccountType("owner")}
                      aria-pressed={accountType === "owner"}
                      className={`flex flex-col items-start gap-2 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--val-primary-dark] ${
                        accountType === "owner"
                          ? "border-[--val-primary-dark] bg-[#e4efff]"
                          : "border-[#c3c6d7] bg-white hover:border-[#a5b0cc]"
                      }`}
                    >
                      <Building2
                        className={`size-5 ${accountType === "owner" ? "text-[--val-primary-dark]" : "text-[#737686]"}`}
                      />
                      <div>
                        <p className={`text-sm font-semibold leading-tight ${accountType === "owner" ? "text-[--val-primary-dark]" : "text-foreground"}`}>
                          Property Owner
                        </p>
                        <p className="text-[11px] leading-[15px] text-[#737686] mt-0.5">
                          I own properties
                        </p>
                      </div>
                    </button>

                    {/* Manager card */}
                    <button
                      type="button"
                      onClick={() => setAccountType("manager")}
                      aria-pressed={accountType === "manager"}
                      className={`flex flex-col items-start gap-2 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--val-primary-dark] ${
                        accountType === "manager"
                          ? "border-[--val-primary-dark] bg-[#e4efff]"
                          : "border-[#c3c6d7] bg-white hover:border-[#a5b0cc]"
                      }`}
                    >
                      <Briefcase
                        className={`size-5 ${accountType === "manager" ? "text-[--val-primary-dark]" : "text-[#737686]"}`}
                      />
                      <div>
                        <p className={`text-sm font-semibold leading-tight ${accountType === "manager" ? "text-[--val-primary-dark]" : "text-foreground"}`}>
                          Portfolio Manager
                        </p>
                        <p className="text-[11px] leading-[15px] text-[#737686] mt-0.5">
                          I manage for others
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div
                  className="flex flex-col gap-2"
                  data-auth-item
                  style={{ "--auth-delay": "80ms" } as React.CSSProperties}
                >
                  <Label htmlFor="fullName" className="text-sm font-medium text-text-secondary">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    autoComplete="name"
                    aria-required="true"
                    aria-invalid={!!errors.fullName}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
                </div>

                <div
                  className="flex flex-col gap-2"
                  data-auth-item
                  style={{ "--auth-delay": "130ms" } as React.CSSProperties}
                >
                  <Label htmlFor="email" className="text-sm font-medium text-text-secondary">
                    Work Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div
                  className="flex flex-col gap-2"
                  data-auth-item
                  style={{ "--auth-delay": "180ms" } as React.CSSProperties}
                >
                  <Label htmlFor="password" className="text-sm font-medium text-text-secondary">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-required="true"
                      aria-invalid={!!errors.password}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-foreground transition-colors duration-150 focus-visible:outline-none rounded"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <span className="relative flex size-4 items-center justify-center">
                        <Eye
                          className="absolute size-4 transition-all duration-150 ease-out"
                          style={{
                            opacity: showPassword ? 0 : 1,
                            transform: showPassword ? "scale(0.7) rotate(-10deg)" : "scale(1) rotate(0deg)",
                          }}
                        />
                        <EyeOff
                          className="absolute size-4 transition-all duration-150 ease-out"
                          style={{
                            opacity: showPassword ? 1 : 0,
                            transform: showPassword ? "scale(1) rotate(0deg)" : "scale(0.7) rotate(10deg)",
                          }}
                        />
                      </span>
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                          password && i < strength.score
                            ? STRENGTH_COLORS[strength.score]
                            : "bg-surface-tint"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-tertiary leading-[18px] transition-all duration-200">
                    {errors.password
                      ? errors.password
                      : password
                        ? `Strength: ${strength.label}. ${strength.hint}`
                        : "Strength: —"}
                  </p>
                </div>

                <div
                  className="flex flex-col gap-2"
                  data-auth-item
                  style={{ "--auth-delay": "220ms" } as React.CSSProperties}
                >
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-text-secondary">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!errors.confirmPassword}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>

                <label
                  className="flex items-start gap-3 py-2 cursor-pointer select-none rounded-lg px-2 -mx-2 hover:bg-surface-tint transition-colors duration-150"
                  data-auth-item
                  style={{ "--auth-delay": "260ms" } as React.CSSProperties}
                >
                  <div className="flex items-center h-5 shrink-0">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="size-4 rounded border-border-default accent-interactive-primary cursor-pointer"
                    />
                  </div>
                  <span className="text-xs text-[#434655] leading-[18px]">
                    I agree to the{" "}
                    <a href="#" className="text-[--val-primary-dark] hover:underline transition-colors">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-[--val-primary-dark] hover:underline transition-colors">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
                {errors.agreed && <p className="-mt-2 text-xs text-red-500">{errors.agreed}</p>}

                {/* Clerk Smart CAPTCHA (bot sign-up protection) renders into this element.
                    Required for custom/headless sign-up flows — without it Clerk falls back to
                    Invisible CAPTCHA, which can silently block the sign-up (no verification email). */}
                <div id="clerk-captcha" />

                <div
                  data-auth-item
                  style={{ "--auth-delay": "300ms" } as React.CSSProperties}
                >
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
                        Create account
                        <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Section - Verify Content Area (Right) — enter the 6-digit email code */
          <div className="flex flex-1 items-center justify-center bg-val-bg-tint px-4 py-6 sm:px-6 sm:py-12 overflow-y-auto">
            <div className="auth-animate flex flex-col gap-8 w-full max-w-[480px]">

              {/* Verify Card */}
              <form
                onSubmit={handleVerify}
                className="bg-white border border-[#c3c6d7] rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-12 py-12 flex flex-col items-center"
                data-auth-item
                style={{ "--auth-delay": "0ms" } as React.CSSProperties}
              >

                {/* Envelope Icon Container */}
                <div className="relative size-20 mb-8 shrink-0">
                  <div className="auth-success-icon size-20 rounded-full bg-[#e4efff] flex items-center justify-center">
                    <Mail className="size-8 text-[--val-primary-dark]" />
                  </div>
                  <div className="auth-success-badge absolute -bottom-1 -right-1 size-8 rounded-full bg-[#10b981] border-4 border-white flex items-center justify-center">
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </div>
                </div>

                {/* Heading */}
                <h2 className="text-[30px] font-bold text-val-heading font-display leading-[36px] text-center mb-4">
                  Verify your email
                </h2>

                {/* Description */}
                <div className="text-center text-base leading-[26px] mb-8">
                  <p className="text-[#434655]">Enter the 6-digit code we sent to</p>
                  <p>
                    <span className="font-semibold text-val-heading">
                      {email || "your email"}
                    </span>
                  </p>
                </div>

                {/* OTP input */}
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  containerClassName="mb-8"
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <Button
                  type="submit"
                  className="auth-submit-btn w-full h-12 text-base font-semibold rounded-md flex items-center justify-center gap-2 mb-6"
                  disabled={verifying || code.length < 6}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Verifying…
                    </>
                  ) : (
                    "Verify & continue"
                  )}
                </Button>

                {/* Actions */}
                <div className="w-full flex flex-col gap-4">
                  <div className="w-full bg-val-bg-tint rounded-lg px-6 py-4 flex items-center justify-center gap-3">
                    <span className="text-sm font-medium text-[#434655]">
                      Didn&apos;t receive it?
                    </span>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendIn > 0}
                      className="text-sm font-semibold text-[--val-primary-dark] hover:underline transition-colors duration-150 disabled:text-[#737686] disabled:no-underline disabled:cursor-not-allowed"
                    >
                      Resend the email
                    </button>
                    {resendIn > 0 && (
                      <div className="bg-[#d8e3f4] rounded px-2 py-0.5">
                        <span className="text-xs text-[#737686] font-mono">
                          0:{String(resendIn).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="w-full h-px bg-[#c3c6d7]" />

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => { setStep("form"); setCode(""); }}
                      className="auth-back-btn group flex items-center gap-2 text-sm font-medium text-[#434655]"
                    >
                      <ArrowLeft className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
                      Wrong email? Go back
                    </button>
                  </div>
                </div>
              </form>

              {/* Assistance Note */}
              <p
                className="text-sm text-[#737686] text-center"
                data-auth-item
                style={{ "--auth-delay": "100ms" } as React.CSSProperties}
              >
                Having trouble? Contact our{" "}
                <a href="#" className="text-[--val-primary-dark] hover:underline transition-colors">
                  Support Team
                </a>{" "}
                for assistance.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Simple Footer (Legal only for auth screens) */}
      <AuthFooter />
    </div>
  );
}
