"use client";
import { useMemo, useState } from "react";
import type { IntrospectedEntity } from "../_lib/introspect";
import { PRESET_COLORS } from "../_lib/default-layout";

export type AnnotationPanelProps = {
  entities: IntrospectedEntity[];
  onPanTo: (entityName: string) => void;
  onAddNote: () => void;
  onReset: () => void;
  onPickColor: (entityName: string, color: string) => void;
  colorPickFor: string | null;
  saving: boolean;
};

export function AnnotationPanel({
  entities,
  onPanTo,
  onAddNote,
  onReset,
  onPickColor,
  colorPickFor,
  saving,
}: AnnotationPanelProps) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter((e) => e.name.toLowerCase().includes(q));
  }, [entities, filter]);

  return (
    <aside className="absolute right-0 top-0 z-10 flex h-full w-[260px] flex-col border-l border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
          Entities
        </h2>
        <span className="text-[10px] text-neutral-500">
          {saving ? "saving…" : "saved"}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-b border-neutral-200 px-4 py-3">
        <button
          type="button"
          onClick={onAddNote}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
        >
          + Add note
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
        >
          Reset layout
        </button>
        <p className="text-[10px] leading-relaxed text-neutral-500">
          Drag cards to reposition. Right-click an entity for the color picker.
          Double-click a note to edit it.
        </p>
      </div>

      {colorPickFor && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="mb-2 text-[11px] font-semibold text-neutral-700">
            Color · {colorPickFor}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                type="button"
                key={color}
                aria-label={`Pick ${color}`}
                className="h-6 w-6 rounded border border-neutral-300 hover:scale-110"
                style={{ backgroundColor: color }}
                onClick={() => onPickColor(colorPickFor, color)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-neutral-200 px-4 py-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter entities…"
          className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-neutral-500"
        />
      </div>

      <ul className="flex-1 overflow-auto py-1">
        {filtered.map((entity) => (
          <li key={entity.name}>
            <button
              type="button"
              onClick={() => onPanTo(entity.name)}
              className="flex w-full items-center justify-between px-4 py-1.5 text-left text-xs hover:bg-neutral-100"
            >
              <span className="truncate text-neutral-800">{entity.name}</span>
              <span className="text-[10px] text-neutral-500">
                {entity.fieldCount}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
