"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmAction } from "@/components/ui/confirm-action";
import {
  ScanLine,
  FileEdit,
  FileSpreadsheet,
  ChevronLeft,
  Trash2,
  Home,
  Building2,
  Store,
  LandPlot,
  Factory,
  HardHat,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { scanToForm } from "@/app/_shared/add-property/_lib/scan-to-form";
import type { ExtractedProperty } from "@/lib/services/document-scan";
import { ALLOWED_MIME, MAX_BYTES } from "@/lib/upload-constants";

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
  onScanComplete,
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
  // Called after a document scan succeeds: the extracted wizard-form patch, the scanned File to
  // attach, and the names of the fields the self-consistency runs disagreed on (low-confidence, for
  // the wizard to flag). The parent prefills the wizard and stages the file into the draft.
  onScanComplete: (patch: Partial<FormData>, file: File, lowConfidence: string[]) => void;
  onLoadDemo?: () => void;
}) {
  const router = useRouter();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  function handleManual() {
    setForm({ ...form, method: "manual" });
    onContinue();
  }

  // "Scan a document": the merged photo/upload action. Validate against the same allowlist the draft
  // staging enforces (so anything that scans can also attach), POST the file to the AI scan endpoint,
  // and hand the extracted fields + the file up to the parent to prefill the wizard.
  async function handleScanChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error("That file type isn't supported. Use a PDF or image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large. Maximum size is 10 MB.");
      return;
    }
    setScanning(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/add-property/scan", { method: "POST", body });
      const json = (await res.json()) as {
        ok: boolean;
        extracted?: ExtractedProperty;
        lowConfidence?: string[];
        error?: string;
      };
      if (!res.ok || !json.ok || !json.extracted) {
        toast.error(json.error ?? "Could not read that document. Please try again or enter the details manually.");
        return;
      }
      onScanComplete(scanToForm(json.extracted), file, json.lowConfidence ?? []);
    } catch {
      toast.error("Could not read that document. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  const methods = [
    {
      key: "import" as const,
      badge: "New",
      badgeBg: DS.blueTint,
      badgeColor: DS.blue,
      icon: FileSpreadsheet,
      iconBg: DS.blueTint,
      iconColor: DS.blue,
      title: "Import from spreadsheet",
      desc: "Have a Google Sheet or Excel of your properties? Upload it — we'll map and add them all",
      onClick: () => { if (!scanning) router.push("/add-property/import"); },
      disabled: scanning,
    },
    {
      key: "scan" as const,
      badge: "New",
      badgeBg: DS.blueTint,
      badgeColor: DS.blue,
      icon: ScanLine,
      iconBg: DS.blueTint,
      iconColor: DS.blue,
      title: "Scan a document",
      desc: "Photograph or upload a title deed, lease, or listing — AI reads and fills in the details",
      onClick: () => { if (!scanning) scanInputRef.current?.click(); },
      disabled: scanning,
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
      onClick: () => { if (!scanning) handleManual(); },
      disabled: scanning,
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

      {/* One input for the merged "Scan a document" action. On mobile the OS picker offers camera
          and files; on desktop it's file browse. accept covers PDF + images. */}
      <input
        ref={scanInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleScanChange}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {methods.map((m, i) => (
          <MethodCard key={m.key} method={m} isSelected={false} index={i} disabled={m.disabled} />
        ))}
      </div>

      {scanning && (
        <div
          className="mb-8 flex items-center gap-3 rounded-xl border px-4 py-3"
          style={{ borderColor: DS.blue, background: DS.blueTint }}
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: DS.blue }} />
          <span style={{ fontSize: 14, color: DS.textPrimary }}>
            Reading your document and filling in the details…
          </span>
        </div>
      )}

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
                title={d.title}
                propertyType={d.form.propertyType}
                timestamp={formatRelativeTime(d.updatedAt)}
                onResume={() => onResumeDraft(d.id)}
                onConfirmDelete={() => onDeleteDraft(d.id)}
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
  title,
  propertyType,
  timestamp,
  onResume,
  onConfirmDelete,
  showDivider,
  index,
}: {
  title: string;
  propertyType?: string;
  timestamp: string;
  onResume: () => void;
  // Removes the draft from localStorage. Wrapped in a confirm dialog below.
  onConfirmDelete: () => void;
  showDivider: boolean;
  index: number;
}) {
  const TypeIcon = propertyType ? PROPERTY_TYPE_ICONS[propertyType] : null;
  const animDelay = `${index * 55}ms`;

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
      {/* Confirm tier: deleting a draft is irreversible (it lives only in this
          browser's localStorage, so there's nothing to restore). The dialog
          stops a row-click from resuming the draft, then removes it on confirm. */}
      <ConfirmAction
        tier="confirm"
        title={`Delete "${title}"?`}
        description="This removes the saved draft from this browser. This can't be undone."
        confirmLabel="Delete draft"
        successMessage="Draft deleted"
        onConfirm={onConfirmDelete}
      >
        <button
          onClick={(e) => e.stopPropagation()}
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
      </ConfirmAction>
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
