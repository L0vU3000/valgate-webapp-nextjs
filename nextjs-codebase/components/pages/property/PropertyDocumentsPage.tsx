"use client";

import { useState } from "react";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import {
  ArrowLeft,
  FolderOpen,
  File,
  FileText,
  Image,
  Film,
  Archive,
  FileSpreadsheet,
  Presentation,
  LayoutGrid,
  List,
  BookOpen,
} from "lucide-react";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { DocumentDetailView } from "@/components/property/DocumentDetailView";

type ViewMode = "list" | "grid" | "pages";

const folders = [
  { name: "All Documents", icon: FolderOpen, color: "#2563EB", active: true },
  { name: "Title", icon: FileText, color: "#515D66" },
  { name: "Sales", icon: FileText, color: "#515D66" },
  { name: "Tax Receipt", icon: FileText, color: "#515D66" },
];

const subFolders = [
  { name: "Contract", color: "#2563EB" },
  { name: "Receipts", color: "#2563EB" },
  { name: "Tax", color: "#2563EB" },
  { name: "Rental", color: "#2563EB" },
  { name: "Images", color: "#2563EB" },
  { name: "Videos", color: "#2563EB" },
];

const files = [
  { name: "familyReunion2022.jpg", type: "image", icon: Image, color: "#059669", thumb: "https://images.unsplash.com/photo-1607005583234-531da6958271?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW1pbHklMjByZXVuaW9uJTIwb3V0ZG9vcnMlMjBncm91cHxlbnwxfHx8fDE3NzM3MzU1MDd8MA&ixlib=rb-4.1.0&q=80&w=1080" },
  { name: "travelDiaryItaly.jpg", type: "image", icon: Image, color: "#059669", thumb: "https://images.unsplash.com/photo-1638285240257-0d37f116d7d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBJdGFseSUyMGRpYXJ5JTIwbGFuZHNjYXBlfGVufDF8fHx8MTc3MzczNTUwN3ww&ixlib=rb-4.1.0&q=80&w=1080" },
  { name: "sunset-beach.png", type: "image", icon: Image, color: "#059669", thumb: "https://images.unsplash.com/photo-1631535152690-ba1a85229136?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdW5zZXQlMjB0cm9waWNhbCUyMGJlYWNoJTIwb2NlYW58ZW58MXx8fHwxNzczNzM1NTA3fDA&ixlib=rb-4.1.0&q=80&w=1080" },
  { name: "animatedLogoFinal.gif", type: "image", icon: Image, color: "#F59E0B", thumb: null },
  { name: "nature_wallpaperHD.png", type: "image", icon: Image, color: "#059669", thumb: "https://images.unsplash.com/photo-1655241238128-018bd3a70821?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aWxkZmxvd2VyJTIwbWVhZG93JTIwbmF0dXJlJTIwd2FsbHBhcGVyfGVufDF8fHx8MTc3MzczNTUwOHww&ixlib=rb-4.1.0&q=80&w=1080" },
  { name: "tree-trunk.png", type: "image", icon: Image, color: "#059669", thumb: "https://images.unsplash.com/photo-1644839046407-941d9ecbc515?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmVlJTIwdHJ1bmslMjBmb3Jlc3QlMjBjbG9zZXVwfGVufDF8fHx8MTc3MzczNTUwOHww&ixlib=rb-4.1.0&q=80&w=1080" },
  { name: "birthday-party-1.jpg", type: "image", icon: Image, color: "#059669", thumb: "https://images.unsplash.com/photo-1721804812395-12c7c963ca52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaXJ0aGRheSUyMHBhcnR5JTIwY2VsZWJyYXRpb24lMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NzM2ODA5NzV8MA&ixlib=rb-4.1.0&q=80&w=1080" },
  { name: "blog-artic.docx", type: "doc", icon: FileText, color: "#2563EB", thumb: null },
  { name: "Vacation_Photos_Italy.zip", type: "archive", icon: Archive, color: "#059669", thumb: null },
  { name: "Home_Renovation_Plan.xlsx", type: "spreadsheet", icon: FileSpreadsheet, color: "#E11D48", thumb: null },
  { name: "IRS-Returns-2026.xlsx", type: "spreadsheet", icon: FileSpreadsheet, color: "#059669", thumb: null },
  { name: "Group_Project_Presentation.pptx", type: "presentation", icon: Presentation, color: "#F59E0B", thumb: null },
  { name: "Book_Wishlist_2025.xlsx", type: "spreadsheet", icon: FileSpreadsheet, color: "#059669", thumb: null },
];

