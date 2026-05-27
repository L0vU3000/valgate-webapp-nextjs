"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "./utils";

/**
 * DraggableSheet
 *
 * A three-snap-point bottom sheet (Apple Maps pattern). The sheet floats over
 * full-screen content (e.g. a map), starts at `peek` height, and can be
 * dragged up to `half` or `full`, or down to dismiss.
 *
 *   peek  ≈ 30% of viewport — backdrop transparent, underlying map tappable
 *   half  ≈ 55% — backdrop dims to 30%
 *   full  =  100% minus safe-area-top — backdrop opaque
 *
 * Phone-only. On `sm:` and above this component falls back to a centered
 * Dialog-like overlay; consumers should typically render a different
 * sidebar/panel on desktop and only mount DraggableSheet on phone via
 * `sm:hidden`.
 *
 * Imperative ref API: `sheetRef.current?.snapTo("half")`.
 *
 * Mobbin reference: Apple Maps location detail sheet — drag handle at top,
 * tap or drag anywhere on the sheet body to expand/dismiss.
 */

export type SnapPoint = "peek" | "half" | "full";

export interface DraggableSheetHandle {
  snapTo: (point: SnapPoint) => void;
}

interface DraggableSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The snap to land on when the sheet opens. Defaults to "peek".
   */
  initialSnap?: SnapPoint;
  /**
   * Fires when the sheet settles at a new snap point (after a drag release).
   */
  onSnapChange?: (point: SnapPoint) => void;
  /**
   * Show the iOS-style grab handle at the top. Defaults to true.
   */
  showHandle?: boolean;
  /**
   * Hide the backdrop entirely (e.g. for a peek that should never dim the map).
   * Defaults to false — at peek the backdrop is transparent but still
   * receives the swipe-down gesture; this option fully removes it.
   */
  hideBackdrop?: boolean;
  children: React.ReactNode;
  className?: string;
}

const SNAP_RATIO: Record<SnapPoint, number> = {
  peek: 0.3,
  half: 0.55,
  full: 1,
};

const BACKDROP_OPACITY: Record<SnapPoint, number> = {
  peek: 0,
  half: 0.3,
  full: 0.4,
};

const SNAP_ORDER: SnapPoint[] = ["peek", "half", "full"];

const DRAG_START_THRESHOLD = 8;
const SNAP_THRESHOLD_PX = 80;
const VELOCITY_COMMIT = 0.5;
const DISMISS_VELOCITY = 0.8;

