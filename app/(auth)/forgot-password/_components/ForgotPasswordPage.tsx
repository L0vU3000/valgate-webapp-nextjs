"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, ArrowRight, ArrowLeft, Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSignIn } from "@clerk/nextjs";
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
import { clerkErrorMessage } from "../../_lib/clerk-errors";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const router = useRouter();
  const { signIn } = useSignIn();

  const [step, setStep] = useState<"email" | "reset">("email");
  const [submittedEmail, setSubmittedEmail] = useState("");

  // Reset-step state
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  // Step 1: identify the user with create(), then sendCode() sends to the identifier on file.
  // resetPasswordEmailCode.sendCode() takes no params — the identifier comes from create().
  async function onSubmit(values: ForgotPasswordValues) {
    try {
      const { error: createError } = await signIn.create({ identifier: values.email });
      if (createError) {
        toast.error(clerkErrorMessage(createError, "Could not find an account with that email."));
        return;
      }
      const { error } = await signIn.resetPasswordEmailCode.sendCode();
      if (error) {
        toast.error(clerkErrorMessage(error, "Could not start the password reset."));
        return;
      }
      setSubmittedEmail(values.email);
      setStep("reset");
    } catch (err) {
      toast.error(clerkErrorMessage(err, "Could not start the password reset."));
    }
  }

  // Step 2: verify the code, set a new password, then sign in.
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    if (code.length < 6) {
      setResetError("Enter the 6-digit code we emailed you.");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords don't match.");
      return;
    }
    setResetting(true);
    try {
      const { error: codeError } = await signIn.resetPasswordEmailCode.verifyCode({ code });
      if (codeError) {
        setResetError(clerkErrorMessage(codeError, "That code didn't work. Please try again."));
        return;
      }
      const { error: pwError } = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword });
      if (pwError) {
        setResetError(clerkErrorMessage(pwError, "Could not set your new password."));
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl("/");
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });
      } else {
        setResetError("Could not complete the reset. Please try again.");
      }
    } catch (err) {
      setResetError(clerkErrorMessage(err, "Could not reset your password. Please try again."));
    } finally {
      setResetting(false);
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col min-h-dvh w-full font-sans bg-[#eef4ff]">
      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
        <div className="auth-animate flex flex-col items-center w-full max-w-[460px]">

          {/* Logo — icon + wordmark, matching login mobile anchor */}
          <div
            className="mb-8 flex items-center gap-2"
            data-auth-item
            style={{ "--auth-delay": "0ms" } as React.CSSProperties}
          >
            <Image src="/valgate-icon.svg" width={28} height={28} alt="" />
            <span className="text-xl font-extrabold font-display tracking-[-0.4px] text-[--val-primary-dark]">
              Valgate
            </span>
          </div>

          {step === "reset" ? (
            /* Step 2 — code + new password */
            <form
              onSubmit={handleReset}
              className="w-full bg-white border border-[#d8e3f4] rounded-lg shadow-[0px_8px_30px_0px_rgba(0,0,0,0.04)] p-[41px] flex flex-col gap-8"
              data-auth-item
              style={{ "--auth-delay": "80ms" } as React.CSSProperties}
            >
              <div className="flex flex-col items-center gap-1.5">
                <h1 className="text-2xl font-semibold text-[#121c28] text-center leading-8">
                  Reset your password
                </h1>
                <p className="text-sm text-[#434655] text-center leading-[1.625] max-w-[320px]">
                  Enter the 6-digit code we sent to{" "}
                  <strong className="text-[#121c28]">{submittedEmail}</strong> and choose a new password.
                </p>
              </div>

              <div className="flex flex-col gap-5">
                {/* Code */}
                <div className="flex flex-col items-center gap-2">
                  <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* New password */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="newPassword" className="text-sm font-medium text-[#121c28]">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#737686] pointer-events-none" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="pl-10 bg-[#f8f9ff] border-[#c3c6d7]"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="confirmNewPassword" className="text-sm font-medium text-[#121c28]">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#737686] pointer-events-none" />
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="pl-10 bg-[#f8f9ff] border-[#c3c6d7]"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {resetError && <p className="text-xs text-red-500">{resetError}</p>}
              </div>

              <Button
                type="submit"
                className="auth-submit-btn group w-full h-11 bg-[#004ac6] hover:bg-[#003ba3] text-white font-medium text-sm rounded gap-2"
                disabled={resetting}
              >
                {resetting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Resetting…
                  </>
                ) : (
                  <>
                    Reset password
                    <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>

              <div className="border-t border-[#d8e3f4] pt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setCode(""); setResetError(null); }}
                  className="group flex items-center gap-2 text-sm font-medium text-[#004ac6] hover:text-[#003ba3] transition-colors duration-150"
                >
                  <ArrowLeft className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  Use a different email
                </button>
              </div>
            </form>
          ) : (
            /* Step 1 — request the code */
            <div
              className="w-full bg-white border border-[#d8e3f4] rounded-lg shadow-[0px_8px_30px_0px_rgba(0,0,0,0.04)] p-[41px] flex flex-col gap-8"
              data-auth-item
              style={{ "--auth-delay": "80ms" } as React.CSSProperties}
            >

              {/* Heading + subtitle */}
              <div className="flex flex-col items-center gap-1.5">
                <h1 className="text-2xl font-semibold text-[#121c28] text-center leading-8">
                  Forgot your password?
                </h1>
                <p className="text-sm text-[#434655] text-center leading-[1.625] max-w-[320px]">
                  Enter your email address and we&apos;ll send you a code to reset your password.
                </p>
              </div>

              {/* Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-[#121c28]">
                          Email address
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#737686] pointer-events-none" />
                            <Input
                              type="email"
                              placeholder="name@example.com"
                              autoComplete="email"
                              autoFocus
                              aria-required="true"
                              className="pl-10 bg-[#f8f9ff] border-[#c3c6d7]"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="auth-submit-btn group w-full h-11 bg-[#004ac6] hover:bg-[#003ba3] text-white font-medium text-sm rounded gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send reset code
                        <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              {/* Divider + Back to login */}
              <div className="border-t border-[#d8e3f4] pt-6 flex justify-center">
                <Link
                  href="/login"
                  className="group flex items-center gap-2 text-sm font-medium text-[#004ac6] hover:text-[#003ba3] transition-colors duration-150"
                >
                  <ArrowLeft className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  Back to login
                </Link>
              </div>
            </div>
          )}

          {/* Help text — always visible */}
          <div
            className="mt-8 flex items-center gap-5"
            data-auth-item
            style={{ "--auth-delay": "160ms" } as React.CSSProperties}
          >
            <span className="text-sm font-medium text-[#434655]">Need help?</span>
            <span className="text-[#c3c6d7]">•</span>
            <Link
              href="/contact"
              className="text-sm font-medium text-[#434655] hover:text-[#121c28] transition-colors duration-150"
            >
              Contact Support
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