export function PropertyDocumentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeFolder, setActiveFolder] = useState("All Documents");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <PropertyLayout activeTab="documents">
      <div className="h-full max-w-[1160px] mx-auto w-full flex">
        {/* Left sidebar - folders */}
        <div className="w-[200px] bg-card border-r border-border p-4 shrink-0">
          <p className="text-[12px] text-muted-foreground mb-3" style={{ fontWeight: 600 }}>Folders</p>
          <div className="space-y-1">
            {folders.map((f) => (
              <button
                key={f.name}
                onClick={() => setActiveFolder(f.name)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[14px] transition-colors ${
                  activeFolder === f.name ? "text-primary" : "text-foreground hover:bg-accent/50"
                }`}
              >
                <f.icon className="w-4 h-4" style={{ color: activeFolder === f.name ? "#2563EB" : f.color }} />
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        {selectedFile ? (
          <DocumentDetailView
            documentName={selectedFile}
            onBack={() => setSelectedFile(null)}
          />
        ) : (
        <div className="flex-1 p-6 overflow-auto">
          {/* Back + title */}
          <button className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-[24px] text-foreground mb-6" style={{ fontWeight: 600 }}>SR00015 Documents</h1>

          {viewMode === "pages" ? (
            <PagesView viewMode={viewMode} setViewMode={setViewMode} />
          ) : (
            <>
              {/* Folders section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>Folders</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded ${viewMode === "grid" ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded ${viewMode === "list" ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {subFolders.map((sf) => (
                    <button
                      key={sf.name}
                      className="flex items-center gap-2 bg-accent/50 border border-border rounded-lg px-4 py-3 text-[14px] text-foreground hover:bg-accent transition-colors"
                    >
                      <FolderOpen className="w-5 h-5 text-primary" />
                      {sf.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Files section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>Files</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded ${viewMode === "grid" ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded ${viewMode === "list" ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {viewMode === "list" ? (
                  <ListView onFileClick={(name) => setSelectedFile(name)} />
                ) : (
                  <GridView onFileClick={(name) => setSelectedFile(name)} />
                )}
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </PropertyLayout>
  );
}

function ListView({ onFileClick }: { onFileClick: (name: string) => void }) {
  return (
    <div className="space-y-0">
      {files.map((f) => (
        <div
          key={f.name}
          onClick={() => onFileClick(f.name)}
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 rounded-lg cursor-pointer transition-colors"
        >
          <f.icon className="w-5 h-5 shrink-0" style={{ color: f.color }} />
          <span className="text-[14px] text-foreground">{f.name}</span>
        </div>
      ))}
    </div>
  );
}

function GridView({ onFileClick }: { onFileClick: (name: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {files.map((f) => (
        <div key={f.name} onClick={() => onFileClick(f.name)} className="cursor-pointer group">
          <div className="w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden mb-2 flex items-center justify-center border border-border">
            {f.thumb ? (
              <ImageWithFallback
                src={f.thumb}
                alt={f.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <f.icon className="w-10 h-10" style={{ color: f.color }} />
            )}
          </div>
          <p className="text-[12px] text-foreground truncate">{f.name}</p>
        </div>
      ))}
    </div>
  );
}

function PagesView({ viewMode, setViewMode }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void }) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] text-foreground" style={{ fontWeight: 600 }}>SR00015 Documents</h2>
          <h3 className="text-[18px] text-foreground mt-1" style={{ fontWeight: 600 }}>Document Summary</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setViewMode("grid")} className="p-1.5 rounded text-muted-foreground hover:text-foreground">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className="p-1.5 rounded text-muted-foreground hover:text-foreground">
            <List className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded bg-accent text-primary">
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left - Document content */}
        <div className="flex-1">
          <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sodales sed sapien quis
            rutrum. Integer viverra a neque in rhoncus. Pellentesque ut nisi velit. Cras commodo nec
            urna vitae eleifend. Donec ut augue tincidunt, sagittis enim in, lacinia eros. Proin nec tincidunt
            magna, quis lobortis nunc. Nulla congue, purus quis eleifend semper, arcu velit pellentesque
            odio, ut dictum nunc ipsum non magna.{" "}
            <span className="text-primary cursor-pointer">Read More</span>
          </p>

          <div className="grid grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <p className="text-[12px] text-muted-foreground">Bought Price</p>
                <p className="text-[20px] text-foreground" style={{ fontWeight: 600 }}>$100,000</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Page thumbnails */}
        <div className="w-[120px] flex flex-col gap-4 shrink-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[12px] text-muted-foreground mt-1">{i}.</span>
              <div className="w-[90px] h-[120px] bg-white border border-border rounded-md shadow-sm flex items-center justify-center overflow-hidden">
                <div className="text-center p-2">
                  <p className="text-[10px] text-foreground" style={{ fontWeight: 700 }}>Invoice</p>
                  <div className="w-full h-px bg-border my-1" />
                  <div className="space-y-0.5">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-[3px] bg-muted rounded-full" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}