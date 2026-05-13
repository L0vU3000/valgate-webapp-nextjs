"use client";
import { memo } from "react";
import { type NodeProps } from "@xyflow/react";

export type GroupFrameData = {
  label: string;
  width: number;
  height: number;
  borderColor: string;
  bgColor: string;
  labelColor: string;
};

function GroupFrameImpl({ data }: NodeProps) {
  const { label, width, height, borderColor, bgColor, labelColor } =
    data as unknown as GroupFrameData;
  return (
    <div
      className="rounded-2xl border-2 border-dashed"
      style={{
        width,
        height,
        borderColor,
        backgroundColor: bgColor,
        pointerEvents: "none",
      }}
    >
      <div
        className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: labelColor }}
      >
        {label}
      </div>
    </div>
  );
}

export const GroupFrame = memo(GroupFrameImpl, (prev, next) => {
  const a = prev.data as unknown as GroupFrameData;
  const b = next.data as unknown as GroupFrameData;
  return (
    a.label === b.label &&
    a.width === b.width &&
    a.height === b.height &&
    a.borderColor === b.borderColor &&
    a.bgColor === b.bgColor &&
    a.labelColor === b.labelColor
  );
});
