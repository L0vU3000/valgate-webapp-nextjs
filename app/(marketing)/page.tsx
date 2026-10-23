import Link from "next/link";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus";

const steps = [
  {
    numeral: "01",
    title: "Add your properties",
    line: "Address, purchase price, mortgage — or import a spreadsheet.",
  },
  {
    numeral: "02",
    title: "Watch equity build",
    line: "Valuations refresh automatically; you see the change, not a yearly surprise.",
  },
  {
    numeral: "03",
    title: "Keep every document filed",
    line: "Leases, deeds and statements, attached to the property they belong to.",
  },
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-surface-base px-8 pb-12 pt-[60px] text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-5 w-[3px] rounded-full bg-brand" />
          <span className="text-xl font-bold tracking-[-0.2px]">Valgate</span>
        </div>

        <div className="mt-12 grid gap-12 lg:mt-20 lg:grid-cols-2 lg:items-center lg:gap-16">
          <section className="max-w-md">
            <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-1px]">
              Every property you own, in one instrument.
            </h1>
            <p className="mt-4 text-[17px] leading-[1.4] text-secondary">
              Valuations, equity, rent and documents — tracked continuously, not once a year.
            </p>

            <Link
              href="/register"
              className={`touch-44 mt-8 flex h-[52px] w-full items-center justify-center rounded-[12px] bg-linear-[168deg] from-brand-deep to-brand text-[17px] font-semibold text-text-inverse shadow-[0_8px_28px_rgba(20,43,80,0.08)] transition duration-200 ease-out active:scale-[0.98] active:to-brand-deep active:shadow-none ${focusRing}`}
            >
              Create your portfolio
            </Link>
            <p className="mt-3 flex min-h-11 items-center justify-center gap-1 text-[13px]">
              <span className="text-secondary">Already have an account?</span>
              <Link
                href="/login"
                className={`touch-44 inline-flex items-center justify-center rounded-md font-semibold text-brand active:text-brand-deep ${focusRing}`}
              >
                Log in
              </Link>
            </p>
          </section>

          {/* Static product preview — a picture of the app, not live data (MARKETING_SPEC §3.5). */}
          <figure
            aria-label="Product preview"
            className="flex w-full max-w-md flex-col gap-4 justify-self-center rounded-2xl bg-surface-elevated p-6"
          >
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-3 w-[3px] rounded-full bg-brand" />
              <span className="text-[11px] font-semibold tracking-wider text-secondary">
                TOTAL PORTFOLIO VALUE
              </span>
            </div>
            <p className="font-mono text-[28px] font-bold">$2.85M</p>
            <dl>
              <div className="flex min-h-11 items-center justify-between">
                <dt className="text-[11px] font-semibold text-secondary">PROPERTY VALUE</dt>
                <dd className="font-mono text-[13px] font-semibold">$3,260,000</dd>
              </div>
              <div className="flex min-h-11 items-center justify-between">
                <dt className="text-[11px] font-semibold text-secondary">OUTSTANDING DEBT</dt>
                <dd className="font-mono text-[13px] font-semibold text-status-danger">-$412,500</dd>
              </div>
            </dl>
          </figure>
        </div>

        <section className="mt-12 lg:mt-24" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="text-[11px] font-semibold tracking-[2.4px] text-secondary">
            HOW IT WORKS
          </h2>
          <ol className="mt-8 grid gap-6 lg:grid-cols-3 lg:gap-8">
            {steps.map((step) => (
              <li key={step.numeral} className="flex gap-4">
                <span className="font-mono text-xl font-semibold text-brand">{step.numeral}</span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="text-[13px] text-secondary">{step.line}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-6 max-w-md lg:mt-16">
          <p className="text-[13px] leading-[1.4] text-secondary">
            Encrypted storage. No ads. No data resale.
          </p>
          <Link
            href="/register"
            className={`touch-44 mt-6 flex h-[52px] w-full items-center justify-center rounded-[12px] bg-surface-elevated text-[17px] font-semibold text-foreground transition duration-200 ease-out active:scale-[0.98] active:bg-surface-sunken ${focusRing}`}
          >
            Create your portfolio
          </Link>
        </div>
      </div>
    </main>
  );
}
