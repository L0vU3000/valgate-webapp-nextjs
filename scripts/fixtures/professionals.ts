import type { NewProfessional } from "@/lib/data/db/professionals";

const now = Date.UTC(2026, 3, 1);

export const professionals: NewProfessional[] = [
  {
    name: "Sok Dara",
    company: "Phnom Penh Notary Office",
    category: "Notary",
    rating: 4.9,
    reviewCount: 82,
    linkedProperties: 4,
    available: true,
    initials: "SD",
    avatarBg: "bg-indigo-400",
    createdAt: now,
    updatedAt: now,
  },
  {
    name: "Chea Sophal",
    company: "Pro Fix Cambodia",
    category: "Maintenance",
    rating: 5.0,
    reviewCount: 206,
    linkedProperties: 18,
    available: true,
    initials: "CS",
    avatarBg: "bg-green-400",
    createdAt: now,
    updatedAt: now,
  },
  {
    name: "Heng Virak",
    company: "Virak Electric Co.",
    category: "Electrician",
    rating: 4.8,
    reviewCount: 115,
    linkedProperties: 21,
    available: false,
    initials: "HV",
    avatarBg: "bg-amber-400",
    createdAt: now,
    updatedAt: now,
  },
];
