import Image from "next/image";
import Link from "next/link";

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Valgate
          </span>
          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="flex min-h-[40px] items-center rounded-md px-3 text-sm font-medium text-slate-700 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="flex min-h-[40px] items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Your property records, finally in order.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Keep every document tied to your home in one place. Track
            ownership, location, and the progress of each record, so nothing
            gets lost between drawers, inboxes, and old folders.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              href="/register"
              className="flex min-h-[40px] items-center rounded-md bg-blue-600 px-6 text-base font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
            >
              Get started
            </Link>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50 py-20">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 sm:grid-cols-3">
            <div className="text-center sm:text-left">
              <span className="text-sm font-semibold text-blue-700">
                Step 1
              </span>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Capture
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Add the documents that matter for each property, from deeds
                and inspections to receipts and warranties.
              </p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-sm font-semibold text-blue-700">
                Step 2
              </span>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Organize
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Group records by property and location, so ownership and
                history are easy to trace whenever you need them.
              </p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-sm font-semibold text-blue-700">
                Step 3
              </span>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Complete
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                See what&apos;s missing and track progress until every property
                record is accounted for.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid items-center gap-10 sm:grid-cols-2">
            <div className="relative h-64 w-full overflow-hidden rounded-xl sm:h-80">
              <Image
                src="/property-hero.jpg"
                alt="A well-kept home exterior"
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                A clear home for every record
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Instead of hunting through folders and emails, find the right
                document for the right property in moments. Your records stay
                organized as your home and its history grow.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50 py-20 text-center">
          <div className="mx-auto max-w-xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Start organizing your property records today.
            </h2>
            <div className="mt-8 flex justify-center">
              <Link
                href="/register"
                className="flex min-h-[40px] items-center rounded-md bg-blue-600 px-6 text-base font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
              >
                Get started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
          <span className="text-sm font-medium text-slate-700">Valgate</span>
          <Link
            href="/login"
            className="flex min-h-[40px] items-center rounded-md px-3 text-sm font-medium text-slate-700 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
