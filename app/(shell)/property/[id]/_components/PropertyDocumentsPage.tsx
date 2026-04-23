"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import type { Property } from "@/lib/mock-data";
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

type FileEntry = {
  name: string;
  type: string;
  icon: React.ElementType;
  iconClass: string;
  thumb: string | null;
  folder: string;
  size: string;
  date: string;
};

const mainFolders = [
  { name: "All Documents", icon: FolderOpen },
  { name: "Title",         icon: FileText   },
  { name: "Sales",         icon: FileText   },
  { name: "Tax Receipt",   icon: FileText   },
];

const subFolders = ["Contract", "Receipts", "Tax", "Rental", "Images", "Videos"];

const files: FileEntry[] = [
  { name: "Title_Deed.pdf",                type: "doc",         icon: FileText,        iconClass: "text-blue-600",    thumb: null, folder: "Contract", size: "1.2 MB",  date: "Jan 12, 2022" },
  { name: "Mortgage_Agreement_2022.pdf",   type: "doc",         icon: FileText,        iconClass: "text-blue-600",    thumb: null, folder: "Contract", size: "890 KB",  date: "Mar 4, 2022"  },
  { name: "Insurance_Policy_2025.pdf",     type: "doc",         icon: FileText,        iconClass: "text-blue-600",    thumb: null, folder: "Contract", size: "2.1 MB",  date: "Jan 1, 2025"  },
  { name: "Inspection_Report_Jan2026.pdf", type: "doc",         icon: FileText,        iconClass: "text-blue-600",    thumb: null, folder: "Contract", size: "4.5 MB",  date: "Jan 15, 2026" },
  { name: "Lease_Template_v3.docx",        type: "doc",         icon: FileText,        iconClass: "text-blue-600",    thumb: null, folder: "Rental",   size: "340 KB",  date: "Jun 20, 2024" },
  { name: "Tenant_Agreement_2024.pdf",     type: "doc",         icon: FileText,        iconClass: "text-blue-600",    thumb: null, folder: "Rental",   size: "780 KB",  date: "Jul 1, 2024"  },
  { name: "Rental_Invoice_Mar2026.xlsx",   type: "spreadsheet", icon: FileSpreadsheet, iconClass: "text-rose-600",    thumb: null, folder: "Rental",   size: "56 KB",   date: "Mar 1, 2026"  },
  { name: "Property_Tax_Return_2026.xlsx", type: "spreadsheet", icon: FileSpreadsheet, iconClass: "text-rose-600",    thumb: null, folder: "Tax",      size: "120 KB",  date: "Feb 28, 2026" },
  { name: "Tax_Assessment_2025.pdf",       type: "doc",         icon: FileText,        iconClass: "text-blue-600",    thumb: null, folder: "Tax",      size: "640 KB",  date: "Nov 15, 2025" },
  { name: "Transfer_Receipt_2022.pdf",     type: "doc",         icon: FileText,        iconClass: "text-blue-600",    thumb: null, folder: "Receipts", size: "220 KB",  date: "Mar 4, 2022"  },
  {
    name: "Property_Photos_Exterior.jpg", type: "image", icon: Image, iconClass: "text-emerald-600",
    thumb: "https://images.unsplash.com/photo-1607005583234-531da6958271?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    folder: "Images", size: "3.8 MB", date: "May 10, 2022",
  },
  {
    name: "Property_Photos_Interior.jpg", type: "image", icon: Image, iconClass: "text-emerald-600",
    thumb: "https://images.unsplash.com/photo-1638285240257-0d37f116d7d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    folder: "Images", size: "4.2 MB", date: "May 10, 2022",
  },
  {
    name: "Site_Survey_Aerial.jpg", type: "image", icon: Image, iconClass: "text-emerald-600",
    thumb: "https://images.unsplash.com/photo-1655241238128-018bd3a70821?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    folder: "Images", size: "6.1 MB", date: "Apr 22, 2022",
  },
];

type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

const locationTree: TreeNode[] = [
  {
    id: "root",
    label: "Documents",
    children: [
      {
        id: "compliance",
        label: "Compliance",
        children: [
          { id: "compliance-2024", label: "2024" },
          { id: "compliance-2025", label: "2025" },
        ],
      },
      {
        id: "legal",
        label: "Legal",
        children: [
          { id: "legal-contracts", label: "Contracts" },
          { id: "legal-permits", label: "Permits" },
        ],
      },
      { id: "contract", label: "Contract" },
      { id: "receipts", label: "Receipts" },
      { id: "tax", label: "Tax" },
      { id: "rental", label: "Rental" },
      { id: "images", label: "Images" },
      { id: "videos", label: "Videos" },
    ],
  },
];

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
            tabIndex={-1}
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

