"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-[30px] font-bold text-val-heading font-display leading-[36px]">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-slate-500">
        We hit an unexpected error. Please try again, or head back to your
        portfolio.
      </p>
      <div className="mt-2 flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/app">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
