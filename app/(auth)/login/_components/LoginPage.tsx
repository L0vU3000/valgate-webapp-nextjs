"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, Mail, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSignIn } from "@clerk/nextjs";
import { clerkErrorMessage } from "../../_lib/clerk-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthFooter } from "@/components/auth/AuthFooter";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean(),
});
type LoginValues = z.infer<typeof loginSchema>;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// D3: Google sign-in is styled but not yet configured in Clerk — hidden until wired.
const SHOW_GOOGLE = false;

async function finalize(signIn: ReturnType<typeof useSignIn>["signIn"], router: ReturnType<typeof useRouter>) {
  await signIn!.finalize({
    navigate: ({ decorateUrl }) => {
      const url = decorateUrl("/");
      if (url.startsWith("http")) {
        window.location.href = url;
      } else {
        router.push(url);
      }
    },
  });
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"password" | "verify">("password");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const router = useRouter();
  const { signIn } = useSignIn();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
    mode: "onBlur",
  });

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Step 1: password auth
  async function onSubmit(values: LoginValues) {
    try {
      const { error } = await signIn!.password({ emailAddress: values.email, password: values.password });
      if (error) {
        toast.error(clerkErrorMessage(error, "Invalid email or password."));
        return;
      }

      if (signIn!.status === "complete") {
        await finalize(signIn, router);
      } else if (signIn!.status === "needs_client_trust") {
        // Clerk doesn't recognise this device — send a verification code to the email.
        const { error: sendError } = await signIn!.mfa.sendEmailCode();
        if (sendError) {
          toast.error(clerkErrorMessage(sendError, "Could not send the verification code."));
          return;
        }
        setSubmittedEmail(values.email);
        setStep("verify");
        setResendIn(45);
      } else if (signIn!.status === "needs_second_factor") {
        // User has MFA explicitly enabled — not supported yet.
        toast.error("Multi-factor authentication is not yet supported. Please contact support.");
      } else {
        toast.error("Sign-in could not be completed. Please try again.");
      }
    } catch (err) {
      toast.error(clerkErrorMessage(err, "Invalid email or password."));
    }
  }

  // Step 2: device trust verification via email code
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    setVerifying(true);
    try {
      const { error } = await signIn!.mfa.verifyEmailCode({ code });
      if (error) {
        toast.error(clerkErrorMessage(error, "That code didn't work. Please try again."));
        return;
      }
      if (signIn!.status === "complete") {
        await finalize(signIn, router);
      } else {
        toast.error("Verification could not be completed. Please try again.");
      }
    } catch (err) {
      toast.error(clerkErrorMessage(err, "Verification failed. Please try again."));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0) return;
    try {
      const { error } = await signIn!.mfa.sendEmailCode();
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

  const isSubmitting = form.formState.isSubmitting;

  // ── Step 2: Device verification (needs_client_trust) ──
  if (step === "verify") {
    return (
      <div className="flex flex-col min-h-dvh w-full font-sans bg-[#eef4ff]">
        <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-12 overflow-y-auto">
          <div className="auth-animate flex flex-col items-center w-full max-w-[480px]">

            <form
              onSubmit={handleVerify}
              className="bg-white border border-[#c3c6d7] rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] px-12 py-12 flex flex-col items-center w-full"
              data-auth-item
              style={{ "--auth-delay": "0ms" } as React.CSSProperties}
            >
              {/* Icon */}
              <div className="relative size-20 mb-8 shrink-0">
                <div className="auth-success-icon size-20 rounded-full bg-[#e4efff] flex items-center justify-center">
                  <Mail className="size-8 text-[--val-primary-dark]" />
                </div>
                <div className="auth-success-badge absolute -bottom-1 -right-1 size-8 rounded-full bg-[#10b981] border-4 border-white flex items-center justify-center">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </div>
              </div>

              <h2 className="text-[30px] font-bold text-val-heading font-display leading-[36px] text-center mb-4">
                Verify your device
              </h2>

              <div className="text-center text-base leading-[26px] mb-8">
                <p className="text-[#434655]">Enter the 6-digit code we sent to</p>
                <p>
                  <span className="font-semibold text-val-heading">
                    {submittedEmail}
                  </span>
                </p>
              </div>

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
                  "Verify & sign in"
                )}
              </Button>

              <div className="w-full flex flex-col gap-4">
                <div className="w-full bg-val-bg-tint rounded-lg px-6 py-4 flex items-center justify-center gap-3">
                  <span className="text-sm font-medium text-[#434655]">Didn&apos;t receive it?</span>
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
                    onClick={() => { setStep("password"); setCode(""); }}
                    className="text-sm font-medium text-[#434655] hover:underline"
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        <AuthFooter />
      </div>
    );
  }

  // ── Step 1: Password form ──
  return (
    <div className="flex flex-col min-h-dvh w-full font-sans">

      {/* ── Main - Auth Shell Wrapper ── */}
      <div className="flex flex-1">

        {/* Section - Brand Panel (Left/Top) */}
        <AuthBrandPanel />

        {/* Right: Login Form */}
        <div className="flex flex-1 items-center justify-center bg-surface-base px-4 py-6 sm:px-6 sm:py-12 lg:px-24 overflow-y-auto">
          <div className="auth-animate w-full max-w-[440px]">

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
              className="mb-6"
              data-auth-item
              style={{ "--auth-delay": "60ms" } as React.CSSProperties}
            >
              <h2 className="text-3xl font-semibold text-foreground font-display leading-tight">
                Welcome back
              </h2>
              <p className="text-base text-muted-foreground mt-1">
                Sign in to your Valgate account
              </p>
            </div>

            {SHOW_GOOGLE && (
              <>
                <button
                  type="button"
                  data-auth-item
                  style={{ "--auth-delay": "130ms" } as React.CSSProperties}
                  className="auth-google-btn w-full flex items-center justify-center gap-3 h-12 border border-border-default bg-surface-base rounded-xl text-base font-medium text-foreground hover:bg-surface-page"
                >
                  <GoogleIcon className="size-5 shrink-0" />
                  Continue with Google
                </button>

                <div
                  className="flex items-center gap-4 my-6"
                  data-auth-item
                  style={{ "--auth-delay": "180ms" } as React.CSSProperties}
                >
                  <div className="flex-1 h-px bg-border-default" />
                  <span className="text-sm text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border-default" />
                </div>
              </>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
                data-auth-item
                style={{ "--auth-delay": "220ms" } as React.CSSProperties}
              >

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">
                        Email address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@company.com"
                          autoComplete="email"
                          aria-required="true"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="pr-10"
                            aria-required="true"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-surface-tint transition-colors duration-150">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="size-4 rounded border-border-default accent-interactive-primary cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground">Remember me</span>
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-text-link hover:text-text-link-hover transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  )}
                />

                <Button
                  type="submit"
                  className="auth-submit-btn w-full h-11 text-base font-semibold rounded-xl mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Signing in
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>
            </Form>

            <p
              className="mt-6 text-center text-sm text-muted-foreground"
              data-auth-item
              style={{ "--auth-delay": "280ms" } as React.CSSProperties}
            >
              Don&apos;t have an account?{" "}
              <a
                href="/register"
                className="font-semibold text-text-link hover:text-text-link-hover transition-colors"
              >
                Register
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Simple Footer (Legal only for auth screens) */}
      <AuthFooter />
    </div>
  );
}
