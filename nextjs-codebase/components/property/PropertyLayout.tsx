"use client";

import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Share2, MapPin, MoreVertical, LayoutGrid, Eye, Shield, Compass, DollarSign, Key, TrendingUp, Globe } from "lucide-react";

const tabs = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "documents", label: "Documents", icon: Eye },
  { key: "safety", label: "Safety", icon: Shield },
  { key: "spatial", label: "Spatial", icon: Compass },
  { key: "ownership", label: "Ownership", icon: Key },
  { key: "rental", label: "Rental", icon: DollarSign },
  { key: "valuation", label: "Valuation", icon: TrendingUp },
  { key: "surrounding", label: "Surrounding", icon: Globe },
];

interface PropertyLayoutProps {
  activeTab: string;
  children: React.ReactNode;
}

export function PropertyLayout({ activeTab, children }: PropertyLayoutProps) {
  const router = useRouter();
  const { id } = useParams();

  return (
    <div className="h-full flex flex-col font-['Inter',sans-serif]">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/portfolio")} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-muted-foreground text-[14px]">Property</span>
          <span className="text-muted-foreground text-[14px]">/</span>
          <span className="text-foreground text-[16px]" style={{ fontWeight: 600 }}>SR00015 Land</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-[#ECFDF5] text-[#059669] px-3 py-1 rounded-full text-[12px] flex items-center gap-1">
            28% health score
            <span className="text-[#059669]">&#9432;</span>
          </span>
          <button className="border border-border rounded-lg px-4 py-2 text-[14px] text-foreground flex items-center gap-2 hover:bg-accent/50">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[14px] flex items-center gap-2 hover:bg-primary/90">
            <MapPin className="w-4 h-4" />
            Get directions
          </button>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-card border-b border-border px-6 flex gap-0 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => router.push(`/property/${id}/${tab.key}`)}
            className={`px-4 py-3 text-[14px] border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
