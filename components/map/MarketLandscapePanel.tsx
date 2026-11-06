"use client";

// "Market" section of the map drawer: realestate.com.kh stats and recent listings around the
// selected pin. Loads lazily when the drawer opens, like the drawer's cover photo.

import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { PORTAL_ORIGIN, type TabStats } from "@/lib/market-landscape";
import type { MarketLandscapeState } from "@/components/map/useMarketLandscape";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus";
const ctaClass = `touch-44 inline-flex items-center gap-1.5 rounded-md bg-interactive-secondary px-3 text-xs font-semibold text-interactive-secondary-text hover:bg-interactive-secondary-hover ${focusRing}`;
const labelClass = "text-[11px] font-semibold uppercase tracking-[0.05em] text-secondary";

function formatDistance(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

function SectionHeader() {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`${labelClass} whitespace-nowrap`}>Market</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}

function PortalCta({ label }: { label: string }) {
  return (
    <a href={PORTAL_ORIGIN} target="_blank" rel="noopener noreferrer" className={ctaClass}>
      {label}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

function Empty({ message, cta }: { message: string; cta: ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg bg-surface-sunken p-3">
      <p className="text-sm text-secondary">{message}</p>
      {cta}
    </div>
  );
}

function StatBlock({ title, stats }: { title: string; stats: TabStats | null }) {
  return (
    <div>
      <p className={`${labelClass} mb-0.5`}>{title}</p>
      {stats ? (
        <>
          <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(stats.median)}</p>
          <p className="text-[11px] text-secondary tabular-nums">
            {formatCurrency(stats.p20)}–{formatCurrency(stats.p80)} · {stats.total.toLocaleString()} listings
          </p>
        </>
      ) : (
        <p className="text-sm text-secondary">No listings</p>
      )}
    </div>
  );
}

export function MarketLandscapePanel({
  propertyId,
  state,
  onRetry,
}: {
  propertyId: string;
  state: MarketLandscapeState;
  // Lifted state still retries: HomePage owns the fetch, the panel keeps the button.
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return (
      <section aria-busy="true" aria-label="Market data loading">
        <SectionHeader />
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded-md bg-surface-sunken" />
          <div className="h-24 animate-pulse rounded-md bg-surface-sunken" />
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section>
        <SectionHeader />
        <Empty
          message="Couldn't load market data right now."
          cta={
            <button type="button" onClick={onRetry} className={ctaClass}>
              Try again
            </button>
          }
        />
      </section>
    );
  }

  const { data } = state;
  if (data.coverage === "disabled") {
    return (
      <section>
        <SectionHeader />
        <Empty message="Area market data isn't switched on yet." cta={<PortalCta label="Browse realestate.com.kh" />} />
      </section>
    );
  }
  if (data.coverage === "unsupported") {
    return (
      <section>
        <SectionHeader />
        <Empty message="Area market data covers Cambodia only." cta={<PortalCta label="Browse realestate.com.kh" />} />
      </section>
    );
  }
  if (data.coverage === "unavailable" || (data.coverage === "ok" && !data.area)) {
    return (
      <section>
        <SectionHeader />
        <Empty message="Market data is unavailable for this location right now." cta={
          <button type="button" onClick={onRetry} className={ctaClass}>Try again</button>
        } />
      </section>
    );
  }
  if (data.coverage === "unmatched" || !data.area) {
    return (
      <section>
        <SectionHeader />
        <Empty
          message="We couldn't place this property in a district. Adding the commune and district to its address fixes that."
          cta={
            <Link href={`/property/${propertyId}/overview?edit=1`} className={ctaClass}>
              Fix property address
            </Link>
          }
        />
      </section>
    );
  }

  const { area } = data;
  return (
    <section>
      <SectionHeader />
      <p className="mb-2 text-xs text-secondary">{area.district}, {area.province}</p>
      <div className="grid grid-cols-2 gap-x-3">
        <StatBlock title="Median sale" stats={data.stats.sale} />
        <StatBlock title="Median rent" stats={data.stats.rent} />
      </div>

      {data.districtMedians.length > 0 && (
        <div className="mt-4">
          <p className={`${labelClass} mb-1.5`}>Sale median by district</p>
          <ul className="space-y-1">
            {data.districtMedians.map((d) => (
              <li
                key={d.name}
                className={`flex justify-between text-xs tabular-nums ${
                  d.name === area.district ? "font-semibold text-foreground" : "text-secondary"
                }`}
              >
                <span>{d.name}</span>
                <span>{formatCurrency(d.median)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <p className={`${labelClass} mb-1.5`}>Recent listings in {area.listingsArea}</p>
        {data.listings.length === 0 ? (
          <Empty message={`No recent listings in ${area.listingsArea}.`} cta={<PortalCta label="Browse realestate.com.kh" />} />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {data.listings.map((l) => (
              <li key={`${l.tab}:${l.id}`}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`touch-44 flex items-center justify-between gap-3 rounded-sm py-2 hover:bg-surface-tint ${focusRing}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-foreground">{l.headline}</span>
                    <span className="block text-[11px] text-secondary tabular-nums">
                      {l.tab === "sale" ? "Sale" : "Rent"} ·{" "}
                      {l.distanceM === null ? "location approximate" : `${formatDistance(l.distanceM)} away`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-foreground tabular-nums">
                    {l.priceLabel ?? "—"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[11px] text-secondary">
        Data ©{" "}
        <a href={PORTAL_ORIGIN} target="_blank" rel="noopener noreferrer" className={`underline ${focusRing}`}>
          realestate.com.kh
        </a>
      </p>
    </section>
  );
}
