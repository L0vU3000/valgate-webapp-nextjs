import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { getProfessional } from "@/lib/services/professionals";

export type ProfessionalProfileData = {
  id: string;
  name: string;
  company: string;
  category: string;
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

export async function getProfessionalProfileData(
  id: string,
): Promise<ProfessionalProfileData | null> {
  const authCtx = await requireCtx();
  const p = await getProfessional(authCtx, id);
  if (!p) return null;

  return {
    id: p.id,
    name: p.name,
    company: p.company,
    category: p.category,
    rating: p.rating,
    reviewCount: p.reviewCount,
    linkedProperties: p.linkedProperties,
    available: p.available,
    initials: p.initials,
    avatarBg: p.avatarBg,
    email: p.email,
    phone: p.phone,
    verified: p.verified ?? false,
  };
}
