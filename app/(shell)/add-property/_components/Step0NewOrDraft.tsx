"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  FileEdit,
  ChevronLeft,
  Trash2,
  Home,
  Building2,
  Store,
  LandPlot,
  Factory,
  HardHat,
  MoreHorizontal,
} from "lucide-react";

const PROPERTY_TYPE_ICONS: Record<string, React.ElementType> = {
  residential: Home,
  commercial: Building2,
  "multi-unit": Building2,
  retail: Store,
  land: LandPlot,
  industrial: Factory,
  construction: HardHat,
  other: MoreHorizontal,
};

const PROPERTY_TYPE_GRADIENTS: Record<string, string> = {
  residential: "linear-gradient(135deg, #ff6b6b 0%, #ff8c42 50%, #ffd23f 100%)",
  commercial: "linear-gradient(135deg, #1e3799 0%, #0652dd 50%, #1289a7 100%)",
  "multi-unit": "linear-gradient(135deg, #6c2bd9 0%, #a855f7 50%, #ec4899 100%)",
  retail: "linear-gradient(135deg, #f72585 0%, #ff6b35 50%, #ffd60a 100%)",
  land: "linear-gradient(135deg, #1a7a4a 0%, #22c55e 50%, #a3e635 100%)",
  industrial: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #67e8f9 100%)",
  construction: "linear-gradient(135deg, #b45309 0%, #f59e0b 50%, #fde047 100%)",
  other: "linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)",
};

import { toast } from "sonner";
import type { PropertyDraftSummary } from "@/lib/data/add-property-page";
import type { FormData, DraftRecord } from "./types";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const DS = {
  textPrimary: "#14181B",
  textSecondary: "#515D66",
  textDisabled: "#ACB4BC",
  blue: "#2563EB",
  blueHover: "#1D4ED8",
  danger: "#E11D48",
  dangerTint: "#FFF1F2",
  surfaceBase: "#FFFFFF",
  surfaceElevated: "#F5F6F7",
  blueTint: "#EFF6FF",
  border: "#D1D5DB",
  cardShadow:
    "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px",
  hoverShadow: "rgba(0,0,0,0.08) 0px 4px 12px",
  selectedShadow:
    "rgba(37,99,235,1) 0px 0px 0px 2px, rgba(0,0,0,0.08) 0px 4px 12px",
  font: "Airbnb Cereal VF, Circular, -apple-system, system-ui, Roboto, Helvetica Neue, sans-serif",
} as const;

