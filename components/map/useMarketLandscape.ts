"use client";

// Market landscape around the drawer's property, as shared state: the drawer's Market section and
// the map's listing pills both render from this one fetch (HomePage owns it, MapView + the panel
// receive props). Same state machine the panel used to own — lifted, not rewritten.
import { useEffect, useState } from "react";
import { getPropertyMarketLandscape } from "@/app/actions/market-landscape";
import type { MarketLandscapeDTO } from "@/lib/market-landscape";

export type MarketLandscapeState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; data: MarketLandscapeDTO };

export function useMarketLandscape(propertyId: string | null) {
  const [state, setState] = useState<MarketLandscapeState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!propertyId) return; // nothing open — the panel is unmounted, the pills empty
    let cancelled = false;
    setState({ status: "loading" });
    getPropertyMarketLandscape(propertyId)
      .then((result) => {
        if (cancelled) return;
        setState(result.ok ? { status: "done", data: result.data } : { status: "error" });
      })
      // A rejected action (network drop, expired session) must land on the retry state, not spin.
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, attempt]);

  const retry = () => setAttempt((n) => n + 1);
  return { state, retry };
}