"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createFolder, updateFolder, deleteFolder } from "@/app/actions/folders";
import { getDocumentFileUrl } from "../documents/actions";
import type { Property } from "@/lib/data/types/property";
import type { Document as DbDocument } from "@/lib/data/types/document";
import type { Folder as DbFolder } from "@/lib/data/types/folder";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import {
  FolderOpen,
  FolderPlus,
  FileText,
  Image,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Upload,
  CloudUpload,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  FolderInput,
  ChevronUp,
  Plus,
  MoreVertical,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { DocumentDetailView } from "@/components/property/DocumentDetailView";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBytes } from "@/lib/format";
import { DevFileButton } from "@/components/dev/DevFileButton";
import { createDummyPdf } from "@/lib/dev-tools";

type ViewMode = "list" | "grid";
type UploadStatus = "uploading" | "done" | "failed" | "queued";
type UploadTab = "all" | "uploading" | "failed" | "done";
// The sort order the user has chosen for the files list.
// "date-newest" is the default — most recently uploaded files appear first.
type SortOption = "date-newest" | "date-oldest" | "name-asc" | "name-desc" | "size-largest" | "size-smallest";

type UploadItem = {
  id: string;
  name: string;
  size: string;
  status: UploadStatus;
  progress: number;
  error?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Human-readable labels for each sort option, used in the sort dropdown button.
const SORT_LABELS: Record<SortOption, string> = {
  "date-newest":   "Date added — newest",
  "date-oldest":   "Date added — oldest",
  "name-asc":      "Name (A – Z)",
  "name-desc":     "Name (Z – A)",
  "size-largest":  "File size — largest",
  "size-smallest": "File size — smallest",
};

// Human-readable labels for each file type, used in the filter dropdown and active-filter chips.
const FILE_TYPE_LABELS: Record<string, string> = {
  "pdf":         "PDF",
  "image":       "Image",
  "spreadsheet": "Spreadsheet",
  "doc":         "Document",
};

// Human-readable labels for document categories (verifiesEntityType).
// Used in the filter dropdown and in active-filter chip labels.
const CATEGORY_LABELS: Record<string, string> = {
  "ownership-record":  "Verifies Ownership",
  "financials":        "Verifies Financials",
  "location-identity": "Verifies Location",
  "rental":            "Verifies Rental",
  "estate-plan":       "Verifies Estate",
};

const ENTITY_TYPE_CHIP: Record<string, { label: string; cls: string }> = {
  "ownership-record": {
    label: "Verifies Ownership",
    cls: "bg-emerald-50 text-emerald-700",
  },
  "financials": {
    label: "Verifies Financials",
    cls: "bg-emerald-50 text-emerald-700",
  },
  "location-identity": {
    label: "Verifies Location",
    cls: "bg-emerald-50 text-emerald-700",
  },
  "rental": {
    label: "Verifies Rental",
    cls: "bg-emerald-50 text-emerald-700",
  },
  "estate-plan": {
    label: "Verifies Estate",
    cls: "bg-emerald-50 text-emerald-700",
  },
};

type FileEntry = {
  id: string;
  name: string;
  type: string;
  icon: React.ElementType;
  iconClass: string;
  thumb: string | null;
  folderId: string | undefined;
  folder: string;
  size: string;
  date: string;
  // Raw values kept alongside the formatted display strings so we can sort
  // reliably without trying to parse human-readable strings like "2.4 MB".
  rawDate: Date;
  rawSizeBytes: number;
  verifiesEntityType?: string;
};

function getFileIconStyle(doc: DbDocument): { type: string; icon: React.ElementType; iconClass: string } {
  // Derive extension from stored field, falling back to the filename itself.
  const ext = (doc.extension ?? doc.name.split(".").pop() ?? "").toLowerCase();
  if (doc.kind === "photo" || ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" || ext === "webp" || ext === "svg") {
    return { type: "image", icon: Image, iconClass: "text-emerald-600" };
  }
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    return { type: "spreadsheet", icon: FileSpreadsheet, iconClass: "text-emerald-700" };
  }
  if (ext === "pdf") {
    return { type: "pdf", icon: FileText, iconClass: "text-rose-500" };
  }
  return { type: "doc", icon: FileText, iconClass: "text-blue-600" };
}


type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};


function findPath(nodes: TreeNode[], targetId: string, acc: TreeNode[] = []): TreeNode[] | null {
  for (const node of nodes) {
    const path = [...acc, node];
    if (node.id === targetId) return path;
    if (node.children) {
      const result = findPath(node.children, targetId, path);
      if (result) return result;
    }
  }
  return null;
}

function buildFolderTree(folders: DbFolder[]): TreeNode[] {
  const byParent = new Map<string | undefined, DbFolder[]>();
  for (const f of folders) {
    const key = f.parentFolderId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(f);
  }
  function makeNodes(parentId?: string): TreeNode[] {
    return (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => {
        const children = makeNodes(f.id);
        return { id: f.id, label: f.name, ...(children.length ? { children } : {}) };
      });
  }
  const rootNodes = makeNodes(undefined);
  return [{ id: "root", label: "Documents", children: rootNodes.length ? rootNodes : undefined }];
}

function getFolderPath(folders: DbFolder[], targetId: string): DbFolder[] {
  const map = new Map(folders.map((f) => [f.id, f]));
  const path: DbFolder[] = [];
  let current = map.get(targetId);
  while (current) {
    path.unshift(current);
    current = current.parentFolderId ? map.get(current.parentFolderId) : undefined;
  }
  return path;
}