export function PropertyDocumentsPage({ property }: { property: Property }) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeFolder, setActiveFolder] = useState("All Documents");
  const [activeSubfolder, setActiveSubfolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<TreeNode>(locationTree[0]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root", "compliance"]));
  const locationRef = useRef<HTMLDivElement>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveLocationOpen, setMoveLocationOpen] = useState(false);
  const [moveSelectedLocation, setMoveSelectedLocation] = useState<TreeNode>(locationTree[0]);
  const [moveExpandedNodes, setMoveExpandedNodes] = useState<Set<string>>(new Set(["root", "compliance"]));
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
          {/* Sidebar: folder tree shown only on file pages */}
          <aside className="w-[180px] shrink-0 border-r border-slate-200/60 flex flex-col">
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
              <div className="flex pl-[10px]">
                <div className="w-px bg-slate-200 mx-[9px] self-stretch" />
                <div className="flex flex-col gap-0.5 flex-1">
                  {mainFolders.slice(1).map((f) => {
                    const isActive = activeFolder === f.name;
                    return (
                      <button
                        key={f.name}
                        onClick={() => { setActiveFolder(f.name); setActiveSubfolder(null); }}
                        className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-[13px] transition-all duration-200 ${
                          isActive
                            ? "font-semibold text-[--val-primary-dark]"
                            : "font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100/60"
                        }`}
                        style={isActive ? { background: "rgba(0,74,198,0.07)" } : {}}
                      >
                        <f.icon
                          className={`w-4 h-4 shrink-0 ${isActive ? "text-[--val-primary-dark]" : "text-slate-400"}`}
                        />
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </div>
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
        <div className="max-w-[1200px] mx-auto px-8 pb-8 flex flex-col gap-5 pt-8">

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
              <h1 className="text-4xl font-extrabold tracking-tight leading-10 text-[--val-heading]">
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
                  onClick={() => { setNewFolderName(""); setSelectedLocation(locationTree[0]); setLocationOpen(false); setShowAddFolder(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded text-[14px] font-semibold text-[--val-heading] hover:bg-slate-50 active:scale-[0.97] transition-all duration-150"
                >
                  <FolderPlus className="w-4 h-4 text-[--val-primary-dark]" />
                  Add Folder
                </button>
              </div>
              <div className="grid grid-cols-6 gap-4">
                {subFolders.map((sf, i) => {
                  const isActive = activeSubfolder === sf;
                  return (
                    <button
                      key={sf}
                      onClick={() => setActiveSubfolder(isActive ? null : sf)}
                      className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 ${
                        isActive
                          ? "bg-[--val-bg-tint] border-[--val-primary-dark]/25 shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)]"
                          : "bg-white border-slate-200 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]"
                      }`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <FolderOpen
                        className={`w-5 h-5 shrink-0 transition-colors duration-200 ${isActive ? "text-[--val-primary-dark]" : "text-slate-400"}`}
                      />
                      <span
                        className={`text-[13px] font-medium transition-colors duration-200 ${isActive ? "text-[--val-primary-dark]" : "text-[--val-heading]"}`}
                      >
                        {sf}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          {/* Files section */}
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5" style={fade(80)}>
              <div className="flex items-center justify-between">
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
                <div className="flex items-center gap-3">
                  <div className="bg-val-bg-tint p-1 rounded flex">
                    <button
                      onClick={() => setViewMode("list")}
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
                    className="px-5 py-2.5 text-white text-[14px] font-semibold rounded flex items-center gap-2
                      hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                    style={{
                      background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                      boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </button>
                </div>
              </div>

              {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-val-bg-tint flex items-center justify-center mb-4">
                    <FolderOpen className="size-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-[--val-heading]">
                    No files in {activeSubfolder}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                    Upload a document to get started.
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <ListView
                  files={filteredFiles}
                  onFileClick={selectMode ? toggleSelectFile : setSelectedFile}
                  mounted={mounted}
                  selectMode={selectMode}
                  selectedFiles={selectedFiles}
                  onToggleFile={toggleSelectFile}
                  onToggleAll={() => toggleSelectAll(filteredFiles)}
                />
              ) : (
                <GridView
                  files={filteredFiles}
                  onFileClick={selectMode ? toggleSelectFile : setSelectedFile}
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
                background: "linear-gradient(135deg, #0d1f5c 0%, #1e3a8a 100%)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px rgba(37,99,235,0.35), 0 0 0 1px rgba(99,148,255,0.18)",
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
                onClick={() => { setMoveSelectedLocation(locationTree[0]); setMoveLocationOpen(false); setShowMoveModal(true); }}
                className="flex items-center gap-2 text-[13px] font-semibold text-white px-3 py-1.5 rounded-xl hover:bg-white/15 transition-colors duration-150 whitespace-nowrap"
              >
                <FolderInput className="w-3.5 h-3.5 text-blue-200" />
                Move to…
              </button>
              <button
                className="flex items-center gap-2 text-[13px] font-semibold text-rose-300 hover:text-rose-200 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors duration-150 whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Folder Modal */}
      {showAddFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px]"
          style={{ background: "rgba(18,28,40,0.38)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddFolder(false); }}
        >
          <div
            className="bg-white rounded-2xl w-[440px] flex flex-col"
            style={{
              boxShadow: "0 24px 48px -8px rgba(18,28,40,0.22), 0 0 0 1px rgba(18,28,40,0.06)",
              animation: "fade-slide-up 0.28s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-100"
              style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 30ms both" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-val-bg-tint flex items-center justify-center shrink-0">
                  <FolderPlus className="w-[15px] h-[15px] text-[--val-primary-dark]" />
                </div>
                <span className="text-[15px] font-semibold tracking-[-0.01em] text-[--val-heading] text-balance">New Folder</span>
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
                  onKeyDown={(e) => { if (e.key === "Enter" && newFolderName.trim()) setShowAddFolder(false); if (e.key === "Escape") setShowAddFolder(false); }}
                  placeholder="e.g. Lease Agreements"
                  maxLength={64}
                  className="h-10 w-full bg-[#f7f8fe] border border-slate-200 rounded-lg px-3.5 text-[14px] text-[--val-heading] placeholder:text-slate-400
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
                    className={`h-10 w-full bg-[#f7f8fe] border rounded-lg px-3.5 flex items-center justify-between transition-[border-color,background-color,box-shadow] duration-150 ${
                      locationOpen
                        ? "border-[--val-primary-dark] bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {(() => {
                        const full = findPath(locationTree, selectedLocation.id) ?? [selectedLocation];
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
                      className="absolute top-[calc(100%+4px)] left-0 right-0 z-10 bg-white rounded-lg border border-[#d8e3f4] overflow-hidden"
                      style={{
                        boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)",
                        animation: "fade-slide-up 0.18s cubic-bezier(0.16,1,0.3,1) both",
                      }}
                    >
                      <div className="max-h-[240px] overflow-y-auto py-2">
                        {locationTree.map((node) => (
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
                disabled={!newFolderName.trim()}
                onClick={() => setShowAddFolder(false)}
                className="h-9 px-5 rounded-lg text-[13.5px] font-semibold text-white
                  enabled:hover:opacity-90 active:enabled:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed
                  transition-[opacity,transform] duration-150"
                style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Move To Modal */}
      {showMoveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px]"
          style={{ background: "rgba(18,28,40,0.38)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowMoveModal(false); }}
        >
          <div
            className="bg-white rounded-2xl w-[440px] flex flex-col"
            style={{
              boxShadow: "0 24px 48px -8px rgba(18,28,40,0.22), 0 0 0 1px rgba(18,28,40,0.06)",
              animation: "fade-slide-up 0.28s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-slate-100"
              style={{ animation: "fade-slide-up 0.22s cubic-bezier(0.16,1,0.3,1) 30ms both" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-val-bg-tint flex items-center justify-center shrink-0">
                  <FolderInput className="w-[15px] h-[15px] text-[--val-primary-dark]" />
                </div>
                <div>
                  <span className="text-[15px] font-semibold tracking-[-0.01em] text-[--val-heading] block">
                    Move Files
                  </span>
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
                    className={`h-10 w-full bg-[#f7f8fe] border rounded-lg px-3.5 flex items-center justify-between transition-[border-color,background-color,box-shadow] duration-150 ${
                      moveLocationOpen
                        ? "border-[--val-primary-dark] bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {(() => {
                        const full = findPath(locationTree, moveSelectedLocation.id) ?? [moveSelectedLocation];
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
                      className="absolute top-[calc(100%+4px)] left-0 right-0 z-10 bg-white rounded-lg border border-[#d8e3f4] overflow-hidden"
                      style={{
                        boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)",
                        animation: "fade-slide-up 0.18s cubic-bezier(0.16,1,0.3,1) both",
                      }}
                    >
                      <div className="max-h-[240px] overflow-y-auto py-2">
                        {locationTree.map((node) => (
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
                style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
              >
                Move {selectedFiles.size} {selectedFiles.size === 1 ? "File" : "Files"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Upload File Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[3px]"
          style={{ background: "rgba(12,20,38,0.48)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUploadModal(false); }}
        >
          <div
            className="bg-white rounded-2xl w-[480px] flex flex-col overflow-hidden"
            style={{
              boxShadow: "0px 32px 64px -16px rgba(0,48,160,0.22), 0 0 0 1px rgba(18,28,40,0.07)",
              animation: "fade-slide-up 0.28s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#eef3ff]"
                >
                  <Upload className="w-[15px] h-[15px] text-[--val-primary-dark]" />
                </div>
                <div>
                  <p className="text-[17px] font-semibold tracking-[-0.4px] text-[#121c28] leading-tight">Add Files</p>
                  <p className="text-[12px] text-slate-400 leading-tight">Drag, drop, or browse</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-[color,background-color] duration-150"
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
                    <p className="text-[15px] font-semibold text-[--val-primary-dark] mb-3">
                      {pendingFiles.length} {pendingFiles.length === 1 ? "file" : "files"} ready to upload
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 mb-5 max-w-[380px] max-h-[72px] overflow-y-auto">
                      {pendingFiles.map((f) => (
                        <span
                          key={f.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-[--val-primary-dark] max-w-[180px] truncate"
                          style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.18)" }}
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
                  className="px-5 py-2 rounded-lg text-[13.5px] font-semibold transition-[background-color,transform] duration-150 active:scale-[0.96]"
                  style={{
                    color: "var(--val-primary-dark)",
                    background: "rgba(37,99,235,0.07)",
                    border: "1px solid rgba(37,99,235,0.22)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(37,99,235,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(37,99,235,0.07)")}
                >
                  {pendingFiles.length > 0 ? "Change Files" : "Select from Computer"}
                </button>
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
                style={{
                  background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                  boxShadow: "0 4px 6px -1px rgba(0,74,198,0.28), 0 2px 4px -2px rgba(0,74,198,0.15)",
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                {pendingFiles.length > 0
                  ? `Upload ${pendingFiles.length} ${pendingFiles.length === 1 ? "File" : "Files"}`
                  : "Upload File"}
              </button>
            </div>
          </div>
        </div>
      )}
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
            className="fixed bottom-5 right-5 z-50 w-[360px]"
            style={{ animation: "fade-slide-up 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <div
              className="flex flex-col overflow-hidden rounded-[20px] antialiased"
              style={{
                background: "#14181b",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              {/* Header — hidden when minimized */}
              {!panelMinimized && (
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2937]">
                  <span className="text-[16px] font-semibold text-white tracking-[-0.2px]">Uploads</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPanelMinimized(true)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
                      aria-label="Minimize"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowUploadPanel(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
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
                  <div className="flex items-start border-b border-[#1f2937] px-2 pt-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setUploadTab(tab.key)}
                        className={`px-2.5 pb-2.5 pt-2 text-[13px] font-medium border-b-2 transition-colors duration-150 whitespace-nowrap tabular-nums ${
                          uploadTab === tab.key
                            ? "border-[#2563eb] text-[#2563eb]"
                            : "border-transparent text-[#9ca3af] hover:text-slate-300"
                        }`}
                      >
                        {tab.label} ({tab.count})
                      </button>
                    ))}
                  </div>

                  {/* Upload List */}
                  <div className="flex flex-col gap-0.5 px-2 py-2 max-h-[280px] overflow-y-auto">
                    {visibleItems.length === 0 ? (
                      <p className="text-[13px] text-slate-500 text-center py-6">No items</p>
                    ) : visibleItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center py-2 px-2.5 rounded-lg transition-colors duration-150 ${
                          item.status === "failed" ? "bg-red-950/30" : ""
                        }`}
                      >
                        {/* File icon */}
                        <div className="shrink-0 mr-2.5">
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center"
                            style={{
                              background:
                                item.status === "done"   ? "rgba(34,197,94,0.1)" :
                                item.status === "failed" ? "rgba(239,68,68,0.1)" :
                                item.status === "uploading" ? "rgba(59,130,246,0.1)" :
                                "#374151",
                            }}
                          >
                            <FileText
                              className="w-3.5 h-3.5"
                              style={{
                                color:
                                  item.status === "done"   ? "#22c55e" :
                                  item.status === "failed" ? "#f87171" :
                                  item.status === "uploading" ? "#60a5fa" :
                                  "#9ca3af",
                              }}
                            />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-baseline justify-between mb-0.5">
                            <span className={`text-[13px] font-medium truncate max-w-[160px] ${item.status === "queued" ? "text-white/60" : "text-white"}`}>
                              {item.name}
                            </span>
                            <span className="text-[12px] text-[#9ca3af] shrink-0 ml-2 tabular-nums">
                              {item.status === "uploading" ? `${Math.round(item.progress)}%` : item.size}
                            </span>
                          </div>

                          {item.status === "uploading" && (
                            <>
                              <div className="w-full h-1.5 rounded-full bg-[#374151] mb-1">
                                <div
                                  className="h-1.5 rounded-full bg-[#2563eb] transition-[width] duration-200"
                                  style={{ width: `${item.progress}%`, willChange: "width" }}
                                />
                              </div>
                              <span className="text-[11px] text-[#9ca3af] tabular-nums">
                                {item.progress < 20 ? "Starting…" :
                                 item.progress < 80 ? `~${Math.ceil((100 - item.progress) / 8)} sec remaining` :
                                 "Almost done…"}
                              </span>
                            </>
                          )}

                          {item.status === "done" && (
                            <span className="text-[12px] font-medium text-[#22c55e]">Completed</span>
                          )}
                          {item.status === "failed" && (
                            <span className="text-[12px] font-medium text-[#f87171]">{item.error ?? "Upload failed"}</span>
                          )}
                          {item.status === "queued" && (
                            <span className="text-[12px] text-[#9ca3af]">Queued</span>
                          )}
                        </div>

                        {/* Action */}
                        {item.status === "done" && (
                          <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                        )}
                        {item.status === "failed" && (
                          <button
                            onClick={() => setUploadQueue((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "uploading" as UploadStatus, progress: 0, error: undefined } : i))}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-150 shrink-0"
                            aria-label="Retry"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        {(item.status === "uploading" || item.status === "queued") && (
                          <button
                            onClick={() => setUploadQueue((prev) => prev.filter((i) => i.id !== item.id))}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-150 shrink-0"
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
              <div className={`flex items-center justify-between px-4 py-3 transition-colors duration-500 ${doneCount === allCount && activeUploads === 0 ? "bg-[#16a34a]" : "bg-[#2563eb]"}`}>
                <div className="flex items-center gap-2.5">
                  {activeUploads > 0 ? (
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white shrink-0 animate-spin"
                    />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  )}
                  <span className="text-[13px] font-medium text-white tabular-nums">
                    {activeUploads > 0
                      ? `Uploading ${activeUploads} ${activeUploads === 1 ? "item" : "items"}`
                      : doneCount === allCount
                      ? "All uploads complete"
                      : `${doneCount} of ${allCount} done`}
                  </span>
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
}: {
  files: FileEntry[];
  onFileClick: (name: string) => void;
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
      <table className="w-full">
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
                onClick={() => onFileClick(f.name)}
                className={`border-t border-slate-100 cursor-pointer transition-colors duration-100 ${
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
  );
}

function GridView({
  files,
  onFileClick,
  selectMode,
  selectedFiles,
  onToggleFile,
}: {
  files: FileEntry[];
  onFileClick: (name: string) => void;
  selectMode: boolean;
  selectedFiles: Set<string>;
  onToggleFile: (name: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {files.map((f, i) => {
        const isChecked = selectedFiles.has(f.name);
        return (
          <div
            key={f.name}
            onClick={() => onFileClick(f.name)}
            className={`relative bg-white rounded-xl p-4 transition-all duration-200 cursor-pointer
              animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both] ${
              isChecked && selectMode
                ? "shadow-[0_0_0_2px_var(--val-primary-dark),0px_6px_20px_0px_rgba(18,28,40,0.10)] -translate-y-0.5"
                : "shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)]"
            }`}
            style={{ animationDelay: `${100 + i * 80}ms` }}
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
                />
              ) : (
                <f.icon className={`w-10 h-10 ${f.iconClass}`} />
              )}
            </div>
            <p className="text-[13px] font-medium truncate text-[--val-heading]">{f.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{f.size} · {f.date}</p>
          </div>
        );
      })}
    </div>
  );
}
