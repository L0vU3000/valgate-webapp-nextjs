"use client";

import { useEffect, useRef, useState } from "react";
import { Home, X, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/components/ui/utils";
import {
  useWorkspaceTabs,
  getAvailableClientsForPicker,
  type WorkspaceTab,
} from "./WorkspaceTabProvider";
import { HEALTH_DOT } from "@/app/(pro)/pro/_data/mock";

export function WorkspaceTabBar() {
  const {
    openTabs,
    activeTabId,
    activateTab,
    closeTab,
    reorderTabs,
    openClientTab,
  } = useWorkspaceTabs();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);

  const visibleLimit = 5;
  const hasOverflow = openTabs.length > visibleLimit;
  const visibleTabs = hasOverflow ? openTabs.slice(0, visibleLimit) : openTabs;
  const overflowTabs = hasOverflow ? openTabs.slice(visibleLimit) : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        setPickerOpen(false);
      }
      if (overflowRef.current && !overflowRef.current.contains(target)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      return;
    }
    reorderTabs(dragIndex, index);
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-border-default bg-[#F4F5F7]">
      <div
        role="tablist"
        aria-label="Workspace tabs"
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleTabs.map((tab, index) => (
          <WorkspaceTabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onActivate={() => activateTab(tab.id)}
            onClose={() => closeTab(tab.id)}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(event) => handleDragOver(event, index)}
            onDragEnd={handleDragEnd}
            isDragging={dragIndex === index}
          />
        ))}

        {hasOverflow && (
          <div ref={overflowRef} className="relative">
            <button
              type="button"
              aria-label="More tabs"
              aria-expanded={overflowOpen}
              onClick={() => setOverflowOpen((open) => !open)}
              className="inline-flex h-full shrink-0 items-center px-2 text-secondary hover:bg-black/[0.04] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {overflowOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-md border border-border-default bg-surface-base py-1 shadow-lg">
                {overflowTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      activateTab(tab.id);
                      setOverflowOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-surface-tint"
                  >
                    {tab.kind === "dashboard" ? (
                      <Home className="h-3.5 w-3.5" />
                    ) : (
                      <span
                        className={cn(
                          "inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-semibold",
                          tab.avatarColor,
                        )}
                      >
                        {tab.initials}
                      </span>
                    )}
                    <span className="truncate">
                      {tab.kind === "dashboard" ? "Dashboard" : tab.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div ref={pickerRef} className="relative">
        <button
          type="button"
          aria-label="Open client in new tab"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
          className="inline-flex h-full w-9 shrink-0 items-center justify-center border-l border-border-default text-secondary hover:bg-black/[0.04] transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
        {pickerOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border-default bg-surface-base py-1 shadow-lg">
            {getAvailableClientsForPicker().map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  openClientTab(client.id);
                  setPickerOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-surface-tint"
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
                    client.avatarColor,
                  )}
                >
                  {client.initials}
                </span>
                <span className="truncate">{client.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type WorkspaceTabItemProps = {
  tab: WorkspaceTab;
  isActive: boolean;
  isDragging: boolean;
  onActivate: () => void;
  onClose: () => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragEnd: () => void;
};

function WorkspaceTabItem({
  tab,
  isActive,
  isDragging,
  onActivate,
  onClose,
  onDragStart,
  onDragOver,
  onDragEnd,
}: WorkspaceTabItemProps) {
  const isDashboard = tab.kind === "dashboard";
  const label = isDashboard ? "Dashboard" : tab.name;

  return (
    <div
      role="presentation"
      draggable={!isDashboard}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex max-w-[220px] min-w-[120px] shrink-0 items-center border-r border-border-default",
        isActive
          ? "border-t-2 border-t-interactive-primary bg-surface-base"
          : "border-t-2 border-t-transparent hover:bg-black/[0.03]",
        isDragging && "opacity-60",
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={onActivate}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 py-0 pl-3 text-[13px] font-medium transition-colors",
          isDashboard ? "pr-3" : "pr-1",
          isActive ? "text-foreground" : "text-secondary",
        )}
      >
        {isDashboard ? (
          <>
            <Home className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-semibold",
                tab.avatarColor,
              )}
            >
              {tab.initials}
            </span>
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                HEALTH_DOT[tab.health],
              )}
            />
            <span className="min-w-0 truncate">{label}</span>
          </>
        )}
      </button>

      {!isDashboard && (
        <button
          type="button"
          aria-label={`Close ${label} tab`}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className={cn(
            "mr-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-secondary hover:bg-surface-tint",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
