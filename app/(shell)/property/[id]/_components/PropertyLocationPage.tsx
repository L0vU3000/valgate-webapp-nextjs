"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type mapboxgl from "mapbox-gl";
// Load the mapbox-based map lazily and client-only. mapbox-gl is ~500 kB; a static
// import here forced every visitor to download it before the page could render.
// `ssr: false` defers that download until the map actually mounts in the browser,
// and the loading skeleton keeps the layout stable while the chunk streams in.
const PropertyDetailMap = dynamic(
  () => import("@/components/map/PropertyDetailMap").then((m) => m.PropertyDetailMap),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 animate-pulse bg-slate-100" />,
  },
);
import type { Property } from "@/lib/data/types/property";
import type { LandParcel } from "@/lib/data/types/land-parcel";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import { MapControls } from "@/components/map/MapControls";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Map as MapIcon,
  MapPin,
  Maximize2,
  PencilLine,
  Redo2,
  Spline,
  Trash2,
  Undo2,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { PropertyMapExpandModal } from "@/components/map/PropertyMapExpandModal";
import { DrawBoundaryTool, type DrawMode } from "@/components/map/DrawBoundaryTool";
import type { PropertyComparable } from "@/lib/data/types/property-comparable";
import type { MarketSnapshot } from "@/lib/data/types/market-snapshot";
import {
  buildParcelFacts,
  countFactsOnFile,
  formatAddress,
  parseAreaM2,
  ringPoints,
} from "@/lib/data/derivations/parcel-facts";
import { PropertyBoundaryCard } from "./PropertyBoundaryCard";

/** One square icon button in the vector toolbar. Kept local — it exists for this bar only. */
function ToolButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex size-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

// ── Parcel facts ───────────────────────────────────────────────────────────────
//
// The panel renders from what the parcel row actually holds. Two of the three old KPI
// cards (Current Zoning, Elevation Range) are backed by columns that hold a value on 0 of
// 42 parcels in the database, so they rendered an em dash for every property. The
// selection logic lives in lib/data/derivations/parcel-facts.ts, where it is unit-tested.

export function PropertyLocationPage({
  property,
  landParcels,
  comparables,
  marketSnapshot,
}: {
  property: Property;
  landParcels: LandParcel[];
  comparables: PropertyComparable[];
  marketSnapshot: MarketSnapshot;
}) {
  const activeTab = "location";

  return (
    <PropertyLayout
      activeTab={activeTab}
      property={property}
    >
      <div className="bg-val-bg-page-alt min-h-full">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col min-h-full">
          <LocationContent
            property={property}
            landParcels={landParcels}
            comparables={comparables}
            marketSnapshot={marketSnapshot}
          />
        </div>
      </div>
    </PropertyLayout>
  );
}

// ── One labelled fact ──────────────────────────────────────────────────────────

function Fact({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold text-val-heading tabular-nums truncate">
        {value}
      </p>
      {note ? <p className="mt-0.5 text-[11px] text-slate-400">{note}</p> : null}
    </div>
  );
}

// ── Location page content ───────────────────────────────────────────────────────

