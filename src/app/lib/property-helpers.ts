import {
  Home,
  Building2,
  Map,
  type LucideIcon,
} from "lucide-react";

export const TYPE_ICON: Record<string, LucideIcon> = {
  House: Home,
  Building: Building2,
  Land: Map,
};

export const TYPE_COLOR: Record<string, string> = {
  House: "bg-blue-100 text-blue-600",
  Building: "bg-amber-100 text-amber-600",
  Land: "bg-emerald-100 text-emerald-600",
};

export function typeBadgeClasses(type: string) {
  switch (type) {
    case "House":    return "bg-blue-50 text-blue-600";
    case "Building": return "bg-amber-50 text-amber-600";
    case "Land":     return "bg-emerald-50 text-emerald-600";
    default:         return "bg-slate-100 text-slate-500";
  }
}

export function statusBadgeClasses(status: string) {
  switch (status) {
    case "Rented": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Vacant": return "bg-amber-50 text-amber-700 border border-amber-200";
    default:       return "bg-slate-100 text-slate-500 border border-slate-200";
  }
}

export function titleBadgeClasses(title: string) {
  switch (title) {
    case "Hard title": return "bg-sky-50 text-sky-700 border border-sky-200";
    case "Soft title": return "bg-amber-50 text-amber-600 border border-amber-200";
    default:           return "";
  }
}

export function healthDotColor(health: number) {
  if (health >= 80) return "bg-emerald-500";
  if (health >= 50) return "bg-amber-500";
  return "bg-red-400";
}
