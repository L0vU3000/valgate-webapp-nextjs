import { z } from "zod";
import type { ProfessionalCategory } from "@/lib/data/types/professional";
import type { NewProfessional } from "@/lib/data/db/professionals";

export const PROFESSIONAL_CATEGORIES = [
  "Agent",
  "Lawyer",
  "Notary",
  "Maintenance",
  "Electrician",
  "Plumber",
  "Inspector",
  "Accountant",
] as const satisfies readonly ProfessionalCategory[];

export const CATEGORY_AVATAR_BG: Record<ProfessionalCategory, string> = {
  Agent: "bg-blue-400",
  Lawyer: "bg-purple-400",
  Notary: "bg-indigo-400",
  Maintenance: "bg-green-400",
  Accountant: "bg-emerald-400",
  Electrician: "bg-amber-400",
  Inspector: "bg-rose-400",
  Plumber: "bg-teal-400",
};

export const CATEGORY_BADGE: Record<ProfessionalCategory, string> = {
  Agent: "bg-blue-50 text-blue-700",
  Lawyer: "bg-purple-50 text-purple-700",
  Notary: "bg-indigo-50 text-indigo-700",
  Maintenance: "bg-green-50 text-green-700",
  Accountant: "bg-emerald-50 text-emerald-700",
  Electrician: "bg-amber-50 text-amber-700",
  Inspector: "bg-rose-50 text-rose-700",
  Plumber: "bg-teal-50 text-teal-700",
};

export const addProfessionalSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  company: z.string().trim().min(1, "Company or firm is required"),
  category: z.enum(PROFESSIONAL_CATEGORIES, {
    message: "Select a profession",
  }),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Enter a valid email address",
    ),
  phone: z.string().trim(),
  available: z.boolean(),
  propertyIds: z.array(z.string()),
});

export type AddProfessionalFormData = z.infer<typeof addProfessionalSchema>;

export const ADD_PROFESSIONAL_STEPS = [
  {
    key: "details",
    title: "Professional details",
    description: "Who they are and what service they provide.",
    fields: ["name", "company", "category"] as const,
  },
  {
    key: "contact",
    title: "Contact information",
    description: "How to reach them when you need assistance.",
    fields: ["email", "phone", "available"] as const,
  },
  {
    key: "properties",
    title: "Link to properties",
    description: "Optionally assign this contact to one or more properties in your portfolio.",
    fields: ["propertyIds"] as const,
  },
  {
    key: "review",
    title: "Review & add",
    description: "Confirm the details before saving to your directory.",
    fields: [] as const,
  },
] as const;

export const ADD_PROFESSIONAL_DEFAULTS: AddProfessionalFormData = {
  name: "",
  company: "",
  category: "Agent",
  email: "",
  phone: "",
  available: true,
  propertyIds: [],
};

export function buildProfessionalInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formDataToNewProfessional(
  data: AddProfessionalFormData,
  now: number = Date.now(),
): NewProfessional {
  const email = data.email.trim();
  const phone = data.phone.trim();

  return {
    name: data.name.trim(),
    company: data.company.trim(),
    category: data.category,
    email: email.length > 0 ? email : undefined,
    phone: phone.length > 0 ? phone : undefined,
    available: data.available,
    verified: false,
    rating: 0,
    reviewCount: 0,
    linkedProperties: data.propertyIds.length,
    initials: buildProfessionalInitials(data.name),
    avatarBg: CATEGORY_AVATAR_BG[data.category],
    createdAt: now,
    updatedAt: now,
  };
}
