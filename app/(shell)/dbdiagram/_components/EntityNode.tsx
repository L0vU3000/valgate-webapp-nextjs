"use client";
import { Fragment, memo, useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { IntrospectedEntity, IntrospectedField } from "../_lib/introspect";
import { rowYFor } from "../_lib/groups";

export type EntityNodeData = {
  entity: IntrospectedEntity;
  color: string;
  dimmed: boolean;
  activeFieldName: string | null;
  onColorPick: (entityName: string) => void;
  onFieldClick: (entityName: string, fieldName: string) => void;
};

type RowClick = (entityName: string, fieldName: string) => void;

const TYPE_LABEL: Record<string, string> = {
  string: "str",
  number: "num",
  boolean: "bool",
  enum: "enum",
  array: "arr",
  object: "obj",
  literal: "lit",
  record: "rec",
  union: "union",
  unknown: "?",
};

function FieldRow({
  entityName,
  field,
  isActive,
  onFieldClick,
}: {
  entityName: string;
  field: IntrospectedField;
  isActive: boolean;
  onFieldClick: RowClick;
}) {
  const isFk = Boolean(field.fkTarget);
  const isClickable = isFk || field.isPK;
  const handleClick = useCallback(() => {
    onFieldClick(entityName, field.name);
  }, [entityName, field.name, onFieldClick]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onFieldClick(entityName, field.name);
      }
    },
    [entityName, field.name, onFieldClick],
  );
  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      className={`flex h-[22px] items-center justify-between gap-2 px-3 text-[11px] leading-none transition-colors ${
        isClickable ? "cursor-pointer" : ""
      } ${
        isActive
          ? "bg-sky-100 ring-1 ring-inset ring-sky-400"
          : isClickable
            ? "hover:bg-neutral-50"
            : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {field.isPK && (
          <span
            title="Primary key"
            className="rounded bg-amber-200 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-amber-900"
          >
            pk
          </span>
        )}
        {isFk && !field.isPK && (
          <span
            title={`FK → ${field.fkTarget}`}
            className="rounded bg-sky-200 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-sky-900"
          >
            fk
          </span>
        )}
        <span
          className={`truncate ${isActive ? "font-semibold text-sky-900" : "font-medium"} ${
            field.required || isActive ? "text-neutral-900" : "text-neutral-500"
          }`}
        >
          {field.name}
          {!field.required && "?"}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-neutral-500">
        {field.enumValues && field.enumValues.length > 0 ? (
          <span title={field.enumValues.join(" | ")}>
            enum({field.enumValues.length})
          </span>
        ) : (
          <span>{TYPE_LABEL[field.type] ?? field.type}</span>
        )}
      </div>
    </div>
  );
}

const MemoFieldRow = memo(FieldRow, (prev, next) => {
  return (
    prev.entityName === next.entityName &&
    prev.field === next.field &&
    prev.isActive === next.isActive &&
    prev.onFieldClick === next.onFieldClick
  );
});

const HANDLE_FK = "!w-2 !h-2 !min-w-0 !min-h-0 !bg-sky-500 !border-0";
const HANDLE_PK = "!w-2 !h-2 !min-w-0 !min-h-0 !bg-amber-500 !border-0";

function FieldHandlesImpl({
  field,
  rowIndex,
}: {
  field: IntrospectedField;
  rowIndex: number;
}) {
  const style = useMemo(() => ({ top: rowYFor(rowIndex) }), [rowIndex]);
  if (field.isPK) {
    return (
      <>
        <Handle
          id={`${field.name}-L`}
          type="source"
          position={Position.Left}
          style={style}
          className={HANDLE_PK}
        />
        <Handle
          id={`${field.name}-R`}
          type="source"
          position={Position.Right}
          style={style}
          className={HANDLE_PK}
        />
      </>
    );
  }
  if (field.fkTarget) {
    return (
      <>
        <Handle
          id={`${field.name}-L`}
          type="target"
          position={Position.Left}
          style={style}
          className={HANDLE_FK}
        />
        <Handle
          id={`${field.name}-R`}
          type="target"
          position={Position.Right}
          style={style}
          className={HANDLE_FK}
        />
      </>
    );
  }
  return null;
}

const FieldHandles = memo(FieldHandlesImpl, (prev, next) => {
  return prev.field === next.field && prev.rowIndex === next.rowIndex;
});

function EntityNodeImpl({ data }: NodeProps) {
  const {
    entity,
    color,
    dimmed,
    activeFieldName,
    onColorPick,
    onFieldClick,
  } = data as unknown as EntityNodeData;
  const isHub = entity.name === "properties";
  const isStub = entity.isStub;
  return (
    <div
      className={`group relative w-[260px] rounded-lg border bg-white shadow-sm transition-opacity duration-200 ${
        isHub
          ? "border-neutral-900 ring-2 ring-amber-400"
          : "border-neutral-300"
      }`}
      style={{ opacity: dimmed ? 0.35 : 1 }}
      onContextMenu={(e) => {
        e.preventDefault();
        onColorPick(entity.name);
      }}
    >
      {entity.fields.map((field, idx) => (
        <Fragment key={`h-${field.name}`}>
          <FieldHandles field={field} rowIndex={idx} />
        </Fragment>
      ))}

      <div
        className="flex h-[54px] items-center justify-between rounded-t-lg border-b border-neutral-200 px-3"
        style={{ backgroundColor: color }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {isHub && <span className="text-[11px]">★</span>}
            <span className="truncate text-[12px] font-semibold text-neutral-900">
              {entity.name}
            </span>
          </div>
          <div className="text-[10px] text-neutral-700/80">
            {entity.fieldCount} field{entity.fieldCount === 1 ? "" : "s"}
            {isStub && " · stub"}
          </div>
        </div>
      </div>
      <div className="divide-y divide-neutral-100">
        {entity.fields.map((f) => (
          <MemoFieldRow
            key={f.name}
            entityName={entity.name}
            field={f}
            isActive={activeFieldName === f.name}
            onFieldClick={onFieldClick}
          />
        ))}
        {entity.note && (
          <div className="bg-neutral-50 px-3 py-1.5 text-[10px] italic text-neutral-500">
            {entity.note}
          </div>
        )}
      </div>
    </div>
  );
}

export const EntityNode = memo(EntityNodeImpl, (prev, next) => {
  const a = prev.data as unknown as EntityNodeData;
  const b = next.data as unknown as EntityNodeData;
  return (
    a.entity === b.entity &&
    a.color === b.color &&
    a.dimmed === b.dimmed &&
    a.activeFieldName === b.activeFieldName &&
    a.onColorPick === b.onColorPick &&
    a.onFieldClick === b.onFieldClick &&
    prev.id === next.id &&
    prev.dragging === next.dragging &&
    prev.selected === next.selected
  );
});