function LocationContent({
  property,
  landParcels,
  comparables,
  marketSnapshot,
}: {
  property: Property;
  landParcels: LandParcel[];
  comparables: PropertyComparable[];
  marketSnapshot: MarketSnapshot;
}) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapMounted, setMapMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

  // ── Draw or edit a boundary by hand ──────────────────────────────────────────
  // For a user with no KMZ: click the corners on the map instead of importing a file. With a ring
  // already on file, the same tool EDITS it rather than starting over — so it opens seeded with the
  // stored corners and a click near an edge inserts one.
  // The points live here rather than inside the tool, so Undo / Cancel / Save sit beside the state
  // they act on.
  const [drawing, setDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>("draw");
  const [drawPoints, setDrawPoints] = useState<number[][]>([]);
  // Area of the ring being drawn, reported by the tool as corners are added and dragged. Null until
  // the ring has 3 corners. This is the live figure the map badge shows while the tool is open.
  const [liveAreaM2, setLiveAreaM2] = useState<number | null>(null);
  // Undo/redo history. Kept as snapshots rather than diffs: a ring is tens of points, so the cheap
  // thing (copy the array) is also the correct thing — no inverse-operation bookkeeping to get wrong.
  const [undoStack, setUndoStack] = useState<number[][][]>([]);
  const [redoStack, setRedoStack] = useState<number[][][]>([]);
  const [drawBusy, setDrawBusy] = useState(false);
  // The map object reaches this component through `onMapReady`, which fires inside the map's own
  // `load` handler — not on first render. So it is mirrored into state to make the tool re-render
  // once the map actually exists, instead of being handed a null it never recovers from.
  const [drawMap, setDrawMap] = useState<mapboxgl.Map | null>(null);
  const router = useRouter();

  async function saveDrawnBoundary() {
    if (!property.id || drawPoints.length < 3) return;
    setDrawBusy(true);
    try {
      const res = await fetch("/api/property-boundary/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id, ring: drawPoints }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.error ?? "Could not save that boundary.");
        return;
      }
      toast.success(drawMode === "edit" ? "Boundary updated." : "Boundary saved.");
      setDrawPoints([]);
      setDrawing(false);
      router.refresh();
    } catch {
      // Network failure: the ring is still in the editor, so say so and let the user retry.
      toast.error("Could not save that boundary.");
    } finally {
      setDrawBusy(false);
    }
  }

  useEffect(() => {
    setMapMounted(true);
  }, []);
  const propertyCenter: [number, number] = [property.lng, property.lat];
  const mapSubtitle = [property.addressLine, property.city].filter(Boolean).join(", ");
  // One land parcel per property today; the first one carrying a boundary is the drawn ring.
  // The MEASURED figure belongs to the row that HOLDS the ring, never to index 0: a ring-less seed row
  // can carry a size left over from import, which made the panel show a stale area after a clear.
  // No ring, no measurement.
  const measuredParcel = landParcels.find((p) => p.boundary != null) ?? null;
  const boundary = measuredParcel?.boundary ?? null;
  /** The stored ring's corners, without the repeated closing position. */
  const storedRing = useMemo(() => ringPoints(boundary), [boundary]);

  /** Open the hand tool, seeded with what is already on file. */
  function openTool() {
    // With a ring on file the tool EDITs it: it opens on the stored corners so the first thing the
    // user sees is their own boundary with handles on it, not an empty map demanding a redraw.
    setDrawMode(storedRing.length >= 3 ? "edit" : "draw");
    setDrawPoints(storedRing);
    setUndoStack([]);
    setRedoStack([]);
    setDrawing(true);
  }

  /**
   * Every edit goes through here so Undo has something to go back to.
   *
   * `useCallback` with an empty dep list, reading the current ring from a ref: `drawPoints` in the
   * dependency list would hand the draw tool a new `onChange` on every render, and a handler that
   * changes identity is a handler the tool has to rebind — which is what tore its markers down
   * mid-drag. The identity has to be stable for the same reason.
   *
   * ponytail: a drag reports one change, not one per mouse move — `dragend` fires once, so the whole
   * drag is a single undo step. That is the behaviour a vector editor should have anyway.
   */
  const drawPointsRef = useRef(drawPoints);
  drawPointsRef.current = drawPoints;

  const editPoints = useCallback((next: number[][]) => {
    setUndoStack((s) => [...s, drawPointsRef.current]);
    setRedoStack([]);
    setDrawPoints(next);
  }, []);

  function undo() {
    setUndoStack((s) => {
      if (!s.length) return s;
      setRedoStack((r) => [...r, drawPoints]);
      setDrawPoints(s[s.length - 1]);
      return s.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((r) => {
      if (!r.length) return r;
      setUndoStack((s) => [...s, drawPoints]);
      setDrawPoints(r[r.length - 1]);
      return r.slice(0, -1);
    });
  }

  async function clearBoundaryOnServer() {
    if (!property.id) return;
    if (!confirm("Remove this property's boundary? The drawn outline and its measured area are deleted.")) return;
    setDrawBusy(true);
    try {
      const res = await fetch("/api/property-boundary/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.error ?? "Could not clear that boundary.");
        return;
      }
      toast.success("Boundary cleared.");
      closeTool();
      router.refresh();
    } catch {
      toast.error("Could not clear that boundary.");
    } finally {
      setDrawBusy(false);
    }
  }

  function closeTool() {
    setDrawing(false);
    setDrawPoints([]);
    setUndoStack([]);
    setRedoStack([]);
  }
  const finishDrawing = useCallback(() => setDrawMode("edit"), []);
  const shortcutsRef = useRef({ undo, redo, saveDrawnBoundary, closeTool, drawBusy });
  shortcutsRef.current = { undo, redo, saveDrawnBoundary, closeTool, drawBusy };
  useEffect(() => {
    if (!drawing) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest("input, textarea") || target.isContentEditable)) return;
      const actions = shortcutsRef.current;
      const key = event.key.toLowerCase();
      const command = event.metaKey || event.ctrlKey;
      const action = key === "escape" ? actions.closeTool
        : key === "enter" ? actions.saveDrawnBoundary
          : command && key === "z" ? (event.shiftKey ? actions.redo : actions.undo)
            : event.ctrlKey && key === "y" ? actions.redo : null;
      if (!action) return;
      event.preventDefault();
      if (!actions.drawBusy && !event.repeat) void action();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawing]);
  // Declared (official document) vs measured (the ring). Both shown, neither replaced.
  const declaredM2 = parseAreaM2(property.totalArea);
  const facts = useMemo(() => buildParcelFacts(measuredParcel, declaredM2), [measuredParcel, declaredM2]);
  const { on, of } = countFactsOnFile(facts);

  const addressLine = useMemo(
    () =>
      formatAddress([
        property.addressLine,
        property.addressLine2,
        property.city,
        property.province,
        property.zip,
        property.country,
      ]),
    [property],
  );

  function copyCoords() {
    navigator.clipboard.writeText(`${property.lat}, ${property.lng}`).then(() => {
      toast.success("Coordinates copied");
    });
  }

  function exportComparables() {
    if (!comparables.length) {
      toast.error("No comparables to export");
      return;
    }
    const rows = [
      ["Property", "Distance (km)", "Type", "Area (m2)", "Price/m2"],
      ...comparables.map((c) => [
        c.name,
        c.distanceKm.toFixed(2),
        c.type,
        String(c.totalAreaM2),
        String(c.pricePerM2),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${property.code}-comparables.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col">
      {/* Page header — the address card used to be a separate 216px band repeating the
          property name, type and title that the header already carries. It is now one
          block: name as the H1, address on one line, then a compact meta row. */}
      <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-0 animate-[fade-slide-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] sm:text-[32px] font-extrabold text-val-heading tracking-tight leading-tight">
                {property.name || property.code}
              </h1>
            </div>

            {addressLine ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[14px] text-slate-500">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--val-primary-dark)]" />
                <span className="min-w-0">{addressLine}</span>
              </p>
            ) : (
              <p className="mt-1.5 text-[14px] italic text-slate-400">No address on file</p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-[var(--val-primary-dark)]">
                {property.type || "—"}
              </span>
              {property.title && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {property.title}
                </span>
              )}
              <button
                type="button"
                onClick={copyCoords}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-600 tabular-nums transition-[color,box-shadow,border-color] duration-150 hover:border-slate-300 hover:text-val-heading hover:shadow-sm"
              >
                <span>
                  {property.lat.toFixed(5)}, {property.lng.toFixed(5)}
                </span>
                <Copy className="h-3 w-3 opacity-40 transition-opacity group-hover:opacity-80" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-4 sm:px-8 py-5 sm:py-6 flex flex-col gap-4 sm:gap-5">
        {/* Map — the subject of this tab. The old fixed 240/340px band sat below ~700px of
            chrome on a phone, so it started under the fold; the clamp gives it the fold
            instead and still behaves on a short window. */}
        <div
          className="relative shrink-0 overflow-hidden rounded-xl shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both] h-[38vh] min-h-[260px] max-h-[560px] sm:h-[52vh]"
          style={{ animationDelay: "60ms" }}
        >
          {mapMounted && (
            <PropertyDetailMap
              lat={property.lat}
              lng={property.lng}
              boundary={drawing ? null : boundary}
              onLoad={() => setMapLoaded(true)}
              onMapReady={(map) => {
                mapRef.current = map;
                setDrawMap(map);
              }}
              className="absolute inset-0"
            />
          )}

          {/* Draw a boundary by hand. Only mounted once the map object exists, because a click
              handler bound before `load` would place points on a map that is not ready. */}
          {drawMap && (
            <DrawBoundaryTool
              map={drawMap}
              enabled={drawing}
              mode={drawMode}
              points={drawPoints}
              onChange={editPoints}
              onArea={setLiveAreaM2}
              onFinish={finishDrawing}
            />
          )}

          {/* Vector-editor toolbar. Bottom-centre, like every vector tool, because that is where the
              hand already is and it stays clear of the corners the user is dragging. The entry
              button stays top-left with the other map chrome; once editing, the bar takes over.
              The open bar is ~500px wide, wider than a phone's map: it wraps inside the map instead
              of being clipped by it, which used to cut Save off. The shadow stays — this floats on
              satellite imagery, where a 1px border alone disappears, and it matches the other map
              chrome (area badge, Expand). */}
          {drawMap && !mapExpanded && (
            <div
              data-no-drag
              className={cn(
                "absolute z-20 flex items-center border border-border/60 bg-background/90 shadow-sm backdrop-blur-md",
                drawing
                  ? "bottom-4 left-1/2 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap justify-center gap-1.5 rounded-2xl px-2 py-1.5"
                  : "left-3 top-14 rounded-full px-2 py-1.5",
              )}
            >
              {!drawing ? (
                <button
                  type="button"
                  onClick={openTool}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-slate-100"
                >
                  {storedRing.length >= 3 ? <Spline className="size-3" /> : <PencilLine className="size-3" />}
                  {/* The label states what the tool will do to THIS property: with a ring on file it
                      edits, without one it draws. "Draw boundary" over an existing boundary would
                      promise a redraw the user does not want. */}
                  {storedRing.length >= 3 ? "Edit boundary" : "Draw boundary"}
                </button>
              ) : (
                <>
                  {/* The count doubles as the instruction: an empty ring says how to start, and a
                      short one says how many more corners Save is waiting for, so a disabled Save
                      is never unexplained. */}
                  <span className="px-2 text-[12px] tabular-nums text-muted-foreground">
                    {drawPoints.length === 0
                      ? "Click the map to add corners"
                      : drawPoints.length < 3
                        ? `${drawPoints.length} of 3 corners`
                        : `${drawPoints.length} corners`}
                  </span>
                  <span className="h-4 w-px bg-border" />
                  <ToolButton onClick={undo} disabled={!undoStack.length} title="Undo">
                    <Undo2 className="size-3.5" />
                  </ToolButton>
                  <ToolButton onClick={redo} disabled={!redoStack.length} title="Redo">
                    <Redo2 className="size-3.5" />
                  </ToolButton>
                  {/* Clearing drops back to draw mode: edit mode only inserts on an existing edge,
                      so an empty ring left in edit mode ignored every click. */}
                  <ToolButton
                    onClick={() => { editPoints([]); setDrawMode("draw"); }}
                    disabled={!drawPoints.length}
                    title={drawMode === "edit" ? "Remove every corner" : "Clear"}
                  >
                    <Trash2 className="size-3.5" />
                  </ToolButton>
                  <span className="h-4 w-px bg-border" />
                  {storedRing.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => void clearBoundaryOnServer()}
                      disabled={drawBusy}
                      className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
                    >
                      Remove boundary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeTool}
                    className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveDrawnBoundary()}
                    disabled={drawPoints.length < 3 || drawBusy}
                    className="rounded-full bg-[var(--val-primary-dark)] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {drawBusy ? "Saving…" : drawMode === "edit" ? "Save changes" : "Save boundary"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Measured area rides on the map: it is the figure the drawing supports, so it
              belongs with the drawing rather than in a card below it. While the tool is open the
              figure is the LIVE one — computed from the ring as it is drawn — so the number and the
              outline cannot disagree. Gated on the computed value, not on `mapLoaded`: the saved
              figure can exist while the ring has not loaded yet. */}
          {facts.landSizeM2 != null && (
            <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[12px] font-semibold text-foreground tabular-nums shadow-sm backdrop-blur-md animate-[fade-slide-down_0.35s_cubic-bezier(0.22,1,0.36,1)_both]">
              {(drawing && liveAreaM2 != null ? liveAreaM2 : facts.landSizeM2).toLocaleString()} m²
              <span className="font-normal text-muted-foreground">
                {drawing ? "of the outline so far" : "measured"}
              </span>
            </span>
          )}

          {/* Map loading overlay */}
          <div
            className={cn(
              "absolute inset-0 z-50 flex flex-col items-center justify-center bg-white gap-3 transition-opacity duration-500",
              mapLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
            )}
            onTransitionEnd={(e) => {
              if (e.propertyName === "opacity" && mapLoaded) {
                (e.currentTarget as HTMLElement).style.display = "none";
              }
            }}
          >
            <div className="flex items-center gap-2">
              <MapIcon className="size-5 text-[var(--val-primary-dark)] animate-pulse" />
              <span className="text-[13px] font-medium text-slate-500">Loading map…</span>
            </div>
            <div className="w-32 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[var(--val-primary-dark)] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
            </div>
          </div>

          {mapLoaded && (
            <button
              type="button"
              onClick={() => setMapExpanded(true)}
              className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[12px] font-semibold text-foreground shadow-sm backdrop-blur-md transition-[colors,transform] duration-150 hover:bg-background active:scale-95 animate-[fade-slide-down_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
              aria-label="Expand map"
            >
              <Maximize2 className="size-3" />
              Expand map
            </button>
          )}
          <MapControls
            mapRef={mapRef}
            resetCenter={propertyCenter}
            resetZoom={15}
          />
        </div>

        {mapExpanded && (
          <PropertyMapExpandModal
            lat={property.lat}
            lng={property.lng}
            boundary={boundary}
            title={`${property.name || property.code} — Location`}
            subtitle={mapSubtitle || undefined}
            onClose={() => setMapExpanded(false)}
          />
        )}

        {/* Parcel — one panel. Each fact appears only when it holds a value; the footer
            collapses every absent group into a single Add action instead of an empty box. */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-val-heading">Parcel</h2>
            <span className="text-[11px] text-slate-400 tabular-nums">
              {on} of {of} on file
            </span>
          </div>

          {on === 0 ? (
            <p className="mt-3 text-[13px] text-slate-500">
              No parcel record yet. Attach a KMZ below, or draw the boundary on the map.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {facts.landSizeM2 != null && (
                <Fact
                  label={boundary ? "Measured area" : "Total land size"}
                  value={`${facts.landSizeM2.toLocaleString()} m²`}
                  note={
                    facts.landSizeM2 >= 10000
                      ? `${(facts.landSizeM2 / 10000).toFixed(3)} hectares`
                      : undefined
                  }
                />
              )}

              {/* Title area and measured area are different claims about the same land.
                  Both print, and the delta is stated rather than silently reconciled. */}
              {facts.declaredM2 != null && (
                <Fact
                  label="Declared on title"
                  value={`${facts.declaredM2.toLocaleString()} m²`}
                  note={
                    facts.deltaPct != null && facts.deltaPct !== 0
                      ? `differs from measurement by ${Math.abs(facts.deltaPct)}%`
                      : undefined
                  }
                />
              )}

              {(facts.widthM != null || facts.lengthM != null) && (
                <Fact
                  label="Dimensions"
                  value={
                    <>
                      {facts.widthM != null ? `${facts.widthM} m` : "—"}
                      {facts.widthM != null && facts.lengthM != null ? " × " : ""}
                      {facts.lengthM != null ? `${facts.lengthM} m` : ""}
                    </>
                  }
                />
              )}

              {facts.zoning && (
                <Fact
                  label="Zoning"
                  value={facts.zoning}
                  note={
                    facts.developmentPotential.length > 0
                      ? facts.developmentPotential.join(", ")
                      : undefined
                  }
                />
              )}
            </div>
          )}

          {/* The upload is the input that fills the panel above, so it is the panel's footer
              action rather than a card of its own. */}
          <PropertyBoundaryCard
            propertyId={property.id}
            propertyName={property.name || property.code}
            hasBoundary={boundary != null}
            declaredM2={declaredM2 ?? 0}
            measuredM2={facts.landSizeM2}
          />
        </div>

        {/* Comparables — one table. The old metrics card beside it repeated this table's
            first three rows and its footer already carried both headline figures, so the
            card is gone rather than promoted. */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]" style={{ animationDelay: "180ms" }}>
          <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-val-heading">Comparable properties</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {comparables.length > 0
                  ? `${comparables.length} nearby propert${comparables.length === 1 ? "y" : "ies"} in your area`
                  : "No nearby properties found"}
              </p>
            </div>
            <button
              type="button"
              onClick={exportComparables}
              disabled={comparables.length === 0}
              className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-[--val-primary-dark] hover:opacity-80 disabled:opacity-40 disabled:hover:opacity-40 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>

          {comparables.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-slate-400">
              No nearby properties have a market value on file yet, so there is nothing to
              compare. Add a valuation to a nearby property to populate this list.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      {["Property", "Distance", "Type", "Area", "Price/m²"].map((h) => (
                        <th
                          key={h}
                          className="px-2 sm:px-4 py-3 text-left text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparables.slice(0, 4).map((row, i) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-100 hover:bg-blue-50/30 transition-colors"
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <td className="px-2 sm:px-4 py-3 text-[12px] sm:text-[14px] text-val-heading font-medium">
                          {row.name}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-[12px] sm:text-[14px] text-val-heading tabular-nums whitespace-nowrap">
                          {row.distanceKm.toFixed(1)} km
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-[12px] sm:text-[14px] text-val-heading capitalize">
                          {row.type}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-[12px] sm:text-[14px] text-val-heading tabular-nums whitespace-nowrap">
                          {row.totalAreaM2.toLocaleString()} m²
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-[12px] sm:text-[14px] text-val-heading tabular-nums whitespace-nowrap">
                          ${row.pricePerM2.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
                <span>
                  Avg comp price:{" "}
                  <span className="font-semibold text-val-heading tabular-nums">
                    {marketSnapshot.comparableCount > 0
                      ? `$${marketSnapshot.avgComparableValue.toLocaleString()}`
                      : "—"}
                  </span>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Estimated value:{" "}
                  <span className="font-semibold text-val-heading tabular-nums">
                    {marketSnapshot.estimatedValue != null
                      ? `$${marketSnapshot.estimatedValue.toLocaleString()}`
                      : "—"}
                  </span>
                </span>
                {comparables.length > 4 && (
                  <span className="ml-auto text-slate-400">
                    Showing 4 of {comparables.length}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}