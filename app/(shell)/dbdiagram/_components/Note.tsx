"use client";
import { memo, useState } from "react";
import { type NodeProps } from "@xyflow/react";

export type NoteData = {
  id: string;
  text: string;
  color?: string;
  onChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
};

function NoteImpl({ data }: NodeProps) {
  const { id, text, color, onChange, onDelete } = data as unknown as NoteData;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  return (
    <div
      className="group relative w-[200px] rounded shadow-md"
      style={{ backgroundColor: color ?? "#fef3c7" }}
    >
      <div className="flex items-center justify-between border-b border-amber-300/70 px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
          note
        </span>
        <button
          type="button"
          aria-label="Delete note"
          className="text-[12px] text-amber-900/60 hover:text-red-600"
          onClick={() => onDelete(id)}
        >
          ×
        </button>
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft !== text) onChange(id, draft);
          }}
          rows={3}
          className="w-full resize-none bg-transparent p-2 text-[11px] text-neutral-900 outline-none"
        />
      ) : (
        <div
          className="min-h-[48px] cursor-text whitespace-pre-wrap p-2 text-[11px] text-neutral-900"
          onDoubleClick={() => {
            setDraft(text);
            setEditing(true);
          }}
        >
          {text || "Double-click to edit…"}
        </div>
      )}
    </div>
  );
}

export const Note = memo(NoteImpl, (prev, next) => {
  const a = prev.data as unknown as NoteData;
  const b = next.data as unknown as NoteData;
  return (
    a.id === b.id &&
    a.text === b.text &&
    a.color === b.color &&
    a.onChange === b.onChange &&
    a.onDelete === b.onDelete &&
    prev.dragging === next.dragging &&
    prev.selected === next.selected
  );
});
