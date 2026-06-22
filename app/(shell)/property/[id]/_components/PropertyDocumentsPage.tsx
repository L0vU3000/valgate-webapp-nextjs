"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from "react";
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
} from "lucide-react";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { DocumentDetailView } from "@/components/property/DocumentDetailView";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBytes } from "@/lib/format";
import { DevFileButton } from "@/components/dev/DevFileButton";
import { createDummyPdf } from "@/lib/dev-tools";
import { useRouter } from "next/navigation";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { toastActionResult } from "@/lib/client/action-result";
import { deleteDocument, deleteDocuments } from "@/app/actions/documents";
import { createFolder, deleteFolder, getFolderContents } from "@/app/actions/folders";
import type { ActionResult } from "@/app/actions/_result";

type ViewMode = "list" | "grid";
type UploadStatus = "uploading" | "done" | "failed" | "queued";
type UploadTab = "all" | "uploading" | "failed" | "done";

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
  folder: string;
  size: string;
  date: string;
  verifiesEntityType?: string;
};

function getFileIconStyle(doc: DbDocument): { type: string; icon: React.ElementType; iconClass: string } {
  const ext = doc.extension?.toLowerCase();
  if (doc.kind === "photo" || ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" || ext === "webp" || ext === "svg") {
    return { type: "image", icon: Image, iconClass: "text-emerald-600" };
  }
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    return { type: "spreadsheet", icon: FileSpreadsheet, iconClass: "text-rose-600" };
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
}

