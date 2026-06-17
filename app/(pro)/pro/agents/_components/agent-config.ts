import { DollarSign, ShieldAlert, Wrench, FileText, BarChart3 } from "lucide-react";
import type { ElementType } from "react";
import type { AgentKey } from "@/lib/data/types/agent-run";

export type AgentCfg = {
  label: string;
  Icon: ElementType;
  color: string;
  bg: string;
  border: string;
  dot: string;
  ringBorder: string;
};

export const AGENT_CONFIG: Record<AgentKey, AgentCfg> = {
  "rent-watch": {
    label: "Rent Watch",
    Icon: DollarSign,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-400",
    ringBorder: "border-blue-400/50",
  },
  "compliance-sentinel": {
    label: "Compliance Sentinel",
    Icon: ShieldAlert,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    dot: "bg-rose-400",
    ringBorder: "border-rose-400/50",
  },
  "maintenance-coordinator": {
    label: "Maintenance Coordinator",
    Icon: Wrench,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-400",
    ringBorder: "border-orange-400/50",
  },
  "lease-renewal": {
    label: "Lease Renewal",
    Icon: FileText,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    dot: "bg-purple-400",
    ringBorder: "border-purple-400/50",
  },
  "portfolio-analyst": {
    label: "Portfolio Analyst",
    Icon: BarChart3,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    dot: "bg-teal-400",
    ringBorder: "border-teal-400/50",
  },
};
