"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

function AnimatedCheckmark() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <style>{`
        @keyframes draw-circle {
          from { stroke-dashoffset: 138; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes draw-check {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }
        .circle-path {
          stroke-dasharray: 138;
          stroke-dashoffset: 138;
          animation: draw-circle 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
        }
        .check-path {
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
          animation: draw-check 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards;
        }
      `}</style>
      <circle
        className="circle-path"
        cx="24"
        cy="24"
        r="22"
        stroke="#004ac6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polyline
        className="check-path"
        points="14,24 21,31 34,17"
        stroke="#004ac6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface SuccessCardProps {
  email: string;
  onReset: () => void;
}

function SuccessCard({ email, onReset }: SuccessCardProps) {
  return (
    <div
      key="success"
      className="w-full bg-white border border-[rgba(195,198,215,0.4)] rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[41px] flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
    >
      <div className="mb-6">
        <AnimatedCheckmark />
      </div>

      <h1 className="text-[30px] font-bold leading-[36px] text-[#121c28] text-center mb-3">
        Check your inbox
      </h1>

      <p className="text-base text-[#434655] text-center leading-[26px] max-w-[320px] mb-2">
        We sent a reset link to <strong className="text-[#121c28]">{email}</strong>. The link expires in 1 hour.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="group flex items-center gap-1 text-sm text-[#004ac6] hover:text-[#003ba3] transition-colors duration-150 mb-8"
      >
        Try a different email
        <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      <div className="border-t border-[#d8e3f4] pt-6 w-full flex justify-center">
        <Link
          href="/login"
          className="group flex items-center gap-2 text-sm font-medium text-[#004ac6] hover:text-[#003ba3] transition-colors duration-150"
        >
          <ArrowLeft className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to login
        </Link>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  async function onSubmit(_values: ForgotPasswordValues) {
    try {
      // TODO(clerk): replace with Clerk forgot password API call
      setSubmittedEmail(_values.email);
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  function handleReset() {
    const email = submittedEmail ?? "";
    setSubmitted(false);
    setSubmittedEmail(null);
    form.reset({ email });
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col min-h-screen w-full font-sans bg-[#eef4ff]">
      <div className="flex flex-1 items-center justify-center px-6 py-12">
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

          {submitted && submittedEmail ? (
            <SuccessCard email={submittedEmail} onReset={handleReset} />
          ) : (
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
                  Enter your email address and we&apos;ll send you a link to reset your password.
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
                        Send reset link
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