export function Step0NewOrDraft({
  form,
  setForm,
  onContinue,
  drafts,
  localDrafts,
  draftsLoading,
  onResumeDraft,
  onDeleteDraft,
  onLoadDemo,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  onContinue: () => void;
  drafts: PropertyDraftSummary[];
  localDrafts: DraftRecord[];
  draftsLoading?: boolean;
  onResumeDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onLoadDemo?: () => void;
}) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function handleManual() {
    setForm({ ...form, method: "manual" });
    onContinue();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File too large. Maximum size is 20 MB.");
      e.target.value = "";
      return;
    }
    setForm({ ...form, method: "photo", photoFile: file, photoFileName: file.name });
    onContinue();
  }

  function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File too large. Maximum size is 20 MB.");
      e.target.value = "";
      return;
    }
    setForm({ ...form, method: "upload", uploadFile: file, uploadFileName: file.name });
    onContinue();
  }

  function confirmDelete(id: string) {
    onDeleteDraft(id);
    setPendingDeleteId(null);
  }

  const methods = [
    {
      key: "photo" as const,
      badge: "Coming soon",
      badgeBg: DS.surfaceElevated,
      badgeColor: DS.textDisabled,
      icon: Camera,
      iconBg: DS.surfaceElevated,
      iconColor: DS.textDisabled,
      title: "Take a photo",
      desc: "Scan a title deed, lease, or listing — we'll read the details automatically",
      onClick: () => photoInputRef.current?.click(),
      disabled: true,
    },
    {
      key: "upload" as const,
      badge: "Coming soon",
      badgeBg: DS.surfaceElevated,
      badgeColor: DS.textDisabled,
      icon: Upload,
      iconBg: DS.surfaceElevated,
      iconColor: DS.textDisabled,
      title: "Upload document",
      desc: "Drop a PDF or image from your device — we'll pull the details for you",
      onClick: () => uploadInputRef.current?.click(),
      disabled: true,
    },
    {
      key: "manual" as const,
      badge: "No file needed",
      badgeBg: DS.surfaceElevated,
      badgeColor: DS.textSecondary,
      icon: FileEdit,
      iconBg: DS.surfaceElevated,
      iconColor: DS.textPrimary,
      title: "Enter manually",
      desc: "No document? Answer a few questions step-by-step instead",
      onClick: handleManual,
      disabled: false,
    },
  ];

  const localIds = new Set(localDrafts.map((d) => d.id));
  const serverOnlyDrafts = drafts.filter((d) => !localIds.has(d.id));

  function formatRelativeTime(ms: number) {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const hasDrafts = localDrafts.length > 0 || serverOnlyDrafts.length > 0;

  return (
    <div className="max-w-[800px] mx-auto pt-8 pb-12" style={{ fontFamily: DS.font }}>
      <button
        onClick={() => router.push("/portfolio")}
        className="anim-enter flex items-center gap-1 mb-6"
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: DS.textSecondary,
          transition: "color 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
          animationDelay: "0ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = DS.textPrimary;
          (e.currentTarget as HTMLElement).style.transform = "translateX(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = DS.textSecondary;
          (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
        }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>

      <div className="anim-enter mb-8" style={{ animationDelay: "60ms" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: DS.textPrimary,
            lineHeight: 1.43,
            marginBottom: 8,
          }}
        >
          Add a property
        </h1>
        <p style={{ fontSize: 14, color: DS.textSecondary, lineHeight: 1.5 }}>
          Start fresh or pick up where you left off.
        </p>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleUploadChange}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {methods.map((m, i) => (
          <MethodCard key={m.key} method={m} isSelected={false} index={i} disabled={m.disabled} />
        ))}
      </div>

      <p
        className="anim-enter"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: DS.textSecondary,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 10,
          animationDelay: "310ms",
        }}
      >
        Resume a draft
      </p>

      <div
        className="anim-enter"
        style={{
          background: DS.surfaceBase,
          borderRadius: 12,
          border: `1px solid ${DS.border}`,
          minHeight: "5rem",
          overflow: "hidden",
          animationDelay: "350ms",
        }}
      >
        {draftsLoading ? (
          <DraftSkeleton />
        ) : !hasDrafts ? (
          <div className="anim-enter flex flex-col items-center justify-center py-10 px-6 gap-1">
            <p style={{ fontSize: 14, color: DS.textDisabled, textAlign: "center", lineHeight: 1.5 }}>
              No drafts yet.
            </p>
            <p style={{ fontSize: 13, color: DS.textDisabled, textAlign: "center" }}>
              Choose a method above to begin.
            </p>
          </div>
        ) : (
          <ul>
            {localDrafts.map((d, i) => (
              <DraftItem
                key={d.id}
                id={d.id}
                title={d.title}
                propertyType={d.form.propertyType}
                timestamp={formatRelativeTime(d.updatedAt)}
                onResume={() => onResumeDraft(d.id)}
                onRequestDelete={() => setPendingDeleteId(d.id)}
                onConfirmDelete={() => confirmDelete(d.id)}
                onCancelDelete={() => setPendingDeleteId(null)}
                isConfirming={pendingDeleteId === d.id}
                showDivider={i < localDrafts.length - 1 || serverOnlyDrafts.length > 0}
                index={i}
              />
            ))}
            {serverOnlyDrafts.map((d, i) => (
              <li
                key={d.id}
                className="anim-enter flex items-center"
                style={{
                  padding: "14px 20px",
                  borderBottom: i < serverOnlyDrafts.length - 1 ? `1px solid ${DS.border}` : "none",
                  animationDelay: `${(localDrafts.length + i) * 55}ms`,
                }}
              >
                <span
                  style={{ fontSize: 14, fontWeight: 500, color: DS.textPrimary }}
                  className="truncate flex-1"
                >
                  {d.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {onLoadDemo && (
        <div className="anim-enter mt-6 flex justify-center" style={{ animationDelay: "400ms" }}>
          <LoadDemoButton onClick={onLoadDemo} />
        </div>
      )}
    </div>
  );
}

function MethodCard({
  method,
  isSelected,
  index,
  disabled = false,
}: {
  method: {
    badge: string;
    badgeBg: string;
    badgeColor: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    desc: string;
    onClick: () => void;
  };
  isSelected: boolean;
  index: number;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isHovered = hovered && !disabled;
  const isPressed = pressed && !disabled;

  return (
    <div className="anim-enter h-full" style={{ animationDelay: `${130 + index * 70}ms` }}>
      <button
        onClick={() => { if (disabled) return; setHovered(false); setPressed(false); method.onClick(); }}
        onMouseEnter={() => { if (!disabled) setHovered(true); }}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => { if (!disabled) setPressed(true); }}
        onMouseUp={() => setPressed(false)}
        disabled={disabled}
        className="text-left w-full h-full flex flex-col"
        style={{
          background: disabled ? DS.surfaceElevated : isSelected ? DS.blueTint : DS.surfaceBase,
          borderRadius: 16,
          padding: "20px",
          border: isSelected
            ? `2px solid ${DS.blue}`
            : `1px solid ${isHovered ? "#93C5FD" : DS.border}`,
          transition:
            "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease, background 0.15s ease, box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: DS.font,
          cursor: disabled ? "not-allowed" : "pointer",
          minHeight: 168,
          opacity: disabled ? 0.55 : 1,
          transform: `scale(${isPressed ? 0.97 : isHovered ? 1.02 : 1})`,
          boxShadow: isSelected
            ? DS.selectedShadow
            : isHovered
            ? DS.hoverShadow
            : "none",
        }}
      >
        <method.icon
          style={{
            width: 22,
            height: 22,
            color: isSelected ? DS.blue : isHovered ? DS.textPrimary : method.iconColor,
            marginBottom: 16,
            flexShrink: 0,
            transform: isHovered ? "scale(1.12)" : "scale(1)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color 0.15s ease",
          }}
        />
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: disabled ? DS.textDisabled : DS.textPrimary,
            marginBottom: 6,
            letterSpacing: "-0.15px",
            lineHeight: 1.3,
          }}
        >
          {method.title}
        </p>
        <p
          style={{
            fontSize: 13,
            color: disabled ? DS.textDisabled : DS.textSecondary,
            lineHeight: 1.5,
            flex: 1,
          }}
        >
          {method.desc}
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: method.badgeColor,
            background: method.badgeBg,
            borderRadius: 10,
            padding: "3px 9px",
            display: "inline-block",
            marginTop: 14,
            lineHeight: 1.4,
            alignSelf: "flex-start",
          }}
        >
          {method.badge}
        </span>
      </button>
    </div>
  );
}

