"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, CheckCircle2, FileWarning, Loader2, MapPin, UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/components/ui/utils";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

// ── Boundary upload card ──────────────────────────────────────────────────────
//
// Drop KMZ files (one or many) onto a property to attach its land boundary. Two steps, because two
// things need confirming before anything is written:
//
//   1. /preview  — parse each file, match it to a property, and report the pin shift + area delta.
//   2. /commit   — attach, with the user's pin decision, only after they see step 1.
//
// The same panel covers the one-file case (drop a single KMZ for this property) and the bulk case
// (drop a folder of KMZ and let filenames match), because they are the same table with one row.

type Row = {
  file: string;
  code: string;
  propertyId: string;
  propertyName?: string;
  status: "ready" | "unmatched" | "error";
  error?: string;
  reason?: "no-match" | "ambiguous";
  declaredM2?: number;
  sizeM2?: number;
  areaDiffPct?: number | null;
  centroid?: [number, number];
  pinShiftM?: number;
  pinMoved?: boolean;
  /** Whether the property's CURRENT pin falls inside the uploaded ring. */
  pinInside?: boolean;
  replaced?: boolean;
  geometry?: BoundaryGeometry;
};

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function PropertyBoundaryCard({
  propertyId,
  propertyName,
  hasBoundary,
  declaredM2,
  measuredM2,
}: {
  propertyId: string;
  propertyName: string;
  hasBoundary: boolean;
  declaredM2: number;
  measuredM2: number | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  // Which request is in flight. Two values, not a boolean, so the drop zone can say which step is
  // running — "Reading…" while /commit runs would be a lie.
  const [phase, setPhase] = useState<"reading" | "attaching" | null>(null);
  const busy = phase != null;
  const [dragging, setDragging] = useState(false);
  // The files themselves, kept so /commit can re-send the same bytes it previewed — no
  // server-side staging, no upload token to expire.
  const filesRef = useRef<File[]>([]);
  // Per-file pin decision; defaults to "move", flipped by the checkbox on any row that shifts.
  const [movePin, setMovePin] = useState<Record<string, boolean>>({});

  const needsPick = (rows ?? []).filter((r) => r.status === "unmatched" && r.reason === "ambiguous").length;
  const ready = (rows ?? []).filter((r) => r.status === "ready");

  async function handleFiles(list: FileList | null) {
    // The picker is disabled while a request runs; a drop must not start a second one either.
    if (!list?.length || busy) return;
    const files = [...list];
    const notKmz = files.filter((f) => !f.name.toLowerCase().endsWith(".kmz"));
    if (notKmz.length) {
      toast.error(
        notKmz.length === files.length
          ? "Those aren't KMZ files. KMZ is what Google Earth exports."
          : `${notKmz.length} file${notKmz.length > 1 ? "s" : ""} skipped — not KMZ.`,
      );
    }
    const kmz = files.filter((f) => f.name.toLowerCase().endsWith(".kmz"));
    if (!kmz.length) return;

    filesRef.current = kmz;
    setPhase("reading");
    try {
      const body = new FormData();
      for (const f of kmz) body.append("files", f);
      const res = await fetch("/api/property-boundary/preview", { method: "POST", body });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error ?? "Could not read those files.");
        return;
      }
      // Single-file drops default to THIS property: the user is already standing on it, and the
      // filename is their own scheme, so filename matching alone would usually fail.
      const next: Row[] = data.rows.map((r: Row) =>
        kmz.length === 1 && r.status === "unmatched" && r.reason === "no-match"
          ? { ...r, propertyId, propertyName, status: "ready" as const }
          : r,
      );
      setRows(next);
      setMovePin(Object.fromEntries(next.map((r) => [r.file, true])));
    } catch {
      toast.error("Could not read those files.");
    } finally {
      setPhase(null);
    }
  }

  async function commit() {
    const items = ready.filter((r) => r.propertyId);
    if (!items.length) return;
    setPhase("attaching");
    try {
      const body = new FormData();
      for (const f of filesRef.current) body.append("files", f);
      body.append(
        "instructions",
        JSON.stringify(items.map((r) => ({ propertyId: r.propertyId, file: r.file, movePin: movePin[r.file] ?? true }))),
      );
      const res = await fetch("/api/property-boundary/commit", { method: "POST", body });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error ?? "Could not attach those boundaries.");
        return;
      }
      const failed = data.results.filter((r: { ok: boolean }) => !r.ok);
      const ok = data.results.length - failed.length;
      if (ok) toast.success(`${ok} boundar${ok > 1 ? "ies" : "y"} attached`);
      for (const f of failed) toast.error(`${f.file}: ${f.error}`);
      setRows(null);
      filesRef.current = [];
      router.refresh();
    } catch {
      toast.error("Could not attach those boundaries.");
    } finally {
      setPhase(null);
    }
  }

  return (
    // No card shell: this renders as the footer action of the Parcel panel, which already
    // owns the border, background and padding. A nested card would double every edge.
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
            Land Boundary
          </span>
          <p className="mt-1 text-[13px] text-slate-500">
            {hasBoundary
              ? "Boundary on file. Uploading another KMZ replaces it."
              : "Upload the KMZ for this property to draw its exact land dimensions on the map."}
          </p>
          {/* Dropping several KMZ files is allowed and useful (loading a whole portfolio at once),
              but matching is org-wide — so a file for a DIFFERENT property lands there, not here.
              Say so before the drop, or the row list reads as a bug. */}
          <p className="mt-1 text-[12px] text-slate-400">
            You can drop several files at once. Each one is matched by filename to its own
            property, so a file for another property will attach there.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-val-heading transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Choose KMZ
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".kmz,application/vnd.google-earth.kmz"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/* Drop zone stays visible so bulk drop is discoverable, not a hidden affordance. */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
        className={cn(
          "mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-[13px] transition-colors",
          dragging && !busy ? "border-[var(--val-primary-dark)] bg-blue-50/50" : "border-slate-200 text-slate-400",
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
        {phase === "reading"
          ? "Reading…"
          : phase === "attaching"
            ? "Attaching…"
            : "Drop .kmz files to preview them — nothing is saved until you attach"}
      </div>

      {/* Area: two numbers, never merged. The declared figure is what the official document says;
          the measured figure is what the ring encloses. Both come from government sources, so
          neither is "wrong" — the discrepancy is the finding. */}
      {hasBoundary && measuredM2 != null && declaredM2 > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[12px]">
          <span className="text-slate-500">
            Declared <span className="font-semibold text-val-heading tabular-nums">{fmt(declaredM2)} m²</span>
          </span>
          <span className="text-slate-500">
            Measured <span className="font-semibold text-val-heading tabular-nums">{fmt(measuredM2)} m²</span>
          </span>
          <AreaDelta declared={declaredM2} measured={measuredM2} />
        </div>
      )}

      {/* Review table — one row per dropped file. */}
      {rows && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="pb-2 font-semibold">File</th>
                <th className="pb-2 font-semibold">Property</th>
                <th className="pb-2 font-semibold">Area</th>
                <th className="pb-2 font-semibold">Pin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.file} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-3 font-mono text-[11px] text-slate-600">{r.file}</td>
                  <td className="py-2 pr-3">
                    {r.status === "ready" ? (
                      <span className="text-val-heading">
                        {r.propertyName || r.propertyId}
                        {r.replaced && <span className="ml-1 text-slate-400">(replaces)</span>}
                      </span>
                    ) : (
                      <span className={cn("inline-flex items-center gap-1", r.status === "error" ? "text-red-600" : "text-amber-600")}>
                        <FileWarning className="size-3" />
                        {r.status === "error" ? r.error : r.reason === "ambiguous" ? "Several properties match" : "No matching property"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {r.status !== "ready" ? (
                      <span className="text-slate-300">—</span>
                    ) : r.areaDiffPct == null ? (
                      <span className="text-slate-400">{fmt(r.sizeM2 ?? 0)} m² (no declared area)</span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-slate-600">{fmt(r.sizeM2 ?? 0)} m²</span>
                        <AreaDelta declared={r.declaredM2 ?? 0} measured={r.sizeM2 ?? 0} />
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    {r.status !== "ready" ? (
                      <span className="text-slate-300">—</span>
                    ) : !r.pinMoved ? (
                      <span className="text-slate-400">unchanged</span>
                    ) : (
                      // -my-1 py-1 grows the hit area to ~24px without moving the row.
                      <label className="-my-1 inline-flex cursor-pointer items-center gap-1.5 py-1">
                        <input
                          type="checkbox"
                          checked={movePin[r.file] ?? true}
                          onChange={(e) => setMovePin({ ...movePin, [r.file]: e.target.checked })}
                          className="size-3.5 accent-[var(--val-primary-dark)]"
                        />
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <MapPin className="size-3" />
                          move {fmt(r.pinShiftM ?? 0)} m
                        </span>
                      </label>
                    )}
                    {/* The pin must end up ON the land. Unticking the move keeps a pin that the
                        uploaded ring does not contain — say so, and name the action that fixes it,
                        rather than letting an off-parcel pin through unremarked. */}
                    {r.status === "ready" && r.pinInside === false && (
                      <span className="mt-1 block text-[11px] text-red-600">
                        {movePin[r.file] ?? true
                          ? "current pin is outside this boundary — ticked above to move it inside"
                          : "current pin is outside this boundary — edit the pin location on the map to fix it"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(ready.some((r) => r.pinMoved) || ready.some((r) => Math.abs(r.areaDiffPct ?? 0) > 5)) && (
            <p className="mt-3 flex items-start gap-1.5 text-[12px] text-amber-700">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {ready.some((r) => r.pinMoved) &&
                  `The ${ready.filter((r) => r.pinMoved).length === 1 ? "polygon centre" : "polygon centres"} differ from the current ${
                    ready.filter((r) => r.pinMoved).length === 1 ? "pin" : "pins"
                  } — untick to keep ${ready.filter((r) => r.pinMoved).length === 1 ? "it" : "them"}. `}
                {ready.some((r) => Math.abs(r.areaDiffPct ?? 0) > 5) &&
                  "Some measured areas differ from the declared area by more than 5%. The boundary is still saved."}
              </span>
            </p>
          )}

          {needsPick > 0 && (
            <p className="mt-2 text-[12px] text-amber-700">
              {needsPick} file{needsPick > 1 ? "s" : ""} matched more than one property — rename
              {needsPick > 1 ? "" : " that file"} to the property code and drop again.
            </p>
          )}

          {/* A file that could not be READ is a different failure from a file that could not be
              MATCHED, and only the second is the user's filename. Without this the table showed a red
              reason and no way forward, so the only route was to guess that you should pick the file
              again. Name the fix and offer it. */}
          {rows.some((r) => r.status === "error") && (
            <p className="mt-3 flex items-start gap-1.5 text-[12px] text-red-700">
              <FileWarning className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {(() => {
                  const n = rows.filter((r) => r.status === "error").length;
                  return `${n} file${n > 1 ? "s" : ""} could not be read. Export the KMZ again from Google Earth and re-drop it.`;
                })()}
              </span>
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            {/* With nothing attachable there is no action to take, so the primary button becomes the
                one that IS useful: pick another file. A disabled "Attach 0 boundaries" is a dead
                control with a nonsense label — it states a count and offers nothing. */}
            {ready.length > 0 ? (
              <button
                type="button"
                onClick={() => void commit()}
                disabled={busy}
                className="rounded-lg bg-[var(--val-primary-dark)] px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {phase === "attaching" ? "Attaching…" : `Attach ${ready.length} boundar${ready.length === 1 ? "y" : "ies"}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="rounded-lg bg-[var(--val-primary-dark)] px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                Choose another file
              </button>
            )}
            <button
              type="button"
              onClick={() => { setRows(null); filesRef.current = []; }}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-4 py-1.5 text-[12px] font-semibold text-val-heading transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The declared-vs-measured delta. Amber past ±5%: the reference set sits at a uniform +0.7%
 * (projection difference), so 5% is safely above the noise floor and only real anomalies trip it.
 * Never says which number is correct — both come from government sources.
 */
function AreaDelta({ declared, measured }: { declared: number; measured: number }) {
  if (declared <= 0) return null;
  const pct = ((measured - declared) / declared) * 100;
  const big = Math.abs(pct) > 5;
  const sign = pct > 0 ? "+" : "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        big ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500",
      )}
      title={
        big
          ? "The polygon measures a different area than the declared figure. Both come from official sources — neither has been chosen as correct."
          : undefined
      }
    >
      {big ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
      {sign}
      {pct.toFixed(1)}%
    </span>
  );
}
