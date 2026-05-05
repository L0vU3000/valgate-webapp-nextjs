import {
  Home,
  Building2,
  Store,
  LandPlot,
  Factory,
  HardHat,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { PropertyTypeChoice, PropertyStatus, PropertyTitle, TitleVariant } from "./data/types/property";

export const TYPE_LABEL: Record<PropertyTypeChoice, string> = {
  residential:  "Residential",
  commercial:   "Commercial",
  "multi-unit": "Multi-Unit",
  retail:       "Retail",
  land:         "Land",
  industrial:   "Industrial",
  construction: "Construction",
  other:        "Other",
};

export const TYPE_ICON: Record<PropertyTypeChoice, LucideIcon> = {
  residential:  Home,
  commercial:   Building2,
  "multi-unit": Building2,
  retail:       Store,
  land:         LandPlot,
  industrial:   Factory,
  construction: HardHat,
  other:        MoreHorizontal,
};

export const TYPE_COLOR: Record<PropertyTypeChoice, string> = {
  residential:  "bg-orange-100 text-orange-600",
  commercial:   "bg-blue-100 text-blue-600",
  "multi-unit": "bg-purple-100 text-purple-600",
  retail:       "bg-pink-100 text-pink-600",
  land:         "bg-emerald-100 text-emerald-600",
  industrial:   "bg-sky-100 text-sky-600",
  construction: "bg-amber-100 text-amber-600",
  other:        "bg-indigo-100 text-indigo-600",
};

export function typeBadgeClasses(type: PropertyTypeChoice): string {
  switch (type) {
    case "residential":  return "bg-orange-50 text-orange-600";
    case "commercial":   return "bg-blue-50 text-blue-600";
    case "multi-unit":   return "bg-purple-50 text-purple-600";
    case "retail":       return "bg-pink-50 text-pink-600";
    case "land":         return "bg-emerald-50 text-emerald-600";
    case "industrial":   return "bg-sky-50 text-sky-600";
    case "construction": return "bg-amber-50 text-amber-600";
    case "other":        return "bg-indigo-50 text-indigo-600";
  }
}

export function statusBadgeClasses(status: PropertyStatus): string {
  switch (status) {
    case "Rented":           return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Vacant":           return "bg-amber-50 text-amber-700 border border-amber-200";
    case "For Sale": return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Sold":     return "bg-slate-50 text-slate-500 border border-slate-200";
    case "Archived": return "bg-slate-100 text-slate-400 border border-slate-200";
  }
}

export function titleBadgeClasses(title: PropertyTitle): string {
  switch (title) {
    case "Hard title": return "bg-sky-50 text-sky-700 border border-sky-200";
    case "Soft title": return "bg-amber-50 text-amber-600 border border-amber-200";
    case "—":          return "";
  }
}

export function titleToVariant(title: PropertyTitle): TitleVariant {
  switch (title) {
    case "Hard title": return "hard";
    case "Soft title": return "soft";
    case "—":          return "none";
  }
}

export function healthDotColor(health: number) {
  if (health >= 80) return "bg-emerald-500";
  if (health >= 50) return "bg-amber-500";
  return "bg-red-400";
}

export function healthClass(health: number) {
  if (health >= 75) return "text-status-success-text";
  if (health >= 40) return "text-status-warning-text";
  return "text-status-danger-text";
}

export function healthBgClass(health: number) {
  if (health >= 75) return "bg-status-success";
  if (health >= 40) return "bg-status-warning";
  return "bg-status-danger";
}