function DraftItem({
  id,
  title,
  propertyType,
  timestamp,
  onResume,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  isConfirming,
  showDivider,
  index,
}: {
  id: string;
  title: string;
  propertyType?: string;
  timestamp: string;
  onResume: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  isConfirming: boolean;
  showDivider: boolean;
  index: number;
}) {
  const TypeIcon = propertyType ? PROPERTY_TYPE_ICONS[propertyType] : null;
  const animDelay = `${index * 55}ms`;

  if (isConfirming) {
    return (
      <li
        style={{
          padding: "12px 20px",
          borderBottom: showDivider ? `1px solid ${DS.border}` : "none",
          background: DS.dangerTint,
          display: "flex",
          alignItems: "center",
          gap: 12,
          transition: "background 0.2s ease",
        }}
      >
        <span
          style={{ fontSize: 13, color: DS.textSecondary, flex: 1, lineHeight: 1.4 }}
          className="truncate"
        >
          Delete &ldquo;{title}&rdquo;? This can&apos;t be undone.
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCancelDelete}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: DS.textSecondary,
              padding: "5px 12px",
              borderRadius: 8,
              background: DS.surfaceBase,
              boxShadow: DS.cardShadow,
              cursor: "pointer",
              fontFamily: DS.font,
              transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1.04)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
          >
            Cancel
          </button>
          <button
            onClick={onConfirmDelete}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: DS.surfaceBase,
              padding: "5px 12px",
              borderRadius: 8,
              background: DS.danger,
              cursor: "pointer",
              fontFamily: DS.font,
              transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.04)";
              (e.currentTarget as HTMLElement).style.background = "#BE123C";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.background = DS.danger;
            }}
          >
            Delete
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      onClick={onResume}
      className="anim-enter flex items-center cursor-pointer"
      style={{
        padding: "14px 20px",
        borderBottom: showDivider ? `1px solid ${DS.border}` : "none",
        transition: "background 0.15s ease",
        animationDelay: animDelay,
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = DS.surfaceElevated)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      <span
        className="shrink-0 flex items-center justify-center mr-3"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: propertyType && PROPERTY_TYPE_GRADIENTS[propertyType]
            ? PROPERTY_TYPE_GRADIENTS[propertyType]
            : DS.surfaceElevated,
          flexShrink: 0,
        }}
      >
        {TypeIcon && (
          <TypeIcon style={{ width: 15, height: 15, color: propertyType ? "#fff" : DS.textSecondary }} />
        )}
      </span>
      <span
        style={{ fontSize: 14, fontWeight: 500, color: DS.textPrimary, lineHeight: 1.29 }}
        className="truncate flex-1 mr-3"
        title={title}
      >
        {title}
      </span>
      <span style={{ fontSize: 12, color: DS.textDisabled, flexShrink: 0, marginRight: 12 }}>
        {timestamp}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete();
        }}
        className="flex items-center justify-center shrink-0"
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          color: DS.textDisabled,
          background: "transparent",
          transition: "background 0.15s ease, color 0.15s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          cursor: "pointer",
          fontFamily: DS.font,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = DS.dangerTint;
          (e.currentTarget as HTMLElement).style.color = DS.danger;
          (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = DS.textDisabled;
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
        aria-label="Delete draft"
      >
        <Trash2 style={{ width: 15, height: 15 }} />
      </button>
    </li>
  );
}

function LoadDemoButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: 12,
        fontWeight: 500,
        color: hovered ? DS.textSecondary : DS.textDisabled,
        padding: "6px 14px",
        borderRadius: 8,
        border: `1px dashed ${hovered ? DS.textDisabled : DS.border}`,
        background: "transparent",
        cursor: "pointer",
        fontFamily: DS.font,
        letterSpacing: "0.02em",
        transition: "color 0.15s ease, border-color 0.15s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hovered ? "scale(1.03)" : "scale(1)",
      }}
    >
      Load demo data →
    </button>
  );
}

function DraftSkeleton() {
  return (
    <ul>
      {[1, 2].map((i) => (
        <li
          key={i}
          className="flex items-center animate-pulse"
          style={{
            padding: "14px 20px",
            borderBottom: i < 2 ? `1px solid ${DS.border}` : "none",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: DS.surfaceElevated,
              flexShrink: 0,
              marginRight: 12,
            }}
          />
          <div
            style={{
              height: 14,
              borderRadius: 7,
              background: DS.surfaceElevated,
              flex: 1,
              marginRight: 12,
            }}
          />
          <div
            style={{
              height: 12,
              width: 40,
              borderRadius: 6,
              background: DS.surfaceElevated,
              flexShrink: 0,
              marginRight: 12,
            }}
          />
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: DS.surfaceElevated,
              flexShrink: 0,
            }}
          />
        </li>
      ))}
    </ul>
  );
}
