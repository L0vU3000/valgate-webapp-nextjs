import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-[30px] font-bold text-val-heading font-display leading-[36px]">
        Page not found
      </h1>
      <p className="max-w-md text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or may have
        moved.
      </p>
      <div className="mt-2 flex gap-3">
        <Button asChild>
          <Link href="/app">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/portfolio">Go to portfolio</Link>
        </Button>
      </div>
    </div>
  );
}