export const DraggableSheet = forwardRef<DraggableSheetHandle, DraggableSheetProps>(
  function DraggableSheet(
    {
      open,
      onOpenChange,
      initialSnap = "peek",
      onSnapChange,
      showHandle = true,
      hideBackdrop = false,
      children,
      className,
    },
    ref,
  ) {
    const [mounted, setMounted] = useState(false);
    const [snap, setSnap] = useState<SnapPoint>(initialSnap);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [visible, setVisible] = useState(false);

    const sheetRef = useRef<HTMLDivElement>(null);
    const dragStartY = useRef(0);
    const dragStartTime = useRef(0);
    const dragLastY = useRef(0);
    const dragLastTime = useRef(0);
    const pointerIdRef = useRef<number | null>(null);

    const reducedMotion = useReducedMotion();

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (open) {
        setSnap(initialSnap);
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
      }
      setVisible(false);
    }, [open, initialSnap]);

    useImperativeHandle(ref, () => ({
      snapTo: (point) => {
        setSnap(point);
        onSnapChange?.(point);
      },
    }));

    const commitSnap = useCallback(
      (point: SnapPoint) => {
        setSnap(point);
        setDragY(0);
        onSnapChange?.(point);
      },
      [onSnapChange],
    );

    const dismiss = useCallback(() => {
      setVisible(false);
      window.setTimeout(() => onOpenChange(false), reducedMotion ? 0 : 240);
    }, [onOpenChange, reducedMotion]);

    const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const target = e.target as HTMLElement;
      // If pointer down lands inside a scrollable container that has scrolled
      // away from the top, let the scroll handler own it — we only steal the
      // gesture for sheet-drag when the inner content is at scrollTop=0.
      const scrollable = target.closest<HTMLElement>("[data-sheet-scroll]");
      if (scrollable && scrollable.scrollTop > 0) return;

      dragStartY.current = e.clientY;
      dragLastY.current = e.clientY;
      dragStartTime.current = performance.now();
      dragLastTime.current = performance.now();
      pointerIdRef.current = e.pointerId;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      const dy = e.clientY - dragStartY.current;
      if (!isDragging && Math.abs(dy) < DRAG_START_THRESHOLD) return;
      if (!isDragging) setIsDragging(true);
      // Only allow positive drag (downward) past the current snap, or upward
      // when we have headroom. We translate the dragY into pixels relative to
      // the current snap's resting position.
      setDragY(dy);
      dragLastY.current = e.clientY;
      dragLastTime.current = performance.now();
    };

    const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      pointerIdRef.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

      if (!isDragging) {
        setIsDragging(false);
        return;
      }
      setIsDragging(false);

      const dy = e.clientY - dragStartY.current;
      const elapsed = Math.max(performance.now() - dragLastTime.current, 1);
      const recentDy = e.clientY - dragLastY.current;
      const velocity = recentDy / elapsed; // px/ms; positive = downward

      const currentIdx = SNAP_ORDER.indexOf(snap);

      // Fling down past peek with high velocity → dismiss.
      if (snap === "peek" && (velocity > DISMISS_VELOCITY || dy > SNAP_THRESHOLD_PX * 1.5)) {
        dismiss();
        return;
      }

      // Otherwise pick the nearest snap, biased by velocity direction.
      let nextIdx = currentIdx;
      if (dy < -SNAP_THRESHOLD_PX || velocity < -VELOCITY_COMMIT) {
        nextIdx = Math.min(currentIdx + 1, SNAP_ORDER.length - 1);
      } else if (dy > SNAP_THRESHOLD_PX || velocity > VELOCITY_COMMIT) {
        nextIdx = Math.max(currentIdx - 1, 0);
      }
      commitSnap(SNAP_ORDER[nextIdx]);
    };

    const handlePointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current === e.pointerId) {
        pointerIdRef.current = null;
        setIsDragging(false);
        setDragY(0);
      }
    };

    if (!mounted || !open) return null;

    // Resting translateY for the current snap, expressed as % of viewport
    // height. We use translateY(% of own-height) by computing relative
    // offset: the sheet itself is sized to 100dvh; we translate it down by
    // (100% - snap-ratio * 100%) so the visible portion equals snap-ratio.
    const restingTranslateVh = (1 - SNAP_RATIO[snap]) * 100; // 70 at peek, 45 at half, 0 at full
    const transform = `translateY(calc(${restingTranslateVh}dvh + ${dragY}px))`;

    // Backdrop opacity tweens with drag, clamped to neighbor snap.
    const baseBackdrop = BACKDROP_OPACITY[snap];
    // Smooth interpolation: if dragging upward (dy negative) increase opacity
    // toward the next snap; downward decreases.
    const nextSnap = dragY < 0 ? SNAP_ORDER[Math.min(SNAP_ORDER.indexOf(snap) + 1, 2)] : SNAP_ORDER[Math.max(SNAP_ORDER.indexOf(snap) - 1, 0)];
    const targetBackdrop = BACKDROP_OPACITY[nextSnap];
    const progress = Math.min(Math.abs(dragY) / SNAP_THRESHOLD_PX, 1);
    const backdropOpacity = baseBackdrop + (targetBackdrop - baseBackdrop) * progress;

    return createPortal(
      <div className="fixed inset-0 z-50 pointer-events-none sm:hidden">
        {/* Backdrop — pointer-events controlled per snap so map is tappable at peek */}
        {!hideBackdrop && (
          <div
            aria-hidden="true"
            onClick={dismiss}
            className="absolute inset-0 bg-black transition-opacity"
            style={{
              opacity: visible ? backdropOpacity : 0,
              transitionDuration: reducedMotion ? "0.01ms" : isDragging ? "0ms" : "240ms",
              transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
              pointerEvents: backdropOpacity > 0.05 ? "auto" : "none",
            }}
          />
        )}

        <div
          ref={sheetRef}
          role="dialog"
          aria-modal={snap !== "peek"}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className={cn(
            "absolute inset-x-0 top-0 h-dvh w-full bg-surface-base rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.18)] pointer-events-auto flex flex-col overflow-hidden",
            className,
          )}
          style={{
            transform: visible ? transform : `translateY(100dvh)`,
            transition: isDragging
              ? "none"
              : reducedMotion
                ? "transform 0.01ms"
                : "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
            // Use touch-action: none on the sheet so vertical scroll inside
            // is handled via the data-sheet-scroll opt-in only. The drag
            // handler honors the same scrollable boundary.
            touchAction: "none",
            paddingTop: snap === "full" ? "env(safe-area-inset-top)" : undefined,
          }}
        >
          {showHandle && (
            <div className="flex shrink-0 justify-center pt-2 pb-1" aria-hidden="true">
              <div className="h-1 w-9 rounded-full bg-border-default" />
            </div>
          )}
          {children}
        </div>
      </div>,
      document.body,
    );
  },
);

// Local hook — avoid coupling to motion library; reads media query once.
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