export function PropertyDocumentsPage({ property, userId, documents: dbDocuments = [], folders: dbFolders = [] }: Props) {
  const router = useRouter();
  const folderTree = buildFolderTree(dbFolders);
  const rootFolders = dbFolders
    .filter((f) => !f.parentFolderId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeFolder, setActiveFolder] = useState("All Documents");
  const [activeSubfolder, setActiveSubfolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  // Per-folder content counts (documents + subfolders), fetched lazily when the user
  // is about to delete a folder so the confirm dialog can warn them what moves to root.
  const [folderContents, setFolderContents] = useState<Record<string, { documents: number; subfolders: number }>>({});
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

  const folderMap = new Map(dbFolders.map((f) => [f.id, f.name]));
  const files: FileEntry[] = dbDocuments.map((doc) => {
    const { type, icon, iconClass } = getFileIconStyle(doc);
    return {
      id: doc.id,
      name: doc.name,
      type,
      icon,
      iconClass,
      thumb: null,
      folder: doc.folderId ? (folderMap.get(doc.folderId) ?? "—") : "—",
      size: doc.sizeBytes ? formatBytes(doc.sizeBytes) : "—",
      date: new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      verifiesEntityType: doc.verifies?.entityType,
    };
  });
  // Quick lookup from a document name back to its id — the file-detail view still keys
  // off the visible name, but every delete/select path uses the real document id.
  const nameToId = new Map(files.map((f) => [f.name, f.id]));
  // Reverse lookup for surfaces that display a selected file's name (e.g. the Move modal).
  const idToName = new Map(files.map((f) => [f.id, f.name]));

  // The selection set holds document IDS (not names) so deletes hit the right rows even
  // when two files share a display name.
  function toggleSelectFile(id: string) {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll(visibleFiles: FileEntry[]) {
    const allSelected = visibleFiles.every((f) => selectedFiles.has(f.id));
    setSelectedFiles(allSelected ? new Set() : new Set(visibleFiles.map((f) => f.id)));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedFiles(new Set());
  }

  // ── Wired mutations ────────────────────────────────────────────────────────
  // All of these call a Server Action, toast the result, then refresh so the
  // server-rendered list re-fetches fresh data (no manual local-state surgery).

  // Resolve the selected folder picker value to a real DB folder id (or undefined
  // when "Documents"/root is chosen — the tree's synthetic root node has id "root").
  function selectedFolderId(node: TreeNode): string | undefined {
    return node.id === "root" ? undefined : node.id;
  }

  // Per-file delete. Deletes one document (row + S3 object) and refreshes.
  async function handleDeleteDocument(id: string) {
    const result = await deleteDocument(id);
    if (result.ok) {
      // Drop it from any active selection so the bulk bar stays accurate.
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    }
    return result;
  }

  // Bulk delete. Sends the selected document ids to the batch action, then exits
  // select mode and refreshes the list.
  async function handleBulkDelete() {
    const ids = Array.from(selectedFiles);
    const result = await deleteDocuments(ids);
    if (result.ok) {
      exitSelectMode();
      router.refresh();
    }
    return result;
  }

  // Lazily fetch + cache how many files/subfolders a folder holds, so the delete dialog
  // can warn the user. Called on hover/focus of the folder's delete button. No-op if
  // we already have the counts cached.
  async function loadFolderContents(id: string) {
    if (folderContents[id]) return;
    const result = await getFolderContents(id);
    if (result.ok) {
      setFolderContents((prev) => ({ ...prev, [id]: result.data }));
    }
  }

  // Per-folder delete. Documents/sub-folders inside move to the root (handled server-side).
  async function handleDeleteFolder(id: string) {
    const result = await deleteFolder(id);
    if (result.ok) {
      // If we were viewing this folder's files, drop back to "All Documents".
      setActiveSubfolder((curr) => (folderMap.get(id) === curr ? null : curr));
      router.refresh();
    }
    return result;
  }

  // Create Folder. Persists the new folder under the chosen location, closes the
  // modal on success, and refreshes so the new folder tile/tree entry appears.
  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const result = await createFolder({
        propertyId: property.id,
        name,
        parentFolderId: selectedFolderId(selectedLocation),
      });
      toastActionResult(result, { success: "Folder created" });
      if (result.ok) {
        setShowAddFolder(false);
        setNewFolderName("");
        router.refresh();
      }
    } finally {
      setCreatingFolder(false);
    }
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

  const filteredFiles = activeSubfolder
    ? files.filter((f) => f.folder === activeSubfolder)
    : files;

  function fade(delay: number) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "none" : "translateY(-8px)",
      transition: `opacity 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms, transform 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms`,
    };
  }

  // File detail view — sidebar + detail panel side by side
  if (selectedFile) {
    return (
      <PropertyLayout activeTab="documents" property={property}>
        <div className="min-h-full bg-val-bg-page-alt flex">
          {/* Sidebar: folder tree shown only on file pages.
              Hidden on mobile so the detail panel takes the full viewport
              width — folder navigation happens from the main browse view. */}
          <aside className="hidden sm:flex w-[180px] shrink-0 border-r border-slate-200/60 flex-col">
            <div className="px-5 pt-7 pb-4">
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-slate-400">
                Folders
              </span>
            </div>
            <nav className="flex flex-col px-3 flex-1">
              {/* Root: All Documents */}
              <button
                onClick={() => { setActiveFolder("All Documents"); setActiveSubfolder(null); }}
                className={`flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-[13px] mb-0.5 transition-all duration-200 ${
                  activeFolder === "All Documents"
                    ? "font-semibold text-[--val-primary-dark]"
                    : "font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100/60"
                }`}
                style={activeFolder === "All Documents" ? { background: "rgba(0,74,198,0.07)" } : {}}
              >
                <FolderOpen
                  className={`w-4 h-4 shrink-0 ${activeFolder === "All Documents" ? "text-[--val-primary-dark]" : "text-slate-400"}`}
                />
                All Documents
              </button>

              {/* Tree children with vertical connecting line */}
              {rootFolders.length > 0 && (
              <div className="flex pl-[10px]">
                <div className="w-px bg-slate-200 mx-[9px] self-stretch" />
                <div className="flex flex-col gap-0.5 flex-1">
                  {rootFolders.slice(0, 3).map((f) => {
                    const isActive = activeFolder === f.name;
                    return (
                      <button
                        key={f.id}
                        onClick={() => { setActiveFolder(f.name); setActiveSubfolder(null); }}
                        className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-[13px] transition-all duration-200 ${
                          isActive
                            ? "font-semibold text-[--val-primary-dark]"
                            : "font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100/60"
                        }`}
                        style={isActive ? { background: "rgba(0,74,198,0.07)" } : {}}
                      >
                        <FolderOpen
                          className={`w-4 h-4 shrink-0 ${isActive ? "text-[--val-primary-dark]" : "text-slate-400"}`}
                        />
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}
            </nav>
          </aside>

          <DocumentDetailView
            documentName={selectedFile}
            onBack={() => setSelectedFile(null)}
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

          {/* Folder tiles */}
          <div style={fade(80)}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-bold text-[--val-heading]">Folders</p>
                <button
                  onClick={() => { setNewFolderName(""); setSelectedLocation(folderTree[0]); setLocationOpen(false); setShowAddFolder(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded text-[14px] font-semibold text-[--val-heading] hover:bg-slate-50 active:scale-[0.97] transition-all duration-150"
                >
                  <FolderPlus className="w-4 h-4 text-[--val-primary-dark]" />
                  Add Folder
                </button>
              </div>
              {rootFolders.length === 0 ? (
                <EmptyState
                  className="py-10"
                  icon={<FolderOpen className="size-5" />}
                  title="No folders yet"
                  description="Create a folder to organize your documents."
                />
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {rootFolders.map((f, i) => {
                  const isActive = activeSubfolder === f.name;
                  const contents = folderContents[f.id];
                  // Build the warning shown in the delete dialog. We fetch the counts when the
                  // user hovers/focuses the delete button (see onMouseEnter below); until then
                  // we show a generic "moves to root" message.
                  const folderDeleteDescription = contents && (contents.documents > 0 || contents.subfolders > 0)
                    ? `This folder contains ${contents.documents} ${contents.documents === 1 ? "file" : "files"}${contents.subfolders > 0 ? ` and ${contents.subfolders} ${contents.subfolders === 1 ? "subfolder" : "subfolders"}` : ""}. They will move to the root. This can't be undone.`
                    : "Deleting this folder moves any files inside it to the root. This can't be undone.";
                  return (
                    <div
                      key={f.id}
                      className={`group relative flex items-center gap-2.5 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${
                        isActive
                          ? "bg-[--val-bg-tint] border-[--val-primary-dark]/25 shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)]"
                          : "bg-white border-slate-200 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]"
                      }`}
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => setActiveSubfolder(isActive ? null : f.name)}
                      role="button"
                      aria-pressed={isActive}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveSubfolder(isActive ? null : f.name); } }}
                    >
                      <FolderOpen
                        className={`w-5 h-5 shrink-0 transition-colors duration-200 ${isActive ? "text-[--val-primary-dark]" : "text-slate-400"}`}
                      />
                      <span
                        className={`flex-1 text-[13px] font-medium truncate transition-colors duration-200 ${isActive ? "text-[--val-primary-dark]" : "text-[--val-heading]"}`}
                      >
                        {f.name}
                      </span>
                      <ConfirmAction
                        tier="confirm"
                        title={`Delete folder "${f.name}"?`}
                        description={folderDeleteDescription}
                        confirmLabel="Delete folder"
                        successMessage="Folder deleted"
                        onConfirm={() => handleDeleteFolder(f.id)}
                      >
                        <button
                          aria-label={`Delete folder ${f.name}`}
                          onMouseEnter={() => { void loadFolderContents(f.id); }}
                          onFocus={() => { void loadFolderContents(f.id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-500 hover:bg-rose-50 transition-[opacity,color,background-color] duration-150"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </ConfirmAction>
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
                    {activeSubfolder ? activeSubfolder : "All Files"}
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

              {filteredFiles.length === 0 ? (
                <EmptyState
                  className="py-16"
                  icon={<FolderOpen className="size-6" />}
                  title={activeSubfolder ? `No files in ${activeSubfolder}` : "No documents yet"}
                  description="Upload a document to get started."
                />
              ) : viewMode === "list" ? (
                <ListView
                  files={filteredFiles}
                  onFileClick={selectMode ? (name) => toggleSelectFile(nameToId.get(name) ?? name) : setSelectedFile}
                  mounted={mounted}
                  selectMode={selectMode}
                  selectedFiles={selectedFiles}
                  onToggleFile={toggleSelectFile}
                  onToggleAll={() => toggleSelectAll(filteredFiles)}
                  onDeleteFile={handleDeleteDocument}
                />
              ) : (
                <GridView
                  files={filteredFiles}
                  onFileClick={selectMode ? (name) => toggleSelectFile(nameToId.get(name) ?? name) : setSelectedFile}
                  selectMode={selectMode}
                  selectedFiles={selectedFiles}
                  onToggleFile={toggleSelectFile}
                  onDeleteFile={handleDeleteDocument}
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
              <ConfirmAction
                tier="typed"
                title={`Delete ${selectedFiles.size} ${selectedFiles.size === 1 ? "file" : "files"}?`}
                description={`This permanently removes ${selectedFiles.size} ${selectedFiles.size === 1 ? "file" : "files"} and their stored copies. This can't be undone.`}
                typedConfirmValue="DELETE"
                confirmLabel={`Delete ${selectedFiles.size} ${selectedFiles.size === 1 ? "file" : "files"}`}
                successMessage="Files deleted"
                onConfirm={handleBulkDelete}
              >
                <button
                  className="flex items-center gap-2 text-[13px] font-semibold text-rose-300 hover:text-rose-200 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors duration-150 whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </ConfirmAction>
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
                  onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim() && !creatingFolder) void handleCreateFolder(); if (e.key === "Escape") setShowAddFolder(false); }}
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
                disabled={!newFolderName.trim() || creatingFolder}
                onClick={() => void handleCreateFolder()}
                className="h-9 px-5 rounded-lg text-[13.5px] font-semibold text-white
                  enabled:hover:opacity-90 active:enabled:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed
                  transition-[opacity,transform] duration-150"
                style={{ background: "var(--val-primary-dark)" }}
              >
                {creatingFolder ? "Creating…" : "Create Folder"}
              </button>
            </div>
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
                {Array.from(selectedFiles).map((id) => (
                  <div key={id} className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    <span className="text-[13px] text-[--val-heading] truncate">{idToName.get(id) ?? id}</span>
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
  onFileClick,
  mounted,
  selectMode,
  selectedFiles,
  onToggleFile,
  onToggleAll,
  onDeleteFile,
}: {
  files: FileEntry[];
  onFileClick: (name: string) => void;
  mounted: boolean;
  selectMode: boolean;
  selectedFiles: Set<string>;
  onToggleFile: (id: string) => void;
  onToggleAll: () => void;
  // Deletes one document by id; returns the action result so we can toast.
  onDeleteFile: (id: string) => Promise<ActionResult<unknown>>;
}) {
  const allSelected = files.length > 0 && files.every((f) => selectedFiles.has(f.id));
  const someSelected = files.some((f) => selectedFiles.has(f.id)) && !allSelected;

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
            <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] w-[64px]"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {files.map((f, i) => {
            const isChecked = selectedFiles.has(f.id);
            return (
              <tr
                key={f.id}
                onClick={() => onFileClick(f.name)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFileClick(f.name); } }}
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
                      onChange={() => onToggleFile(f.id)}
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
                <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <ConfirmAction
                    tier="confirm"
                    title={`Delete "${f.name}"?`}
                    description="This permanently removes the file and its stored copy. This can't be undone."
                    confirmLabel="Delete"
                    successMessage="File deleted"
                    onConfirm={() => onDeleteFile(f.id)}
                  >
                    <button
                      aria-label={`Delete ${f.name}`}
                      className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-[color,background-color] duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </ConfirmAction>
                </td>
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
  onFileClick,
  selectMode,
  selectedFiles,
  onToggleFile,
  onDeleteFile,
}: {
  files: FileEntry[];
  onFileClick: (name: string) => void;
  selectMode: boolean;
  selectedFiles: Set<string>;
  onToggleFile: (id: string) => void;
  onDeleteFile: (id: string) => Promise<ActionResult<unknown>>;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((f, i) => {
        const isChecked = selectedFiles.has(f.id);
        return (
          <div
            key={f.id}
            className="group relative"
            style={{ '--delay': `${100 + i * 80}ms` } as React.CSSProperties}
          >
          <button
            type="button"
            onClick={() => onFileClick(f.name)}
            className={`relative bg-white rounded-xl p-4 transition-all duration-200 cursor-pointer text-left w-full
              animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both] [animation-delay:var(--delay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--val-primary-dark]/40 ${
              isChecked && selectMode
                ? "shadow-[0_0_0_2px_var(--val-primary-dark),0px_6px_20px_0px_rgba(18,28,40,0.10)] -translate-y-0.5"
                : "shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)]"
            }`}
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
                  onChange={() => onToggleFile(f.id)}
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
          {/* Per-card delete — hidden in select mode (use the bulk bar instead). */}
          {!selectMode && (
            <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => e.stopPropagation()}>
              <ConfirmAction
                tier="confirm"
                title={`Delete "${f.name}"?`}
                description="This permanently removes the file and its stored copy. This can't be undone."
                confirmLabel="Delete"
                successMessage="File deleted"
                onConfirm={() => onDeleteFile(f.id)}
              >
                <button
                  aria-label={`Delete ${f.name}`}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-slate-300 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-500 hover:bg-rose-50 shadow-sm transition-[opacity,color,background-color] duration-150"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </ConfirmAction>
            </div>
          )}
          </div>
        );
      })}
    </div>
  );
}
