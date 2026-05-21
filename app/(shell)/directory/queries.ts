import "server-only";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";

export type Category =
  | "All"
  | "Agent"
  | "Lawyer"
  | "Notary"
  | "Electrician"
  | "Plumber"
  | "Inspector"
  | "Maintenance"
  | "Accountant";

export type Professional = {
  id: string;
  name: string;
  company: string;
  category: Exclude<Category, "All">;
  rating: number;
  reviewCount: number;
  linkedProperties: number;
  available: boolean;
  initials: string;
  avatarBg: string;
  email?: string;
  phone?: string;
  verified: boolean;
};

export type DirectoryPageData = {
  professionals: Professional[];
  categories: Category[];
};

export async function getDirectoryPageData(): Promise<DirectoryPageData> {
  const userId = getCurrentUserId();
  const dbProfessionals = await db.professionals.list(userId);

  const professionals: Professional[] = dbProfessionals.map((p) => ({
    id: p.id,
    name: p.name,
    company: p.company,
    category: p.category as Exclude<Category, "All">,
    rating: p.rating,
    reviewCount: p.reviewCount,
    linkedProperties: p.linkedProperties,
    available: p.available,
    initials: p.initials,
    avatarBg: p.avatarBg,
    email: p.email,
    phone: p.phone,
    verified: p.verified ?? false,
  }));

  return {
    professionals,
    categories: [
      "All", "Agent", "Lawyer", "Notary", "Maintenance", "Electrician", "Plumber", "Inspector", "Accountant",
    ],
  };
}
