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
  id: number;
  name: string;
  company: string;
  category: Exclude<Category, "All">;
  rating: number;
  reviewCount: number;
  linkedProperties: number;
  available: boolean;
  initials: string;
  avatarBg: string;
};

export type DirectoryPageData = {
  professionals: Professional[];
  categories: Category[];
};

export async function getDirectoryPageData(): Promise<DirectoryPageData> {
  return {
    professionals: [
      {
        id: 1,
        name: "Sarah Mitchell",
        company: "Luxe Realty Group",
        category: "Agent",
        rating: 5.0,
        reviewCount: 124,
        linkedProperties: 12,
        available: true,
        initials: "SM",
        avatarBg: "bg-blue-400",
      },
      {
        id: 2,
        name: "Sok Dara",
        company: "Phnom Penh Notary Office",
        category: "Notary",
        rating: 4.9,
        reviewCount: 82,
        linkedProperties: 4,
        available: false,
        initials: "SD",
        avatarBg: "bg-indigo-400",
      },
      {
        id: 3,
        name: "Chea Sophal",
        company: "Pro Fix Cambodia",
        category: "Maintenance",
        rating: 5.0,
        reviewCount: 206,
        linkedProperties: 18,
        available: true,
        initials: "CS",
        avatarBg: "bg-green-400",
      },
      {
        id: 4,
        name: "Ly Bopha",
        company: "ClearBooks Cambodia",
        category: "Accountant",
        rating: 4.1,
        reviewCount: 54,
        linkedProperties: 8,
        available: false,
        initials: "LB",
        avatarBg: "bg-emerald-400",
      },
      {
        id: 5,
        name: "Heng Virak",
        company: "Virak Electric Co.",
        category: "Electrician",
        rating: 4.8,
        reviewCount: 115,
        linkedProperties: 21,
        available: true,
        initials: "HV",
        avatarBg: "bg-amber-400",
      },
      {
        id: 6,
        name: "Noun Sreymom",
        company: "Cambodia Property Inspections",
        category: "Inspector",
        rating: 5.0,
        reviewCount: 39,
        linkedProperties: 31,
        available: true,
        initials: "NS",
        avatarBg: "bg-rose-400",
      },
    ],
    categories: [
      "All", "Agent", "Lawyer", "Notary", "Maintenance", "Electrician", "Plumber", "Inspector", "Accountant",
    ],
  };
}