function FolderTreeItem({
  node,
  depth,
  selected,
  expanded,
  onSelect,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selected: string;
  expanded: Set<string>;
  onSelect: (node: TreeNode) => void;
  onToggle: (id: string) => void;
}) {
  const isSelected = selected === node.id;
  const isExpanded = expanded.has(node.id);
  const hasChildren = Boolean(node.children?.length);

  return (
    <>
      <div
        className={`flex items-center gap-2 py-2.5 pr-4 cursor-pointer transition-colors duration-100 select-none ${
          isSelected ? "bg-[#e4efff]" : "hover:bg-slate-50"
        }`}
        style={{ paddingLeft: `${16 + depth * 16}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors rounded"
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            tabIndex={0}
          >
            {isExpanded
              ? <ChevronDown className="w-[9px] h-[9px]" />
              : <ChevronRight className="w-[9px] h-[9px]" />
            }
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <FolderOpen className={`w-3.5 h-3.5 shrink-0 transition-colors duration-100 ${
          isSelected ? "text-[--val-primary-dark]" : "text-slate-400"
        }`} />
        <span className={`flex-1 text-[14px] leading-5 min-w-0 truncate transition-colors duration-100 ${
          isSelected
            ? "font-medium text-[--val-primary-dark]"
            : depth >= 2
            ? "text-slate-500"
            : "text-[--val-heading]"
        }`}>
          {node.label}
          {node.id === "root" && (
            <span className="ml-1.5 text-[11px] font-normal text-slate-400">(root)</span>
          )}
        </span>
        {isSelected && (
          <Check className="w-3 h-3 text-[--val-primary-dark] shrink-0 ml-auto" />
        )}
      </div>
      {hasChildren && isExpanded && node.children!.map((child) => (
        <FolderTreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-label={label ?? (checked ? "Deselect" : "Select")}
      aria-checked={indeterminate ? "mixed" : checked}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center shrink-0
        transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[--val-primary-dark]/30 ${
        checked || indeterminate
          ? "bg-[--val-primary-dark] border-[--val-primary-dark] shadow-sm"
          : "bg-white border-slate-300 hover:border-[--val-primary-dark]"
      }`}
    >
      {checked ? (
        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1,4 3.5,7 9,1" />
        </svg>
      ) : indeterminate ? (
        <div className="w-2.5 h-[2px] bg-gray-700 rounded-full" />
      ) : null}
    </button>
  );
}

interface Props {
  property: Property;
  userId: string;
  documents: DbDocument[];
  folders: DbFolder[];
  docThumbUrls?: Record<string, string>;
  // Server-computed in documents/queries.ts as roleAtLeast(orgRole, "admin").
  // Gates whether delete controls (folder delete, bulk delete) are shown. The
  // server enforces this independently; this just hides buttons that would
  // always be rejected for viewer/member roles (defence-in-depth).
  canDelete?: boolean;
}

export function PropertyDocumentsPage({ property, userId, documents: dbDocuments = [], folders: dbFolders = [], docThumbUrls = {}, canDelete = false }: Props) {
  const folderTree = buildFolderTree(dbFolders);

  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeFolder, setActiveFolder] = useState("All Documents");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  // Stores the id of the document currently open in the detail view (null = browse view).
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  // The signed URL for the open document's file. Null while fetching or if fetch failed.
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // Derive the full document object from the selected id.
  // Looks up from already-loaded dbDocuments — no extra network request.
  const selectedDocument = selectedDocumentId
    ? (dbDocuments.find((d) => d.id === selectedDocumentId) ?? null)
    : null;

  /**
   * Opens the document detail view for the given document id.
   *
   * Flow:
   * 1. Set the selected document id so the detail view renders immediately (with a skeleton).
   * 2. Clear the previous file URL so DocumentPreviewPane shows its loading skeleton.
   * 3. Call the getDocumentFileUrl server action to get a fresh signed URL.
   * 4. On success: set the URL so the preview pane renders the file.
   * 5. On failure: fileUrl stays null and the preview pane keeps showing the skeleton.
   *    The toolbar Download/Open buttons are hidden when fileUrl is null, so the user
   *    isn't offered dead-end actions. This is acceptable for Phase 1.
   */
  async function openDocument(docId: string) {
    setSelectedDocumentId(docId);
    setFileUrl(null);
    try {
      const result = await getDocumentFileUrl(docId);
      if (result.ok) {
        setFileUrl(result.data);
      }
      // If the action returns ok: false, fileUrl stays null — skeleton stays visible.
    } catch (error) {
      // Unexpected client-side error (e.g. network failure) — log it, don't crash the UI.
      console.error("[openDocument] unexpected error:", error);
    }
  }
  const [mounted, setMounted] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Rename folder modal state. `renameTarget` is the folder being renamed
  // (or null when the modal is closed); `renameValue` is the editable name.
  const [renameTarget, setRenameTarget] = useState<DbFolder | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete folder dialog state. `deleteTarget` is the folder being deleted
  // (or null when the dialog is closed).
  const [deleteTarget, setDeleteTarget] = useState<DbFolder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<TreeNode>(folderTree[0]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]));
  const locationRef = useRef<HTMLDivElement>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveLocationOpen, setMoveLocationOpen] = useState(false);
  const [moveSelectedLocation, setMoveSelectedLocation] = useState<TreeNode>(folderTree[0]);
  const [moveExpandedNodes, setMoveExpandedNodes] = useState<Set<string>>(new Set(["root"]));
  const moveLocationRef = useRef<HTMLDivElement>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Upload progress panel state
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadTab, setUploadTab] = useState<UploadTab>("all");
  const [panelMinimized, setPanelMinimized] = useState(false);

  // ─── Sort & Filter state ────────────────────────────────────────────────────
  // All three are local React state — no URL persistence, no server round-trips.

  // The active sort order. Default is newest-first (most recently uploaded at top).
  const [sortBy, setSortBy] = useState<SortOption>("date-newest");

  // Set of file type keys the user wants to see (e.g. "pdf", "image").
  // An empty Set means "show all types" — nothing filtered.
  const [activeFileTypes, setActiveFileTypes] = useState<Set<string>>(new Set());

  // Set of verifiesEntityType keys the user wants to see (e.g. "financials").
  // An empty Set means "show all categories" — nothing filtered.
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());

  /**
   * Creates a new folder by calling the `createFolder` server action.
   *
   * Flow:
   *  1. Bail out early if the name is blank or a create is already in flight
   *     (prevents accidental double-submits from fast Enter presses / clicks).
   *  2. Flip into the "creating" state and clear any previous error message.
   *  3. Work out where the folder should live: the "root" tree node means the
   *     top level, which the server expects as `parentFolderId: undefined`.
   *     Any other node id is a real parent folder we nest under.
   *  4. Call the server action. It returns an ActionResult, which is either
   *     `{ ok: true, data }` on success or `{ ok: false, error }` on failure.
   *  5. On success: close the modal, reset the name field, and call
   *     `router.refresh()`. The refresh is REQUIRED — the documents page is a
   *     plain server fetch (not cached under the "folders" tag), so the
   *     action's revalidate does not repaint this page; only refresh() does.
   *  6. On failure: show the generic error string the action returns and keep
   *     the modal open so the user can fix the name and retry. We never surface
   *     raw error objects to the user.
   *  7. The `finally` block always clears the "creating" state, even if the
   *     action throws unexpectedly, so the button never gets stuck disabled.
   */
  async function handleCreateFolder() {
    const trimmedName = newFolderName.trim();
    if (trimmedName === "" || isCreating) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      // "root" is the synthetic top-level node — it has no real parent folder.
      const parentFolderId =
        selectedLocation.id === "root" ? undefined : selectedLocation.id;

      const result = await createFolder({
        propertyId: property.id,
        name: trimmedName,
        parentFolderId,
      });

      if (result.ok) {
        setShowAddFolder(false);
        setNewFolderName("");
        // Re-fetch the server component data so the new folder shows up.
        router.refresh();
      } else {
        setCreateError(result.error);
      }
    } finally {
      setIsCreating(false);
    }
  }

  /**
   * Renames a folder by calling the `updateFolder` server action.
   *
   * Mirrors handleCreateFolder: guard against empty/in-flight, flip the
   * loading flag, clear any prior error, call the action, then either close
   * + refresh on success or show a generic inline error on failure. The
   * `finally` always clears the loading flag so the Save button never sticks.
   *
   * `updateFolder` takes (id, patch). FolderPatchSchema is partial, so sending
   * just `{ name }` is valid — we only ever change the name here.
   */
  async function handleRenameFolder() {
    const trimmed = renameValue.trim();
    if (trimmed === "" || isRenaming || !renameTarget) {
      return;
    }

    setIsRenaming(true);
    setRenameError(null);

    try {
      const result = await updateFolder(renameTarget.id, { name: trimmed });

      if (result.ok) {
        setRenameTarget(null);
        // Re-fetch the (uncached) server data so the new name shows up.
        router.refresh();
      } else {
        setRenameError(result.error);
      }
    } finally {
      setIsRenaming(false);
    }
  }

  /**
   * Deletes a folder by calling the `deleteFolder` server action.
   *
   * Only ever runs against an EMPTY folder: the Delete dialog shows the
   * "blocked" state (no destructive button) when the folder still has files
   * or subfolders, so the action is never called for a non-empty folder.
   * On success we close the dialog and refresh; on failure we surface the
   * generic error string and keep the dialog open.
   */
  async function handleDeleteFolder() {
    if (!deleteTarget || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteFolder(deleteTarget.id);

      if (result.ok) {
        setDeleteTarget(null);
        router.refresh();
      } else {
        setDeleteError(result.error);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  /**
   * Counts what a folder contains, using props we already have on the client.
   * There is no DB onDelete cascade, so deleting a folder that still holds
   * files or subfolders would throw a foreign-key error — we use this to block
   * that case in the Delete dialog before ever calling the action.
   */
  function folderContents(folderId: string) {
    const fileCount = dbDocuments.filter((d) => d.folderId === folderId).length;
    const subfolderCount = dbFolders.filter(
      (f) => f.parentFolderId === folderId
    ).length;
    return {
      fileCount,
      subfolderCount,
      isEmpty: fileCount + subfolderCount === 0,
    };
  }

  const folderMap = new Map(dbFolders.map((f) => [f.id, f.name]));
  const files: FileEntry[] = dbDocuments.map((doc) => {
    const { type, icon, iconClass } = getFileIconStyle(doc);
    return {
      id: doc.id,
      name: doc.name,
      type,
      icon,
      iconClass,
      thumb: docThumbUrls[doc.id] ?? null,
      folderId: doc.folderId,
      folder: doc.folderId ? (folderMap.get(doc.folderId) ?? "—") : "—",
      size: doc.sizeBytes ? formatBytes(doc.sizeBytes) : "—",
      date: new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      // Store raw values for sorting — formatted strings like "2.4 MB" can't be compared reliably.
      rawDate: new Date(doc.uploadedAt),
      rawSizeBytes: doc.sizeBytes ?? 0,
      verifiesEntityType: doc.verifies?.entityType,
    };
  });

  // Folders visible at the current navigation level (children of activeFolderId, or root-level folders).
  const visibleFolders = dbFolders
    .filter((f) => (f.parentFolderId ?? null) === activeFolderId)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Breadcrumb path from root to the currently open folder.
  const currentFolderPath = activeFolderId ? getFolderPath(dbFolders, activeFolderId) : [];
  const currentFolderName = currentFolderPath.at(-1)?.name ?? null;

  function toggleSelectFile(name: string) {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function toggleSelectAll(visibleFiles: FileEntry[]) {
    const allSelected = visibleFiles.every((f) => selectedFiles.has(f.name));
    setSelectedFiles(allSelected ? new Set() : new Set(visibleFiles.map((f) => f.name)));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedFiles(new Set());
  }

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!locationOpen) return;
    function handleOutside(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [locationOpen]);

  useEffect(() => {
    if (!moveLocationOpen) return;
    function handleOutside(e: MouseEvent) {
      if (moveLocationRef.current && !moveLocationRef.current.contains(e.target as Node)) {
        setMoveLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [moveLocationOpen]);

  // Simulate upload progress
  useEffect(() => {
    if (!showUploadPanel) return;
    const hasActive = uploadQueue.some((i) => i.status === "uploading");
    if (!hasActive) return;

    const timer = setInterval(() => {
      setUploadQueue((prev) => {
        const uploadingItem = prev.find((i) => i.status === "uploading");
        if (!uploadingItem) return prev;

        if (uploadingItem.progress >= 100) {
          const nextQueued = prev.find((i) => i.status === "queued");
          return prev.map((item) => {
            if (item.id === uploadingItem.id) return { ...item, status: "done" as UploadStatus, progress: 100 };
            if (nextQueued && item.id === nextQueued.id) return { ...item, status: "uploading" as UploadStatus };
            return item;
          });
        }

        const increment = Math.random() * 6 + 2;
        return prev.map((item) =>
          item.id === uploadingItem.id
            ? { ...item, progress: Math.min(100, item.progress + increment) }
            : item
        );
      });
    }, 180);

    return () => clearInterval(timer);
  }, [showUploadPanel, uploadQueue]);

  function handleAddDummyDoc() {
    setPendingFiles((prev) => [...prev, createDummyPdf()]);
  }

  const startUpload = useCallback(() => {
    const demoFiles = [
      { name: "Lease_Agreement_v3.pdf", size: "2.4 MB" },
      { name: "Inspection_Photos.jpg",  size: "4.1 MB" },
      { name: "Safety_Cert.pdf",        size: "1.2 MB" },
    ];
    const source = pendingFiles.length > 0
      ? pendingFiles.map((f) => ({ name: f.name, size: formatFileSize(f.size) }))
      : demoFiles;
    const items: UploadItem[] = source.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      status: i === 0 ? "uploading" : "queued",
      progress: 0,
    }));
    setUploadQueue(items);
    setShowUploadPanel(true);
    setUploadTab("all");
    setPanelMinimized(false);
    setShowUploadModal(false);
    setPendingFiles([]);
  }, [pendingFiles]);

  // ─── Sort & Filter pipeline ─────────────────────────────────────────────────

  // Step 1 — folder navigation filter.
  // When the user navigates into a folder (activeFolderId is set), scope the
  // file list to only files that live directly in that folder.
  const folderFilteredFiles = activeFolderId !== null
    ? files.filter((f) => f.folderId === activeFolderId)
    : files;

  // Step 2 — collect available options for the filter dropdowns.
  // We derive these from the folder-filtered set so the filter only offers
  // options that actually exist in the current folder view.
  const availableFileTypes = Array.from(
    new Set(folderFilteredFiles.map((f) => f.type))
  );
  // Only the entity-type categories that appear in this view (not "__none__").
  const availableCategoryKeys = Array.from(
    new Set(
      folderFilteredFiles
        .filter((f) => f.verifiesEntityType !== undefined)
        .map((f) => f.verifiesEntityType!)
    )
  );
  // Whether at least one file in this view carries a document category.
  // When false, we hide the Category section of the filter dropdown.
  const hasAnyCategories = availableCategoryKeys.length > 0;

  // Step 3 — file-type filter.
  // An empty activeFileTypes set means "no filter applied — show everything".
  const typeFilteredFiles =
    activeFileTypes.size === 0
      ? folderFilteredFiles
      : folderFilteredFiles.filter((f) => activeFileTypes.has(f.type));

  // Step 4 — category filter.
  // An empty activeCategories set means "no filter applied — show everything".
  const categoryFilteredFiles =
    activeCategories.size === 0
      ? typeFilteredFiles
      : typeFilteredFiles.filter((f) =>
          activeCategories.has(f.verifiesEntityType ?? "__none__")
        );

  // Step 5 — sort.
  // We spread into a new array so we never mutate the source `files` array,
  // which other parts of the component (e.g. folder counts) still read.
  const filteredFiles = [...categoryFilteredFiles].sort((a, b) => {
    switch (sortBy) {
      case "date-newest":
        // Most recently uploaded file first.
        return b.rawDate.getTime() - a.rawDate.getTime();
      case "date-oldest":
        // Oldest upload first.
        return a.rawDate.getTime() - b.rawDate.getTime();
      case "name-asc":
        // A to Z, locale-aware so accented characters sort correctly.
        return a.name.localeCompare(b.name);
      case "name-desc":
        // Z to A.
        return b.name.localeCompare(a.name);
      case "size-largest":
        // Biggest file first.
        return b.rawSizeBytes - a.rawSizeBytes;
      case "size-smallest":
        // Smallest file first.
        return a.rawSizeBytes - b.rawSizeBytes;
      default:
        return 0;
    }
  });

  // Total number of active filter dimensions. Used to show the count badge on
  // the Filter button and to decide whether to render the active-filter chips.
  const totalActiveFilters = activeFileTypes.size + activeCategories.size;

  function fade(delay: number) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "none" : "translateY(-8px)",
      transition: `opacity 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms, transform 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms`,
    };
  }

  // File detail view — sidebar + detail panel side by side
  if (selectedDocument) {
    return (
      <PropertyLayout activeTab="documents" property={property}>
        <div className="min-h-full bg-val-bg-page-alt flex">
          {/* Sidebar: file list for the active folder.
              Hidden on mobile — folder navigation happens from the main browse view. */}
          <aside className="hidden sm:flex w-[200px] shrink-0 border-r border-slate-200/60 flex-col">
            <div className="px-5 pt-7 pb-3">
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-slate-400">
                In this folder
              </span>
            </div>
            <nav className="flex flex-col px-3 flex-1 overflow-y-auto">
              {/* All Documents: closes the detail view and returns to the browse view */}
              <button
                onClick={() => { setSelectedDocumentId(null); setFileUrl(null); }}
                className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-[13px] mb-1 font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 transition-all duration-200"
              >
                <FolderOpen className="w-4 h-4 shrink-0 text-slate-400" />
                All Documents
              </button>

              {/* Files in the same folder as the selected document.
                  If selectedDocument.folderId is undefined, shows root-level documents. */}
              {dbDocuments
                .filter((d) => d.folderId === selectedDocument.folderId)
                .map((doc) => {
                  const { icon: DocIcon, iconClass } = getFileIconStyle(doc);
                  const isActive = doc.id === selectedDocument.id;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => openDocument(doc.id)}
                      className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-left text-[13px] mb-0.5 transition-all duration-200 ${
                        isActive
                          ? "font-semibold text-[--val-primary-dark]"
                          : "font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100/60"
                      }`}
                      style={isActive ? { background: "rgba(0,74,198,0.07)" } : {}}
                    >
                      <DocIcon
                        className={`w-4 h-4 shrink-0 ${isActive ? "text-[--val-primary-dark]" : iconClass}`}
                      />
                      <span className="truncate">{doc.name}</span>
                    </button>
                  );
                })}
            </nav>
          </aside>

          <DocumentDetailView
            document={selectedDocument}
            fileUrl={fileUrl}
            onBack={() => { setSelectedDocumentId(null); setFileUrl(null); }}
          />
        </div>
      </PropertyLayout>
    );
  }

  // Main documents browse view
  return (
    <PropertyLayout activeTab="documents" property={property}>
      <div className="min-h-full bg-val-bg-page-alt">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-6 sm:pb-8 flex flex-col gap-4 sm:gap-5 pt-5 sm:pt-8">

          {/* Page header */}
          <div style={fade(0)}>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">
                {property.code}
              </span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Documents</span>
            </div>

            <div className="mb-4">
              <h1 className="text-[28px] sm:text-[40px] font-extrabold tracking-tight leading-tight sm:leading-10 text-[--val-heading]">
                Documents
              </h1>
              <p className="text-slate-500 text-base mt-2">
                {files.length} files · {property.code} {property.type}
              </p>
            </div>
          </div>

          {/* Folder tiles with breadcrumb navigation */}
          <div style={fade(80)}>
              <div className="flex items-center justify-between mb-4">
                {/* Breadcrumb: clicking "Folders" resets to root; clicking a folder name navigates to it */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setActiveFolderId(null)}
                    className={`text-base font-bold transition-colors duration-150 ${
                      activeFolderId ? "text-slate-400 hover:text-[--val-heading]" : "text-[--val-heading]"
                    }`}
                  >
                    Folders
                  </button>
                  {currentFolderPath.map((folder) => (
                    <Fragment key={folder.id}>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <button
                        onClick={() => setActiveFolderId(folder.id)}
                        className={`text-base font-bold transition-colors duration-150 ${
                          activeFolderId === folder.id ? "text-[--val-heading]" : "text-slate-400 hover:text-[--val-heading]"
                        }`}
                      >
                        {folder.name}
                      </button>
                    </Fragment>
                  ))}
                </div>
                <button
                  onClick={() => {
                    // Default to the current folder when creating a subfolder
                    const defaultNode = activeFolderId
                      ? (findPath(folderTree, activeFolderId)?.at(-1) ?? folderTree[0])
                      : folderTree[0];
                    setNewFolderName("");
                    setCreateError(null);
                    setSelectedLocation(defaultNode);
                    setLocationOpen(false);
                    setShowAddFolder(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded text-[14px] font-semibold text-[--val-heading] hover:bg-slate-50 active:scale-[0.97] transition-all duration-150"
                >
                  <FolderPlus className="w-4 h-4 text-[--val-primary-dark]" />
                  Add Folder
                </button>
              </div>
              {visibleFolders.length === 0 ? (
                // Only show the "no folders" empty state at root level.
                // Inside a folder it's fine to have no subfolders — just hide the grid.
                activeFolderId === null ? (
                  <EmptyState
                    className="py-10"
                    icon={<FolderOpen className="size-5" />}
                    title="No folders yet"
                    description="Create a folder to organize your documents."
                  />
                ) : null
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {visibleFolders.map((f, i) => {
                  const hasSubfolders = dbFolders.some((sub) => sub.parentFolderId === f.id);
                  return (
                    // Card is a wrapper <div>: the body button navigates into the folder
                    // and the ⋯ menu is a sibling button (never nested inside another button).
                    <div
                      key={f.id}
                      className="group flex items-center gap-2 pl-4 pr-2 py-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 bg-white border-slate-200 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <button
                        onClick={() => setActiveFolderId(f.id)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                      >
                        <FolderOpen className="w-5 h-5 shrink-0 text-slate-400 transition-colors duration-200 group-hover:text-[--val-primary-dark]" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-medium truncate block text-[--val-heading] transition-colors duration-200 group-hover:text-[--val-primary-dark]">
                            {f.name}
                          </span>
                          {hasSubfolders && (
                            <span className="text-[10px] text-slate-400 leading-tight">Has subfolders</span>
                          )}
                        </div>
                      </button>

                      {/* Per-folder actions. The ⋯ is hidden until card hover/focus on desktop. */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label={`Actions for ${f.name}`}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100
                              opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 data-[state=open]:opacity-100
                              transition-[opacity,color,background-color] duration-150"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onSelect={() => { setRenameValue(f.name); setRenameError(null); setRenameTarget(f); }}
                          >
                            Rename
                          </DropdownMenuItem>
                          {/* Delete is admin-only — rendered last, separated, and rose. */}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onSelect={() => { setDeleteError(null); setDeleteTarget(f); }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

          {/* Files section */}
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5" style={fade(80)}>
              {/* Toolbar — flex-wraps on mobile so all controls remain
                  reachable. The Upload CTA pushes to its own row at 484px. */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                    {currentFolderName ?? "All Files"}
                    <span className="ml-2 text-slate-300 font-normal normal-case tracking-normal">
                      {filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}
                    </span>
                  </p>
                  {/* Select toggle */}
                  <button
                    onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                    className={`h-7 px-3 rounded border text-[12px] font-semibold flex items-center gap-1.5
                      transition-all duration-150 active:scale-[0.97] ${
                      selectMode
                        ? "border-[--val-primary-dark] bg-[--val-bg-tint] text-[--val-primary-dark]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-[3px] border-[1.5px] flex items-center justify-center transition-colors duration-150 ${
                      selectMode ? "border-[--val-primary-dark] bg-[--val-primary-dark]" : "border-slate-400"
                    }`}>
                      {selectMode && (
                        <svg viewBox="0 0 10 8" className="w-2 h-2" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1,4 3.5,7 9,1" />
                        </svg>
                      )}
                    </div>
                    {selectMode ? "Done" : "Select"}
                  </button>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">

                  {/* ── Sort dropdown ──────────────────────────────────────────
                      Shows the current sort order and lets the user change it.
                      The button turns brand-blue when the sort is anything other
                      than the default (date-newest) to signal a non-default state.
                      The active option inside the dropdown gets a blue check mark. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`h-7 px-3 rounded border text-[12px] font-semibold flex items-center gap-1.5
                          transition-all duration-150 active:scale-[0.97] ${
                          sortBy !== "date-newest"
                            ? "border-[--val-primary-dark] bg-[--val-bg-tint] text-[--val-primary-dark]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        Sort
                        {/* Dot indicator: visible only when sort is non-default */}
                        {sortBy !== "date-newest" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[--val-primary-dark] shrink-0" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {(
                        [
                          "date-newest",
                          "date-oldest",
                          "name-asc",
                          "name-desc",
                          "size-largest",
                          "size-smallest",
                        ] as SortOption[]
                      ).map((option) => (
                        <DropdownMenuItem
                          key={option}
                          onSelect={() => setSortBy(option)}
                          className={`flex items-center justify-between ${
                            sortBy === option ? "text-[--val-primary-dark]" : ""
                          }`}
                        >
                          {SORT_LABELS[option]}
                          {/* Blue check next to the currently-active sort option */}
                          {sortBy === option && (
                            <Check className="w-3.5 h-3.5 text-[--val-primary-dark] shrink-0 ml-2" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* ── Filter dropdown ────────────────────────────────────────
                      Two sections: File Type and Category (category only shown
                      when at least one document in the current view has a category).
                      The button shows a blue badge with the active-filter count
                      when any filter is applied. Uses DropdownMenuCheckboxItem
                      so each option toggles independently without closing the menu. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`h-7 px-3 rounded border text-[12px] font-semibold flex items-center gap-1.5
                          transition-all duration-150 active:scale-[0.97] ${
                          totalActiveFilters > 0
                            ? "border-[--val-primary-dark] bg-[--val-bg-tint] text-[--val-primary-dark]"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        Filter
                        {/* Blue count badge — visible only when filters are active */}
                        {totalActiveFilters > 0 && (
                          <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-[--val-primary-dark] text-white shrink-0">
                            {totalActiveFilters}
                          </span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">

                      {/* File Type section — always shown when there are files */}
                      {availableFileTypes.length > 0 && (
                        <>
                          <div className="px-2 py-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                              File Type
                            </span>
                          </div>
                          {availableFileTypes.map((fileType) => (
                            // DropdownMenuCheckboxItem keeps the menu open on click
                            // so users can tick multiple options in one interaction.
                            <DropdownMenuCheckboxItem
                              key={fileType}
                              checked={activeFileTypes.has(fileType)}
                              onCheckedChange={(checked) => {
                                // Toggle this file type in/out of the active set.
                                setActiveFileTypes((prev) => {
                                  const next = new Set(prev);
                                  if (checked) {
                                    next.add(fileType);
                                  } else {
                                    next.delete(fileType);
                                  }
                                  return next;
                                });
                              }}
                            >
                              {FILE_TYPE_LABELS[fileType] ?? fileType}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </>
                      )}

                      {/* Category section — only shown when at least one document
                          in the current folder view has a verifiesEntityType.
                          If every document is uncategorized this section is hidden. */}
                      {hasAnyCategories && (
                        <>
                          {availableFileTypes.length > 0 && <DropdownMenuSeparator />}
                          <div className="px-2 py-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                              Category
                            </span>
                          </div>
                          {availableCategoryKeys.map((catKey) => (
                            <DropdownMenuCheckboxItem
                              key={catKey}
                              checked={activeCategories.has(catKey)}
                              onCheckedChange={(checked) => {
                                // Toggle this category in/out of the active set.
                                setActiveCategories((prev) => {
                                  const next = new Set(prev);
                                  if (checked) {
                                    next.add(catKey);
                                  } else {
                                    next.delete(catKey);
                                  }
                                  return next;
                                });
                              }}
                            >
                              {CATEGORY_LABELS[catKey] ?? catKey}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </>
                      )}

                      {/* Fallback: no filterable content in this view */}
                      {availableFileTypes.length === 0 && !hasAnyCategories && (
                        <div className="px-3 py-3 text-[12px] text-slate-400 text-center">
                          No filter options available
                        </div>
                      )}

                      {/* Clear all — only shown when something is active */}
                      {totalActiveFilters > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => {
                              // Reset both filter dimensions at once.
                              setActiveFileTypes(new Set());
                              setActiveCategories(new Set());
                            }}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            Clear all filters
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* ── View toggle ─────────────────────────────────────────── */}
                  <div className="bg-val-bg-tint p-1 rounded flex">
                    <button
                      onClick={() => setViewMode("list")}
                      aria-pressed={viewMode === "list"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                        viewMode === "list"
                          ? "bg-white text-[--val-primary-dark] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <List className="w-4 h-4" />
                      List
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      aria-pressed={viewMode === "grid"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                        viewMode === "grid"
                          ? "bg-white text-[--val-primary-dark] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Grid
                    </button>
                  </div>
                  <button
                    onClick={() => { setPendingFiles([]); setShowUploadModal(true); }}
                    className="flex-1 sm:flex-none px-5 py-2.5 text-white text-[14px] font-semibold rounded flex items-center justify-center gap-2
                      hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                    style={{ background: "var(--val-primary-dark)" }}
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </button>
                </div>
              </div>

              {/* ── Active filter chips ───────────────────────────────────────
                  A row of removable chips appears only when at least one filter
                  is active. Each chip shows what's being filtered and has an ×
                  button to remove that individual filter. "Clear all" appears
                  when two or more filters are on, to clear the whole set at once.
                  Brand-blue tint matches the Filter button active state. */}
              {totalActiveFilters > 0 && (
                <div className="flex items-center gap-2 flex-wrap -mt-1">
                  {/* One chip per active file-type filter */}
                  {Array.from(activeFileTypes).map((fileType) => (
                    <span
                      key={fileType}
                      className="inline-flex items-center gap-1.5 h-6 pl-2.5 pr-1.5 rounded-full text-[11px] font-semibold
                        bg-[--val-bg-tint] text-[--val-primary-dark] border border-[--val-primary-dark]/20"
                    >
                      {FILE_TYPE_LABELS[fileType] ?? fileType}
                      <button
                        onClick={() => {
                          // Remove only this file type from the active set.
                          setActiveFileTypes((prev) => {
                            const next = new Set(prev);
                            next.delete(fileType);
                            return next;
                          });
                        }}
                        aria-label={`Remove ${FILE_TYPE_LABELS[fileType] ?? fileType} filter`}
                        className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-[--val-primary-dark]/10 transition-colors duration-100"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {/* One chip per active category filter */}
                  {Array.from(activeCategories).map((catKey) => (
                    <span
                      key={catKey}
                      className="inline-flex items-center gap-1.5 h-6 pl-2.5 pr-1.5 rounded-full text-[11px] font-semibold
                        bg-[--val-bg-tint] text-[--val-primary-dark] border border-[--val-primary-dark]/20"
                    >
                      {CATEGORY_LABELS[catKey] ?? catKey}
                      <button
                        onClick={() => {
                          // Remove only this category from the active set.
                          setActiveCategories((prev) => {
                            const next = new Set(prev);
                            next.delete(catKey);
                            return next;
                          });
                        }}
                        aria-label={`Remove ${CATEGORY_LABELS[catKey] ?? catKey} filter`}
                        className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-[--val-primary-dark]/10 transition-colors duration-100"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {/* Clear all — only worthwhile when more than one filter is active */}
                  {totalActiveFilters >= 2 && (
                    <button
                      onClick={() => {
                        // Reset both filter dimensions at once.
                        setActiveFileTypes(new Set());
                        setActiveCategories(new Set());
                      }}
                      className="h-6 px-2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors duration-150"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}

              {filteredFiles.length === 0 ? (
                <EmptyState
                  className="py-16"
                  icon={<FolderOpen className="size-6" />}
                  title={
                    // When filters are active and produce no results, tell the user
                    // to adjust their filters rather than suggesting they upload.
                    totalActiveFilters > 0
                      ? "No files match your filters"
                      : currentFolderName
                      ? `No files in ${currentFolderName}`
                      : "No documents yet"
                  }
                  description={
                    totalActiveFilters > 0
                      ? "Try adjusting or clearing your filters."
                      : "Upload a document to get started."
                  }
                />
              ) : viewMode === "list" ? (
                <ListView
                  files={filteredFiles}
                  onOpen={openDocument}
                  mounted={mounted}
                  selectMode={selectMode}
                  selectedFiles={selectedFiles}
                  onToggleFile={toggleSelectFile}
                  onToggleAll={() => toggleSelectAll(filteredFiles)}
                />
              ) : (
                <GridView
                  files={filteredFiles}
                  onOpen={openDocument}
                  selectMode={selectMode}
                  selectedFiles={selectedFiles}
                  onToggleFile={toggleSelectFile}
                />
              )}
          </div>

          {/* Bulk action bar */}
          {selectMode && selectedFiles.size > 0 && (
            <div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-2xl"
              style={{
                background: "#0d1f5c",
                boxShadow: "0 4px 24px rgba(13,31,92,0.28)",
                animation: "fade-slide-up 0.3s cubic-bezier(0.16,1,0.3,1) both",
              }}
            >
              <span className="text-[13px] font-semibold text-white px-3 py-1.5 border-r border-white/15 mr-1 whitespace-nowrap">
                {selectedFiles.size} selected
              </span>
              <button
                onClick={exitSelectMode}
                className="text-[13px] font-medium text-blue-200/70 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors duration-150 whitespace-nowrap"
              >
                Deselect all
              </button>
              <div className="w-px h-4 bg-white/15 mx-0.5" />
              <button
                onClick={() => { setMoveSelectedLocation(folderTree[0]); setMoveLocationOpen(false); setShowMoveModal(true); }}
                className="flex items-center gap-2 text-[13px] font-semibold text-white px-3 py-1.5 rounded-xl hover:bg-white/15 transition-colors duration-150 whitespace-nowrap"
              >
                <FolderInput className="w-3.5 h-3.5 text-blue-200" />
                Move to…
              </button>
              {/* Bulk delete — admin/owner only (defence-in-depth; server enforces too). */}
              {canDelete && (
              <button
                className="flex items-center gap-2 text-[13px] font-semibold text-rose-300 hover:text-rose-200 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors duration-150 whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Folder Modal */}
      <Dialog open={showAddFolder} onOpenChange={setShowAddFolder}>
        <DialogContent
          className="bg-white rounded-2xl w-[440px] max-w-[calc(100vw-32px)] p-0 border-0 gap-0 flex flex-col [&>button:last-child]:hidden"
          style={{ boxShadow: "0 24px 48px -8px rgba(18,28,40,0.22), 0 0 0 1px rgba(18,28,40,0.06)" }}
        >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-100"
              style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 30ms both" }}
            >
              <div className="flex items-center gap-3">
                <DialogTitle asChild>
                  <span className="text-[15px] font-semibold tracking-[-0.01em] text-[--val-heading] text-balance">New Folder</span>
                </DialogTitle>
              </div>
              <button
                onClick={() => setShowAddFolder(false)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-[color,background-color] duration-150"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div
              className="flex flex-col gap-5 px-6 py-5 relative z-[1]"
              style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 70ms both" }}
            >
              {/* Folder Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                  Folder Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) handleCreateFolder(); if (e.key === "Escape") setShowAddFolder(false); }}
                  placeholder="e.g. Lease Agreements"
                  maxLength={64}
                  className="h-10 w-full bg-[--val-input-surface] border border-slate-200 rounded-lg px-3.5 text-[14px] text-[--val-heading] placeholder:text-slate-400
                    focus:outline-none focus:border-[--val-primary-dark] focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] transition-[border-color,background-color,box-shadow] duration-150"
                />
                {newFolderName.length > 48 && (
                  <span className="text-[11px] text-slate-400 text-right tabular-nums">
                    {64 - newFolderName.length} left
                  </span>
                )}
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1.5" ref={locationRef}>
                <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                  Location
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLocationOpen((v) => !v)}
                    className={`h-10 w-full bg-[--val-input-surface] border rounded-lg px-3.5 flex items-center justify-between transition-[border-color,background-color,box-shadow] duration-150 ${
                      locationOpen
                        ? "border-[--val-primary-dark] bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {(() => {
                        const full = findPath(folderTree, selectedLocation.id) ?? [selectedLocation];
                        const overflow = full.length > 3;
                        const visible = overflow ? full.slice(-2) : full;
                        return (
                          <>
                            {overflow && (
                              <>
                                <span className="text-[14px] text-slate-400 shrink-0">...</span>
                                <ChevronRight className="w-[9px] h-[9px] text-slate-300 shrink-0" />
                              </>
                            )}
                            {visible.map((crumb, i, arr) => (
                              <Fragment key={crumb.id}>
                                {i > 0 && <ChevronRight className="w-[9px] h-[9px] text-slate-300 shrink-0" />}
                                <span className={`text-[14px] leading-5 whitespace-nowrap ${
                                  i === arr.length - 1
                                    ? "font-medium text-[--val-heading] truncate"
                                    : "text-slate-400 shrink-0"
                                }`}>
                                  {crumb.label}
                                </span>
                              </Fragment>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                    <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-200 ${
                      locationOpen ? "rotate-180" : ""
                    }`} />
                  </button>

                  {locationOpen && (
                    <div
                      className="absolute top-[calc(100%+4px)] left-0 right-0 z-10 bg-white rounded-lg border border-[--val-border-subtle] overflow-hidden"
                      style={{
                        boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)",
                        animation: "fade-slide-up 0.18s cubic-bezier(0.16,1,0.3,1) both",
                      }}
                    >
                      <div className="max-h-[240px] overflow-y-auto py-2">
                        {folderTree.map((node) => (
                          <FolderTreeItem
                            key={node.id}
                            node={node}
                            depth={0}
                            selected={selectedLocation.id}
                            expanded={expandedNodes}
                            onSelect={(n) => {
                              setSelectedLocation(n);
                              if (!n.children?.length) setLocationOpen(false);
                            }}
                            onToggle={(id) =>
                              setExpandedNodes((prev) => {
                                const next = new Set(prev);
                                next.has(id) ? next.delete(id) : next.add(id);
                                return next;
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error message — shown when the create action fails; modal stays open. */}
              {createError && (
                <p className="text-[12.5px] text-rose-600">
                  {createError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100"
              style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 110ms both" }}
            >
              <button
                onClick={() => setShowAddFolder(false)}
                className="h-9 px-4 rounded-lg text-[13.5px] font-medium text-slate-600 border border-slate-200
                  hover:bg-slate-50 hover:border-slate-300 active:scale-[0.96] transition-[color,background-color,border-color,transform] duration-150"
              >
                Cancel
              </button>
              <button
                disabled={!newFolderName.trim() || isCreating}
                onClick={handleCreateFolder}
                className="h-9 px-5 rounded-lg text-[13.5px] font-semibold text-white
                  enabled:hover:opacity-90 active:enabled:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed
                  transition-[opacity,transform] duration-150"
                style={{ background: "var(--val-primary-dark)" }}
              >
                {isCreating ? "Creating…" : "Create Folder"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

      {/* Rename Folder Modal — reuses the New Folder chrome. */}
      <Dialog open={renameTarget !== null} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent
          className="bg-white rounded-2xl w-[440px] max-w-[calc(100vw-32px)] p-0 border-0 gap-0 flex flex-col [&>button:last-child]:hidden"
          style={{ boxShadow: "0 24px 48px -8px rgba(18,28,40,0.22), 0 0 0 1px rgba(18,28,40,0.06)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-slate-100"
            style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 30ms both" }}
          >
            <DialogTitle asChild>
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-[--val-heading] text-balance">Rename Folder</span>
            </DialogTitle>
            <button
              onClick={() => setRenameTarget(null)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-[color,background-color] duration-150"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div
            className="flex flex-col gap-5 px-6 py-5 relative z-[1]"
            style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 70ms both" }}
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                Folder Name
              </label>
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => { if (e.key === "Enter" && renameValue.trim()) handleRenameFolder(); if (e.key === "Escape") setRenameTarget(null); }}
                placeholder="e.g. Lease Agreements"
                maxLength={64}
                className="h-10 w-full bg-[--val-input-surface] border border-slate-200 rounded-lg px-3.5 text-[14px] text-[--val-heading] placeholder:text-slate-400
                  focus:outline-none focus:border-[--val-primary-dark] focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] transition-[border-color,background-color,box-shadow] duration-150"
              />
              <p className="text-[12px] text-slate-400">Renames this folder for everyone on the property.</p>
            </div>

            {/* Error message — shown when the rename action fails; modal stays open. */}
            {renameError && (
              <p className="text-[12.5px] text-rose-600">
                {renameError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100"
            style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 110ms both" }}
          >
            <button
              onClick={() => setRenameTarget(null)}
              className="h-9 px-4 rounded-lg text-[13.5px] font-medium text-slate-600 border border-slate-200
                hover:bg-slate-50 hover:border-slate-300 active:scale-[0.96] transition-[color,background-color,border-color,transform] duration-150"
            >
              Cancel
            </button>
            <button
              disabled={!renameValue.trim() || renameValue.trim() === renameTarget?.name || isRenaming}
              onClick={handleRenameFolder}
              className="h-9 px-5 rounded-lg text-[13.5px] font-semibold text-white
                enabled:hover:opacity-90 active:enabled:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed
                transition-[opacity,transform] duration-150"
              style={{ background: "var(--val-primary-dark)" }}
            >
              {isRenaming ? "Saving…" : "Save"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Modal — one dialog, two states (confirm vs blocked). */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent
          className="bg-white rounded-2xl w-[440px] max-w-[calc(100vw-32px)] p-0 border-0 gap-0 flex flex-col [&>button:last-child]:hidden"
          style={{ boxShadow: "0 24px 48px -8px rgba(18,28,40,0.22), 0 0 0 1px rgba(18,28,40,0.06)" }}
        >
          {(() => {
            // Decide which state to show from what the folder currently holds.
            const contents = deleteTarget
              ? folderContents(deleteTarget.id)
              : { fileCount: 0, subfolderCount: 0, isEmpty: true };
            const parts: string[] = [];
            if (contents.fileCount > 0) parts.push(`${contents.fileCount} ${contents.fileCount === 1 ? "file" : "files"}`);
            if (contents.subfolderCount > 0) parts.push(`${contents.subfolderCount} ${contents.subfolderCount === 1 ? "subfolder" : "subfolders"}`);

            return (
              <>
                {/* Header */}
                <div
                  className="flex items-center justify-between px-6 py-4 border-b border-slate-100"
                  style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 30ms both" }}
                >
                  <DialogTitle asChild>
                    <span className="text-[15px] font-semibold tracking-[-0.01em] text-[--val-heading] text-balance">
                      Delete “{deleteTarget?.name}”?
                    </span>
                  </DialogTitle>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-[color,background-color] duration-150"
                    aria-label="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Body */}
                <div
                  className="flex flex-col gap-3 px-6 py-5"
                  style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 70ms both" }}
                >
                  {contents.isEmpty ? (
                    <>
                      <p className="text-[14px] text-[--val-heading]">This folder is empty and will be permanently removed.</p>
                      <p className="text-[13px] text-slate-400">This can’t be undone.</p>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border border-rose-200 bg-rose-50/60 px-3.5 py-3">
                        <p className="text-[13.5px] text-[--val-heading]">This folder still holds {parts.join(" and ")}.</p>
                      </div>
                      <p className="text-[13px] text-slate-400">Move or delete its contents first, then you can delete the folder.</p>
                    </>
                  )}

                  {/* Error message — shown when the delete action fails; modal stays open. */}
                  {deleteError && (
                    <p className="text-[12.5px] text-rose-600">
                      {deleteError}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100"
                  style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 110ms both" }}
                >
                  {contents.isEmpty ? (
                    <>
                      <button
                        onClick={() => setDeleteTarget(null)}
                        className="h-9 px-4 rounded-lg text-[13.5px] font-medium text-slate-600 border border-slate-200
                          hover:bg-slate-50 hover:border-slate-300 active:scale-[0.96] transition-[color,background-color,border-color,transform] duration-150"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isDeleting}
                        onClick={handleDeleteFolder}
                        className="h-9 px-5 rounded-lg text-[13.5px] font-semibold text-white bg-rose-600
                          enabled:hover:bg-rose-700 active:enabled:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed
                          transition-[background-color,transform] duration-150"
                      >
                        {isDeleting ? "Deleting…" : "Delete folder"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="h-9 px-4 rounded-lg text-[13.5px] font-medium text-slate-600 border border-slate-200
                        hover:bg-slate-50 hover:border-slate-300 active:scale-[0.96] transition-[color,background-color,border-color,transform] duration-150"
                    >
                      Got it
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Move To Modal */}
      <Dialog open={showMoveModal} onOpenChange={setShowMoveModal}>
        <DialogContent
          className="bg-white rounded-2xl w-[440px] max-w-[calc(100vw-32px)] p-0 border-0 gap-0 flex flex-col [&>button:last-child]:hidden"
          style={{ boxShadow: "0 24px 48px -8px rgba(18,28,40,0.22), 0 0 0 1px rgba(18,28,40,0.06)" }}
        >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-100"
              style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 30ms both" }}
            >
              <div className="flex items-center gap-3">
                <div>
                  <DialogTitle asChild>
                    <span className="text-[15px] font-semibold tracking-[-0.01em] text-[--val-heading] block">Move Files</span>
                  </DialogTitle>
                  <span className="text-[12px] text-slate-400">
                    {selectedFiles.size} {selectedFiles.size === 1 ? "file" : "files"} selected
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowMoveModal(false)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-[color,background-color] duration-150"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Selected files preview */}
            <div
              className="px-6 pt-4 pb-0"
              style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 50ms both" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400 mb-2">
                Selected Files
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 max-h-[96px] overflow-y-auto flex flex-col gap-1.5">
                {Array.from(selectedFiles).map((name) => (
                  <div key={name} className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    <span className="text-[13px] text-[--val-heading] truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Destination picker */}
            <div
              className="flex flex-col gap-5 px-6 py-5 relative z-[1]"
              style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 70ms both" }}
            >
              <div className="flex flex-col gap-1.5" ref={moveLocationRef}>
                <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                  Destination Folder
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoveLocationOpen((v) => !v)}
                    className={`h-10 w-full bg-[--val-input-surface] border rounded-lg px-3.5 flex items-center justify-between transition-[border-color,background-color,box-shadow] duration-150 ${
                      moveLocationOpen
                        ? "border-[--val-primary-dark] bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {(() => {
                        const full = findPath(folderTree, moveSelectedLocation.id) ?? [moveSelectedLocation];
                        const overflow = full.length > 3;
                        const visible = overflow ? full.slice(-2) : full;
                        return (
                          <>
                            {overflow && (
                              <>
                                <span className="text-[14px] text-slate-400 shrink-0">...</span>
                                <ChevronRight className="w-[9px] h-[9px] text-slate-300 shrink-0" />
                              </>
                            )}
                            {visible.map((crumb, i, arr) => (
                              <Fragment key={crumb.id}>
                                {i > 0 && <ChevronRight className="w-[9px] h-[9px] text-slate-300 shrink-0" />}
                                <span className={`text-[14px] leading-5 whitespace-nowrap ${
                                  i === arr.length - 1
                                    ? "font-medium text-[--val-heading] truncate"
                                    : "text-slate-400 shrink-0"
                                }`}>
                                  {crumb.label}
                                </span>
                              </Fragment>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                    <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-200 ${
                      moveLocationOpen ? "rotate-180" : ""
                    }`} />
                  </button>

                  {moveLocationOpen && (
                    <div
                      className="absolute top-[calc(100%+4px)] left-0 right-0 z-10 bg-white rounded-lg border border-[--val-border-subtle] overflow-hidden"
                      style={{
                        boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)",
                        animation: "fade-slide-up 0.18s cubic-bezier(0.16,1,0.3,1) both",
                      }}
                    >
                      <div className="max-h-[240px] overflow-y-auto py-2">
                        {folderTree.map((node) => (
                          <FolderTreeItem
                            key={node.id}
                            node={node}
                            depth={0}
                            selected={moveSelectedLocation.id}
                            expanded={moveExpandedNodes}
                            onSelect={(n) => {
                              setMoveSelectedLocation(n);
                              if (!n.children?.length) setMoveLocationOpen(false);
                            }}
                            onToggle={(id) =>
                              setMoveExpandedNodes((prev) => {
                                const next = new Set(prev);
                                next.has(id) ? next.delete(id) : next.add(id);
                                return next;
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100"
              style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 110ms both" }}
            >
              <button
                onClick={() => setShowMoveModal(false)}
                className="h-9 px-4 rounded-lg text-[13.5px] font-medium text-slate-600 border border-slate-200
                  hover:bg-slate-50 hover:border-slate-300 active:scale-[0.96] transition-[color,background-color,border-color,transform] duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowMoveModal(false); exitSelectMode(); }}
                className="h-9 px-5 rounded-lg text-[13.5px] font-semibold text-white
                  hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
                style={{ background: "var(--val-primary-dark)" }}
              >
                Move {selectedFiles.size} {selectedFiles.size === 1 ? "File" : "Files"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      {/* Upload File Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent
          className="bg-white rounded-2xl w-[480px] max-w-[calc(100vw-32px)] p-0 border-0 gap-0 flex flex-col overflow-hidden [&>button:last-child]:hidden"
          style={{ boxShadow: "0px 32px 64px -16px rgba(0,48,160,0.22), 0 0 0 1px rgba(18,28,40,0.07)" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div>
                  <DialogTitle asChild>
                    <p className="text-[17px] font-semibold tracking-[-0.4px] text-[#121c28] leading-tight">Add Files</p>
                  </DialogTitle>
                  <p className="text-[12px] text-slate-400 leading-tight">Drag, drop, or browse</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-[0.96] transition-[color,background-color,transform] duration-150"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Drop Zone Body */}
            <div
              className="p-5"
              style={{ background: "linear-gradient(180deg, #f4f7ff 0%, #f8f9ff 100%)" }}
            >
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mov"
                onChange={(e) => {
                  if (e.target.files) setPendingFiles(Array.from(e.target.files));
                }}
              />
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files) setPendingFiles(Array.from(e.dataTransfer.files));
                }}
                className={`rounded-xl border-2 border-dashed flex flex-col items-center py-10 px-8 transition-[border-color,background-color,transform,box-shadow] duration-200 ${
                  isDragOver
                    ? "border-[--val-primary-dark] bg-[#eaf1ff] scale-[1.005]"
                    : "border-[#c3c6d7]/80 bg-white hover:border-[--val-primary-dark]/40"
                }`}
                style={{ boxShadow: isDragOver ? "0 0 0 4px rgba(37,99,235,0.10)" : undefined }}
              >
                <div className="w-11 h-11 rounded-xl bg-[#eef3ff] flex items-center justify-center mb-4 shrink-0">
                  <CloudUpload className="w-5 h-5 text-[--val-primary-dark]" />
                </div>

                {pendingFiles.length === 0 ? (
                  <>
                    <p className="text-[15px] font-semibold text-[#121c28] mb-2.5 text-balance">Drag and drop files here</p>
                    <p className="text-[13px] text-slate-500 text-center leading-5 mb-6 max-w-[280px] text-pretty">
                      Documents, images, and videos up to 50 MB each.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold text-[--val-primary-dark] mb-3 tabular-nums">
                      {pendingFiles.length} {pendingFiles.length === 1 ? "file" : "files"} ready to upload
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 mb-5 max-w-[380px] max-h-[72px] overflow-y-auto">
                      {pendingFiles.map((f) => (
                        <span
                          key={f.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-[--val-primary-dark] max-w-[180px] truncate"
                          style={{ background: "color-mix(in oklch, var(--border-focus) 8%, transparent)", border: "1px solid color-mix(in oklch, var(--border-focus) 18%, transparent)" }}
                        >
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-lg text-[13.5px] font-semibold transition-[background-color,transform] duration-150 active:scale-[0.96]"
                  style={{
                    color: "var(--val-primary-dark)",
                    background: "color-mix(in oklch, var(--border-focus) 7%, transparent)",
                    border: "1px solid color-mix(in oklch, var(--border-focus) 22%, transparent)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(37,99,235,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(37,99,235,0.07)")}
                >
                  {pendingFiles.length > 0 ? "Change Files" : "Select from Computer"}
                </button>

                <div className="w-full mt-3">
                  <DevFileButton label="Add dummy doc" onClick={handleAddDummyDoc} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-white">
              <button
                onClick={() => setShowUploadModal(false)}
                className="h-9 px-4 rounded-lg text-[13.5px] font-medium text-slate-600 border border-slate-200
                  hover:bg-slate-50 hover:border-slate-300 active:scale-[0.96] transition-[color,background-color,border-color,transform] duration-150"
              >
                Cancel
              </button>
              <button
                onClick={startUpload}
                className="h-9 px-5 rounded-lg text-[13.5px] font-semibold text-white flex items-center gap-2
                  hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
                style={{ background: "var(--val-primary-dark)" }}
              >
                <Upload className="w-3.5 h-3.5" />
                {pendingFiles.length > 0
                  ? `Upload ${pendingFiles.length} ${pendingFiles.length === 1 ? "File" : "Files"}`
                  : "Upload File"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      {/* Floating Upload Status Panel */}
      {showUploadPanel && (() => {
        const allCount = uploadQueue.length;
        const uploadingCount = uploadQueue.filter((i) => i.status === "uploading" || i.status === "queued").length;
        const failedCount = uploadQueue.filter((i) => i.status === "failed").length;
        const doneCount = uploadQueue.filter((i) => i.status === "done").length;
        const activeUploads = uploadQueue.filter((i) => i.status === "uploading").length;

        const tabs: { key: UploadTab; label: string; count: number }[] = [
          { key: "all", label: "All", count: allCount },
          { key: "uploading", label: "Uploading", count: uploadingCount },
          { key: "failed", label: "Failed", count: failedCount },
          { key: "done", label: "Done", count: doneCount },
        ];

        const visibleItems = uploadQueue.filter((item) => {
          if (uploadTab === "all") return true;
          if (uploadTab === "uploading") return item.status === "uploading" || item.status === "queued";
          return item.status === uploadTab;
        });

        return (
          <div
            className="fixed z-50 inset-x-3 sm:inset-x-auto sm:right-5 w-auto sm:w-[360px]"
            style={{
              animation: "fade-slide-up 0.3s cubic-bezier(0.16,1,0.3,1) both",
              bottom: "calc(env(safe-area-inset-bottom) + 12px)",
            }}
          >
            <div
              className="flex flex-col overflow-hidden rounded-[20px] antialiased bg-white"
              style={{
                boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.1)",
              }}
            >
              {/* Header — hidden when minimized */}
              {!panelMinimized && (
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                  <span className="text-[16px] font-semibold text-slate-900 tracking-[-0.2px]">Uploads</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPanelMinimized(true)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
                      aria-label="Minimize"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowUploadPanel(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
                      aria-label="Close"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {!panelMinimized && (
                <>
                  {/* Filter Tabs */}
                  <div className="flex items-start border-b border-slate-200 px-2 pt-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setUploadTab(tab.key)}
                        className={`px-2.5 pb-2.5 pt-2 text-[13px] font-medium border-b-2 transition-colors duration-150 whitespace-nowrap tabular-nums ${
                          uploadTab === tab.key
                            ? "border-[--border-focus] text-[--border-focus]"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {tab.label} ({tab.count})
                      </button>
                    ))}
                  </div>

                  {/* Upload List */}
                  <div className="flex flex-col gap-0.5 px-2 py-2 max-h-[280px] overflow-y-auto">
                    {visibleItems.length === 0 ? (
                      <p className="text-[13px] text-slate-400 text-center py-6">No items</p>
                    ) : visibleItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center py-2 px-2.5 rounded-lg transition-colors duration-150 ${
                          item.status === "failed" ? "bg-rose-50" : ""
                        }`}
                      >
                        {/* File icon */}
                        <div className="shrink-0 mr-2.5">
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center"
                            style={{
                              background:
                                item.status === "done"     ? "rgba(22,163,74,0.08)" :
                                item.status === "failed"   ? "rgba(239,68,68,0.08)" :
                                item.status === "uploading" ? "rgba(37,99,235,0.08)" :
                                "#f1f5f9",
                            }}
                          >
                            <FileText
                              className="w-3.5 h-3.5"
                              style={{
                                color:
                                  item.status === "done"     ? "#16a34a" :
                                  item.status === "failed"   ? "#ef4444" :
                                  item.status === "uploading" ? "var(--border-focus)" :
                                  "#94a3b8",
                              }}
                            />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className={`text-[13px] font-medium truncate max-w-[160px] ${item.status === "queued" ? "text-slate-400" : "text-slate-800"}`}>
                              {item.name}
                            </span>
                            <span className="text-[12px] text-slate-400 shrink-0 ml-2 tabular-nums">
                              {item.status === "uploading" ? `${Math.round(item.progress)}%` : item.size}
                            </span>
                          </div>

                          {item.status === "uploading" && (
                            <>
                              <div className="w-full h-1.5 rounded-full bg-slate-200 mb-1">
                                <div
                                  className="h-1.5 rounded-full bg-[--border-focus] transition-[width] duration-200"
                                  style={{ width: `${item.progress}%`, willChange: "width" }}
                                />
                              </div>
                              <span className="text-[11px] text-slate-400 tabular-nums">
                                {item.progress < 20 ? "Starting…" :
                                 item.progress < 80 ? `~${Math.ceil((100 - item.progress) / 8)} sec remaining` :
                                 "Almost done…"}
                              </span>
                            </>
                          )}

                          {item.status === "done" && (
                            <span className="text-[12px] font-medium text-emerald-600">Completed</span>
                          )}
                          {item.status === "failed" && (
                            <span className="text-[12px] font-medium text-rose-500">{item.error ?? "Upload failed"}</span>
                          )}
                          {item.status === "queued" && (
                            <span className="text-[12px] text-slate-400">Queued</span>
                          )}
                        </div>

                        {/* Action */}
                        {item.status === "done" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {item.status === "failed" && (
                          <button
                            onClick={() => setUploadQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "uploading" as UploadStatus, progress: 0, error: undefined } : i))}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 shrink-0"
                            aria-label="Retry"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        {(item.status === "uploading" || item.status === "queued") && (
                          <button
                            onClick={() => setUploadQueue((prev) => prev.filter((i) => i.id !== item.id))}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 shrink-0"
                            aria-label="Cancel"
                          >
                            {item.status === "uploading" ? <X className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Footer */}
              <div className={`flex items-center justify-between px-4 py-3 transition-colors duration-500 ${doneCount === allCount && activeUploads === 0 ? "bg-emerald-600" : "bg-[--border-focus]"}`}>
                <div className="flex items-center gap-2.5">
                  {activeUploads > 0 ? (
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white shrink-0 animate-spin"
                    />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  )}
                  <div aria-live="polite" aria-atomic="true">
                    <span className="text-[13px] font-medium text-white tabular-nums">
                      {activeUploads > 0
                        ? `Uploading ${activeUploads} ${activeUploads === 1 ? "item" : "items"}`
                        : doneCount === allCount
                        ? "All uploads complete"
                        : `${doneCount} of ${allCount} done`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {!panelMinimized ? (
                    <button
                      onClick={() => { setShowUploadModal(true); setPendingFiles([]); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium text-white active:scale-[0.96] transition-[background-color,transform] duration-150 bg-black/20 hover:bg-black/30"
                      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }}
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setPanelMinimized(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/15 active:scale-[0.96] transition-[background-color,color,transform] duration-150"
                        aria-label="Expand"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setShowUploadPanel(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/15 active:scale-[0.96] transition-[background-color,color,transform] duration-150"
                        aria-label="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </PropertyLayout>
  );
}

function ListView({
  files,
  onOpen,
  mounted,
  selectMode,
  selectedFiles,
  onToggleFile,
  onToggleAll,
}: {
  files: FileEntry[];
  // Called with the document id when a row is clicked outside of select mode.
  onOpen: (docId: string) => void;
  mounted: boolean;
  selectMode: boolean;
  selectedFiles: Set<string>;
  onToggleFile: (name: string) => void;
  onToggleAll: () => void;
}) {
  const allSelected = files.length > 0 && files.every((f) => selectedFiles.has(f.name));
  const someSelected = files.some((f) => selectedFiles.has(f.name)) && !allSelected;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Horizontal scroll on phone — documents table has 5+ columns
          (Name / Type / Size / Date / Actions) that won't fit at 390px. */}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] sm:min-w-0">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200">
            {selectMode && (
              <th
                className="pl-4 pr-2 py-3"
                style={{ width: 48, animation: "fade-slide-up 0.2s cubic-bezier(0.16,1,0.3,1) both" }}
              >
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={onToggleAll}
                  label="Select all"
                />
              </th>
            )}
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Name</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Folder</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Size</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Modified</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f, i) => {
            const isChecked = selectedFiles.has(f.name);
            return (
              <tr
                key={f.name}
                onClick={() => selectMode ? onToggleFile(f.name) : onOpen(f.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectMode ? onToggleFile(f.name) : onOpen(f.id); } }}
                tabIndex={0}
                className={`border-t border-slate-100 cursor-pointer transition-colors duration-100 focus-visible:outline-none focus-visible:bg-blue-50/60 ${
                  isChecked && selectMode ? "bg-blue-50/50" : "hover:bg-blue-50/30"
                }`}
                style={{
                  animationName: mounted ? "analytics-fade-up" : "none",
                  animationDuration: "0.5s",
                  animationTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                  animationFillMode: "forwards",
                  animationDelay: `${i * 25}ms`,
                  opacity: mounted ? undefined : 0,
                }}
              >
                {selectMode && (
                  <td
                    className="pl-4 pr-2 py-3.5"
                    style={{ width: 48, animation: `fade-slide-up 0.2s cubic-bezier(0.16,1,0.3,1) ${i * 20}ms both` }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={() => onToggleFile(f.name)}
                    />
                  </td>
                )}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <f.icon className={`w-5 h-5 shrink-0 ${f.iconClass}`} />
                    <span className="text-[14px] font-medium text-[--val-heading]">{f.name}</span>
                    {f.verifiesEntityType && ENTITY_TYPE_CHIP[f.verifiesEntityType] && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ENTITY_TYPE_CHIP[f.verifiesEntityType].cls}`}>
                        {ENTITY_TYPE_CHIP[f.verifiesEntityType].label}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">{f.folder}</span>
                </td>
                <td className="px-4 py-3.5 text-[14px] text-slate-400">{f.size}</td>
                <td className="px-4 py-3.5 text-[14px] text-slate-400">{f.date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function GridView({
  files,
  onOpen,
  selectMode,
  selectedFiles,
  onToggleFile,
}: {
  files: FileEntry[];
  // Called with the document id when a card is clicked outside of select mode.
  onOpen: (docId: string) => void;
  selectMode: boolean;
  selectedFiles: Set<string>;
  onToggleFile: (name: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((f, i) => {
        const isChecked = selectedFiles.has(f.name);
        return (
          <button
            key={f.name}
            type="button"
            onClick={() => selectMode ? onToggleFile(f.name) : onOpen(f.id)}
            className={`relative bg-white rounded-xl p-4 transition-all duration-200 cursor-pointer text-left w-full
              animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both] [animation-delay:var(--delay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--val-primary-dark]/40 ${
              isChecked && selectMode
                ? "shadow-[0_0_0_2px_var(--val-primary-dark),0px_6px_20px_0px_rgba(18,28,40,0.10)] -translate-y-0.5"
                : "shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)]"
            }`}
            style={{ '--delay': `${100 + i * 80}ms` } as React.CSSProperties}
          >
            {/* Checkbox overlay */}
            {selectMode && (
              <div
                className="absolute top-3 left-3 z-10"
                style={{ animation: `fade-slide-up 0.2s cubic-bezier(0.16,1,0.3,1) ${i * 20}ms both` }}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isChecked}
                  onChange={() => onToggleFile(f.name)}
                />
              </div>
            )}
            <div className={`w-full aspect-[4/3] bg-slate-50 rounded-lg overflow-hidden mb-3 flex items-center justify-center border transition-colors duration-150 ${
              isChecked && selectMode ? "border-[--val-primary-dark]/20" : "border-slate-100"
            }`}>
              {f.thumb ? (
                <ImageWithFallback
                  src={f.thumb}
                  alt={f.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <f.icon className={`w-10 h-10 ${f.iconClass}`} />
              )}
            </div>
            <p className="text-[13px] font-medium truncate text-[--val-heading]">{f.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{f.size} · {f.date}</p>
          </button>
        );
      })}
    </div>
  );
}
