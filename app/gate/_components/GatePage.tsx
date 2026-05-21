"use client";

import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifySitePassword, type GateFormState } from "../actions";

type GatePageProps = {
  from: string;
};

const initialState: GateFormState = {};

export function GatePage({ from }: GatePageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(verifySitePassword, initialState);

  return (
    <div className="flex min-h-screen w-full flex-col font-sans">
      <div className="flex flex-1">
        <AuthBrandPanel />

        <div className="flex flex-1 items-center justify-center overflow-y-auto bg-surface-base px-6 py-12 lg:px-24">
          <div className="w-full max-w-[440px]">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <Image src="/valgate-icon.svg" width={28} height={28} alt="" />
              <span className="font-display text-xl font-extrabold tracking-[-0.4px]">
                Valgate
              </span>
            </div>

            <div className="mb-6">
              <h1 className="font-display text-3xl font-semibold leading-tight text-foreground">
                Preview access
              </h1>
              <p className="mt-1 text-base text-muted-foreground">
                This deploy is password-protected. Enter the preview password to continue.
              </p>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="from" value={from} />

              <div className="flex flex-col gap-2">
                <Label htmlFor="gate-password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="gate-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter preview password"
                    autoComplete="current-password"
                    className="h-11 pr-10"
                    aria-invalid={Boolean(state.error)}
                    aria-describedby={state.error ? "gate-password-error" : undefined}
                    disabled={isPending}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {state.error ? (
                  <p id="gate-password-error" className="text-sm text-destructive" role="alert">
                    {state.error}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="mt-2 h-11 w-full rounded-xl text-base font-semibold"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Verifying
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}
