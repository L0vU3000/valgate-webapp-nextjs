"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Share2, MapPin, MoreVertical, LayoutGrid, Eye, Shield, DollarSign, Key, TrendingUp, Globe } from "lucide-react";
import type { Property } from "@/lib/data/types/property";

const tabs = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "documents", label: "Documents", icon: Eye },
  { key: "safety", label: "Safety", icon: Shield },
  { key: "ownership", label: "Ownership", icon: Key },
  { key: "rental", label: "Rental", icon: DollarSign },
  { key: "valuation", label: "Valuation", icon: TrendingUp },
  { key: "location", label: "Location", icon: Globe },
];

interface PropertyLayoutProps {
  activeTab: string;
  children: React.ReactNode;
  property: Property;
}

export function PropertyLayout({ activeTab, children, property }: PropertyLayoutProps) {
  const router = useRouter();
  const { id } = useParams();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.key === activeTab);
    const el = tabRefs.current[activeIndex];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col font-['Inter',sans-serif]">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/portfolio")}
            className="text-muted-foreground hover:text-foreground rounded-md p-0.5 hover:bg-accent/50 active:scale-90 transition-[color,background-color,transform] duration-150"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-muted-foreground text-[14px]">Property</span>
          <span className="text-muted-foreground text-[14px]">/</span>
          <span className="text-foreground text-[16px]" style={{ fontWeight: 600 }}>
            {property.code} {property.type}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-[#ECFDF5] text-[#059669] px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {property.health}% health score
            <span className="text-[#059669]">&#9432;</span>
          </span>
          <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground flex items-center gap-2 hover:bg-accent/50 hover:scale-[1.01] active:scale-[0.97] transition-[background-color,transform] duration-150">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[14px] flex items-center gap-2 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.97] transition-[background-color,transform,box-shadow] duration-150 hover:shadow-md">
            <MapPin className="w-4 h-4" />
            Get directions
          </button>
          <button className="text-muted-foreground hover:text-foreground hover:scale-110 active:scale-90 transition-[color,transform] duration-150">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-card border-b border-border px-6 flex gap-0 shrink-0 overflow-x-auto relative">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => router.push(`/property/${id}/${tab.key}`)}
            className={`group px-4 py-3 text-[14px] transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className={`w-4 h-4 transition-transform duration-200 ${
              activeTab === tab.key ? "" : "group-hover:scale-110"
            }`} />
            {tab.label}
          </button>
        ))}
        {/* Sliding active indicator */}
        {indicator.ready && (
          <div
            className="absolute bottom-0 h-0.5 bg-primary pointer-events-none"
            style={{
              left: indicator.left,
              width: indicator.width,
              transition: "left 300ms cubic-bezier(0.22,1,0.36,1), width 300ms cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
