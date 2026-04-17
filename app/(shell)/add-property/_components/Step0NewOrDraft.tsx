"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, FileEdit, ChevronLeft, Trash2 } from "lucide-react";
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
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  onContinue: () => void;
  drafts: PropertyDraftSummary[];
  localDrafts: DraftRecord[];
  draftsLoading?: boolean;
  onResumeDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
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
      badge: "Recommended",
      badgeBg: DS.blueTint,
      badgeColor: DS.blue,
      icon: Camera,
      iconBg: DS.blueTint,
      iconColor: DS.blue,
      title: "Take a photo",
      desc: "Scan a title deed, lease, or listing — we'll read the details automatically",
      onClick: () => photoInputRef.current?.click(),
    },
    {
      key: "upload" as const,
      badge: "PDF or image",
      badgeBg: DS.surfaceElevated,
      badgeColor: DS.textSecondary,
      icon: Upload,
      iconBg: DS.surfaceElevated,
      iconColor: DS.textPrimary,
      title: "Upload document",
      desc: "Drop a PDF or image from your device — we'll pull the details for you",
      onClick: () => uploadInputRef.current?.click(),
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
        className="flex items-center gap-1 mb-6"
        style={{ fontSize: 14, fontWeight: 500, color: DS.textSecondary }}
        onMouseEnter={(e) => (e.currentTarget.style.color = DS.textPrimary)}
        onMouseLeave={(e) => (e.currentTarget.style.color = DS.textSecondary)}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>

      <div className="mb-8">
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
        {methods.map((m) => (
          <MethodCard key={m.key} method={m} isSelected={form.method === m.key} />
        ))}
      </div>

      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: DS.textSecondary,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Resume a draft
      </p>

      <div
        style={{
          background: DS.surfaceBase,
          borderRadius: 12,
          border: `1px solid ${DS.border}`,
          minHeight: "5rem",
          overflow: "hidden",
        }}
      >
        {draftsLoading ? (
          <DraftSkeleton />
        ) : !hasDrafts ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 gap-1">
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
                timestamp={formatRelativeTime(d.updatedAt)}
                onResume={() => onResumeDraft(d.id)}
                onRequestDelete={() => setPendingDeleteId(d.id)}
                onConfirmDelete={() => confirmDelete(d.id)}
                onCancelDelete={() => setPendingDeleteId(null)}
                isConfirming={pendingDeleteId === d.id}
                showDivider={i < localDrafts.length - 1 || serverOnlyDrafts.length > 0}
              />
            ))}
            {serverOnlyDrafts.map((d, i) => (
              <li
                key={d.id}
                className="flex items-center"
                style={{
                  padding: "14px 20px",
                  borderBottom: i < serverOnlyDrafts.length - 1 ? `1px solid ${DS.border}` : "none",
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
    </div>
  );
}

function MethodCard({
  method,
  isSelected,
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
}) {
  return (
    <button
      onClick={method.onClick}
      className="text-left w-full flex flex-col"
      style={{
        background: isSelected ? DS.blueTint : DS.surfaceBase,
        borderRadius: 16,
        padding: "20px",
        border: isSelected ? `2px solid ${DS.blue}` : `1px solid ${DS.border}`,
        transition: "border-color 0.15s ease, background 0.15s ease",
        fontFamily: DS.font,
        cursor: "pointer",
        minHeight: 168,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = "#93C5FD";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = DS.border;
        }
      }}
    >
      <method.icon
        style={{
          width: 22,
          height: 22,
          color: isSelected ? DS.blue : method.iconColor,
          marginBottom: 16,
          flexShrink: 0,
        }}
      />
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: DS.textPrimary,
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
          color: DS.textSecondary,
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
  );
}

function DraftItem({
  id,
  title,
  timestamp,
  onResume,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  isConfirming,
  showDivider,
}: {
  id: string;
  title: string;
  timestamp: string;
  onResume: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  isConfirming: boolean;
  showDivider: boolean;
}) {
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
            }}
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
      className="flex items-center cursor-pointer"
      style={{
        padding: "14px 20px",
        borderBottom: showDivider ? `1px solid ${DS.border}` : "none",
        transition: "background 0.1s ease",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = DS.surfaceElevated)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
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
          transition: "background 0.1s ease, color 0.1s ease",
          cursor: "pointer",
          fontFamily: DS.font,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = DS.dangerTint;
          (e.currentTarget as HTMLElement).style.color = DS.danger;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = DS.textDisabled;
        }}
        aria-label="Delete draft"
      >
        <Trash2 style={{ width: 15, height: 15 }} />
      </button>
    </li>
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
