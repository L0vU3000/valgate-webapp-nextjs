import { useEffect, useState } from "react";
import {
  X,
  Plus,
  Search,
  MapPin,
  Share2,
  Paperclip,
  Mic,
  Send,
  Settings,
  MessageCircle,
  FileText,
  TrendingUp,
  Zap,
  Archive,
  MessageSquare,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "../ui/utils";

interface AIOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SESSIONS = [
  { id: "1", title: "Queen St Lease Status", subtitle: "Active Now", active: true },
  { id: "2", title: "Portfolio Review Q3" },
  { id: "3", title: "Archived Agreements", archived: true },
];
 
const FILTERS = ["All", "Documents", "Charts", "Legal"];
  
function AIAvatar() {
  return (
    <div className="ai-glass-avatar size-8 rounded-lg bg-interactive-primary flex items-center justify-center shrink-0">
      <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
        <path d="M7 0L14 12H0L7 0Z" fill="white" fillOpacity="0.9" />
        <path d="M3.5 5L7 11L10.5 5" stroke="white" strokeWidth="1.2" fill="none" strokeOpacity="0.55" />
      </svg>
    </div>
  );
}

export function AIOverlay({ open, onClose }: AIOverlayProps) {
  const [activeSession, setActiveSession] = useState("1");
  const [activeFilter, setActiveFilter] = useState("all");
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* ── Layer 0: Frosted backdrop ── */}
      <div
        className="absolute inset-0 animate-[backdrop-frost_0.35s_ease-out_both]"
        onClick={onClose}
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(37,99,235,0.03), rgba(0,0,0,0.08) 70%)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* ── Layer 1: Outer glass shell ── */}
      <div
        className={cn(
          "ai-glass-shell",
          "relative flex w-full h-full overflow-hidden rounded-2xl",
          "animate-[glass-open_0.45s_cubic-bezier(0.16,1,0.3,1)_both]",
          "max-w-[1200px] max-h-[820px]",
        )}
      >
        {/* ── Layer 2a: Left sidebar glass pane ── */}
        <aside
          className={cn(
            "ai-glass-sidebar",
            "w-[288px] shrink-0 flex flex-col",
            "animate-[glass-panel-left_0.4s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]",
          )}
        >
          {/* Sidebar header */}
          <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="size-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(34,211,238,0.1))",
                    border: "1px solid rgba(37,99,235,0.15)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                  }}
                >
                  <Sparkles className="size-3.5 text-interactive-primary" />
                </div>
                <h2 className="text-[18px] font-bold font-display text-foreground leading-7">
                  Architect Core
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-secondary hover:text-foreground transition-all"
                style={{
                  background: "rgba(255,255,255,0.3)",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-status-success shadow-[0_0_6px_rgba(5,150,105,0.4)]" />
              <span className="text-xs font-medium text-secondary">v2.4.0 Online</span>
            </div>
            <button className="ai-glass-cta flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg text-interactive-primary-text text-sm font-semibold">
              <Plus className="size-4" />
              New Session
            </button>
          </div>

          <div className="ai-glass-divider-h mx-4" />

          {/* Search */}
          <div className="px-4 py-3">
            <div className="ai-glass-input relative rounded-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-secondary" />
              <input
                type="text"
                placeholder="Search history..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-transparent text-sm text-foreground placeholder:text-secondary outline-none border-0"
              />
            </div>
          </div>

          <div className="ai-glass-divider-h mx-4" />

          {/* Session list */}
          <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1 min-h-0">
            {SESSIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={cn(
                  "ai-glass-session flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left",
                  "animate-[glass-card-in_0.3s_ease-out_both]",
                  s.id === activeSession && "active",
                )}
                style={{ animationDelay: `${0.15 + i * 0.05}s` }}
              >
                <div
                  className={cn(
                    "shrink-0",
                    s.id === activeSession ? "text-interactive-primary" : "text-secondary",
                  )}
                >
                  {s.archived ? (
                    <Archive className="size-4.5" />
                  ) : (
                    <MessageSquare className="size-4.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      s.id === activeSession ? "text-interactive-primary" : "text-foreground",
                    )}
                  >
                    {s.title}
                  </p>
                  {s.subtitle && (
                    <p className="text-[10px] text-interactive-primary/70 mt-px">{s.subtitle}</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="ai-glass-divider-h mx-4" />

          {/* Footer */}
          <div className="px-2 py-3 flex flex-col gap-0.5">
            <button className="ai-glass-session flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left">
              <Settings className="size-4.5 text-secondary shrink-0" />
              <span className="text-sm text-secondary">System Status</span>
            </button>
            <button className="ai-glass-session flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left">
              <MessageCircle className="size-4.5 text-secondary shrink-0" />
              <span className="text-sm text-secondary">Feedback</span>
            </button>
          </div>
        </aside>

        {/* ── Layer 2b: Center chat glass pane ── */}
        <div
          className={cn(
            "ai-glass-chat",
            "flex-1 flex flex-col min-w-0",
            "animate-[glass-panel-center_0.4s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]",
          )}
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-8 h-16 shrink-0">
            <div>
              <h3 className="text-[18px] font-bold font-display text-foreground leading-7">
                Queen St Lease Status
              </h3>
              <div className="flex items-center gap-1">
                <MapPin className="size-3.5 text-secondary shrink-0" />
                <span className="text-xs text-secondary">142 Queen Street, CBD Portfolio</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "linear-gradient(135deg, rgba(172,191,255,0.6), rgba(172,191,255,0.35))",
                  border: "1px solid rgba(172,191,255,0.5)",
                  color: "#394c84",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                }}
              >
                Commercial
              </span>
              <button
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                <Share2 className="size-4.5 text-secondary" />
              </button>
            </div>
          </div>

          <div className="ai-glass-divider-h" />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 min-h-0">
            {/* AI message */}
            <div className="flex gap-4 max-w-[768px] animate-[glass-card-in_0.4s_ease-out_0.25s_both]">
              <AIAvatar />
              <div className="flex flex-col gap-4">
                <p className="text-[16px] leading-[26px] text-foreground">
                  I've analyzed the current lease status for the Queen Street property. The primary
                  tenant, <strong>Apex Solutions</strong>, is currently in their final year of the
                  first term. Based on the documentation, there are several renewal options available.
                </p>
                {/* Artifact card — glass layer 3 */}
                <div className="ai-glass-card flex gap-4 items-start p-5 rounded-xl">
                  <div
                    className="size-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(236,254,255,0.8), rgba(207,250,254,0.5))",
                      border: "1px solid rgba(207,250,254,0.7)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                    }}
                  >
                    <FileText className="size-5 text-[#0891b2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold tracking-[0.6px] text-[#0891b2] uppercase">
                        Artifact
                      </span>
                      <span className="text-[10px] text-secondary">PDF &bull; 2.4 MB</span>
                    </div>
                    <p className="text-[16px] font-semibold text-foreground leading-6">
                      Renewal Options - Clause 4.2
                    </p>
                    <p className="text-sm text-secondary mt-0.5 leading-5">
                      Detailed breakdown of market rent review mechanisms and option periods starting
                      Oct 2024.
                    </p>
                  </div>
                  <ChevronRight className="size-4.5 text-secondary shrink-0 mt-1" />
                </div>
              </div>
            </div>

            {/* User message */}
            <div className="flex gap-4 items-start animate-[glass-card-in_0.4s_ease-out_0.35s_both]">
              <div
                className="flex-1 max-w-[640px] px-4 py-4 rounded-bl-2xl rounded-br-2xl rounded-tl-2xl"
                style={{
                  background: "linear-gradient(135deg, var(--interactive-primary), color-mix(in srgb, var(--interactive-primary) 85%, #22d3ee))",
                  boxShadow:
                    "0 4px 16px color-mix(in srgb, var(--interactive-primary) 25%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                <p className="text-sm text-white leading-5">
                  Can you compare these renewal options with the current market rate for CBD
                  properties of similar size?
                </p>
              </div>
              <div
                className="size-8 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(232,234,237,0.8), rgba(209,213,219,0.5))",
                  border: "1px solid rgba(255,255,255,0.5)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <span className="text-xs font-semibold text-secondary">JD</span>
              </div>
            </div>

            {/* Thinking state */}
            <div className="flex gap-4 items-center animate-[glass-card-in_0.4s_ease-out_0.45s_both]">
              <AIAvatar />
              <div className="ai-glass-thinking flex items-center gap-1.5 px-4 py-4 rounded-2xl">
                <span className="ai-dot size-[6px] rounded-full bg-interactive-primary/40" />
                <span
                  className="ai-dot size-[6px] rounded-full bg-interactive-primary/40"
                  style={{ animationDelay: "160ms" }}
                />
                <span
                  className="ai-dot size-[6px] rounded-full bg-interactive-primary/40"
                  style={{ animationDelay: "320ms" }}
                />
                <span className="pl-2 text-xs font-medium text-interactive-primary">
                  Architect is pulling market data...
                </span>
              </div>
            </div>
          </div>

          {/* Input area — glass layer 3 */}
          <div className="px-6 py-6 shrink-0">
            <div className="ai-glass-input relative max-w-[896px] rounded-xl">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a follow-up or command an action..."
                rows={2}
                className="w-full px-4 pt-4 pb-12 rounded-xl bg-transparent text-sm text-foreground placeholder:text-secondary border-0 outline-none resize-none"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                <button
                  className="p-2 rounded-lg transition-all"
                  style={{
                    background: "rgba(255,255,255,0.3)",
                    border: "1px solid rgba(255,255,255,0.35)",
                  }}
                >
                  <Paperclip className="size-5 text-secondary" />
                </button>
                <button
                  className="p-2 rounded-lg transition-all"
                  style={{
                    background: "rgba(255,255,255,0.3)",
                    border: "1px solid rgba(255,255,255,0.35)",
                  }}
                >
                  <Mic className="size-5 text-secondary" />
                </button>
                <button className="ai-glass-cta flex items-center gap-2 px-4 py-2.5 rounded-lg text-interactive-primary-text text-sm font-semibold">
                  Send
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Layer 2c: Right assets glass pane ── */}
        <aside
          className={cn(
            "ai-glass-assets",
            "w-[320px] shrink-0 flex flex-col",
            "animate-[glass-panel-right_0.4s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]",
          )}
        >
          {/* Header */}
          <div className="flex flex-col gap-4 px-5 py-5">
            <h3 className="text-[16px] font-bold font-display text-foreground">Workspace Assets</h3>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f.toLowerCase())}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.5px] transition-all",
                    activeFilter === f.toLowerCase()
                      ? "ai-glass-cta text-interactive-primary-text"
                      : "text-secondary hover:text-interactive-primary",
                  )}
                  style={
                    activeFilter !== f.toLowerCase()
                      ? {
                          background: "rgba(255,255,255,0.5)",
                          border: "1px solid rgba(255,255,255,0.5)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                        }
                      : undefined
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-glass-divider-h mx-5" />

          {/* Asset cards — glass layer 3 */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
            {/* Yield Projection Tool */}
            <div
              className="ai-glass-card rounded-xl p-4 flex flex-col gap-2 animate-[glass-card-in_0.35s_ease-out_both]"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="size-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,247,237,0.8), rgba(255,237,213,0.5))",
                    border: "1px solid rgba(234,88,12,0.15)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                  }}
                >
                  <Zap className="size-4 text-[#ea580c]" />
                </div>
                <span className="text-sm font-semibold text-foreground">Yield Projection Tool</span>
              </div>
              <p className="text-[11px] text-secondary leading-[16.5px]">
                Calculate potential ROI based on proposed lease increments.
              </p>
            </div>

            {/* Lease Agreement */}
            <div
              className="ai-glass-card rounded-xl p-4 flex flex-col gap-3 animate-[glass-card-in_0.35s_ease-out_both]"
              style={{ animationDelay: "0.35s" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="size-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(239,246,255,0.8), rgba(219,234,254,0.5))",
                    border: "1px solid rgba(37,99,235,0.12)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                  }}
                >
                  <FileText className="size-4 text-interactive-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground truncate">
                  LeaseAgreement_V2.pdf
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{
                  background: "rgba(241,245,249,0.7)",
                  border: "1px solid rgba(255,255,255,0.4)",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "75%",
                    background: "linear-gradient(90deg, #22d3ee, color-mix(in srgb, #22d3ee 70%, var(--interactive-primary)))",
                    boxShadow: "0 0 8px rgba(34,211,238,0.3)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-[1px] uppercase text-status-success">
                  Verified
                </span>
                <span className="text-[10px] text-secondary">Modified 2h ago</span>
              </div>
            </div>

            {/* CBD Market Trend */}
            <div
              className="ai-glass-card rounded-xl p-4 flex flex-col gap-3 animate-[glass-card-in_0.35s_ease-out_both]"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(250,245,255,0.8), rgba(243,232,255,0.5))",
                      border: "1px solid rgba(147,51,234,0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                    }}
                  >
                    <TrendingUp className="size-4 text-[#9333ea]" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">CBD Market Trend</span>
                </div>
              </div>
              <div
                className="h-24 rounded-lg flex items-end justify-center gap-1 px-2 pb-2 pt-2"
                style={{
                  background: "linear-gradient(180deg, rgba(248,250,252,0.5), rgba(241,245,249,0.3))",
                  border: "1px solid rgba(255,255,255,0.4)",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                }}
              >
                {[
                  { h: 45, bg: "linear-gradient(180deg, #a5f3fc, rgba(165,243,252,0.6))" },
                  { h: 68, bg: "linear-gradient(180deg, #67e8f9, rgba(103,232,249,0.6))" },
                  { h: 62, bg: "linear-gradient(180deg, #22d3ee, rgba(34,211,238,0.6))" },
                  { h: 96, bg: "linear-gradient(180deg, var(--val-primary-dark), rgba(0,74,198,0.7))" },
                  { h: 79, bg: "linear-gradient(180deg, rgba(0,74,198,0.7), rgba(0,74,198,0.35))" },
                ].map((bar, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${bar.h}%`,
                      background: bar.bg,
                      boxShadow: "0 -2px 6px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.2)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="ai-glass-divider-h mx-5" />

          {/* Storage footer */}
          <div className="px-5 py-5 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold tracking-[0.6px] uppercase text-foreground">
                Storage Used
              </span>
              <span className="text-xs text-secondary">84%</span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{
                background: "rgba(226,232,240,0.5)",
                border: "1px solid rgba(255,255,255,0.4)",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: "84%",
                  background: "linear-gradient(90deg, var(--interactive-primary), color-mix(in srgb, var(--interactive-primary) 80%, #22d3ee))",
                  boxShadow: "0 0 8px color-mix(in srgb, var(--interactive-primary) 30%, transparent)",
                }}
              />
            </div>
            <button
              className="w-full py-2.5 rounded-lg text-interactive-primary text-xs font-semibold transition-all hover:shadow-[0_4px_12px_rgba(37,99,235,0.15)]"
              style={{
                background: "rgba(255,255,255,0.5)",
                border: "2px solid var(--interactive-primary)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              Upgrade Storage
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
