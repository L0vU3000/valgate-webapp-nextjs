import Link from "next/link";
import { CountryGlobe } from "@/components/marketing/CountryGlobe";

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-foreground">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">Valgate</span>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="touch-44 flex items-center rounded-md px-3 text-sm font-medium text-secondary transition-colors hover:bg-surface-tint hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="touch-44 flex items-center rounded-md bg-interactive-primary px-4 text-sm font-medium text-interactive-primary-text transition-colors hover:bg-interactive-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-16 text-center sm:pt-24">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Your property records, finally in order.
          </h1>
        </section>

        <div className="mx-auto w-full max-w-3xl px-6 pt-4 sm:pt-8">
          <CountryGlobe />
        </div>

        <section className="mx-auto max-w-2xl px-6 pb-16 text-center sm:pb-24">
          <p className="text-lg leading-relaxed text-secondary">
            Keep every document tied to your home in one place. Add a property by
            address where the land register is open, or by pin anywhere else.
            Ownership, location, and the progress of each record stay together, so
            nothing gets lost between drawers, inboxes, and old folders.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              href="/register"
              className="touch-44 flex items-center rounded-md bg-interactive-primary px-6 text-base font-medium text-interactive-primary-text transition-colors hover:bg-interactive-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="text-sm font-medium text-secondary">Valgate</span>
          <Link
            href="/login"
            className="touch-44 flex items-center rounded-md px-3 text-sm font-medium text-secondary transition-colors hover:bg-surface-tint hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
          >
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
