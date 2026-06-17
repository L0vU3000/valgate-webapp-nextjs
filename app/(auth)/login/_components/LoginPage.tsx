"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
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

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
    mode: "onBlur",
  });

  async function onSubmit(_values: LoginValues) {
    try {
      // TODO(clerk): replace with await signIn.create({ identifier: _values.email, password: _values.password })
      toast.error("Auth not yet wired up");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  const isSubmitting = form.formState.isSubmitting;

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
