"use client";

import type { ReactNode } from "react";

/**
 * MobileCardTable
 *
 * Thin wrapper that swaps between two renderers based on viewport width.
 * Used across the property detail pages where a multi-column desktop
 * `<table>` doesn't fit at 484px and we render the same data as a
 * stacked card list on mobile instead.
 *
 * The wrapper itself is intentionally minimal — it only handles the
 * `hidden sm:block` / `block sm:hidden` branching so each page can keep
 * its own desktop table layout and mobile card visual without DOM
 * hierarchy gymnastics.
 *
 * Example usage:
 *
 *     <MobileCardTable
 *       desktop={
 *         <table className="w-full">
 *           ...
 *         </table>
 *       }
 *       mobile={
 *         <div className="flex flex-col gap-3">
 *           {rows.map((row) => (
 *             <SomeCard key={row.id} row={row} />
 *           ))}
 *         </div>
 *       }
 *     />
 *
 * Both branches are rendered in the DOM (just hidden via CSS) so any
 * data fetching or animation state inside them only fires once. This is
 * fine for read-only display content but be cautious about heavy
 * components inside either branch.
 */
interface MobileCardTableProps {
  /** JSX rendered at `sm:` and above (typically the existing `<table>`). */
  desktop: ReactNode;
  /** JSX rendered below `sm:` (typically a stacked card list). */
  mobile: ReactNode;
  /** Optional wrapper className applied to both branches' container. */
  className?: string;
}

export function MobileCardTable({ desktop, mobile, className }: MobileCardTableProps) {
  return (
    <>
      {/* Mobile branch — visible below `sm:` (640px). */}
      <div className={`block sm:hidden${className ? ` ${className}` : ""}`}>
        {mobile}
      </div>

      {/* Desktop branch — visible at `sm:` and above. */}
      <div className={`hidden sm:block${className ? ` ${className}` : ""}`}>
        {desktop}
      </div>
    </>
  );
}
