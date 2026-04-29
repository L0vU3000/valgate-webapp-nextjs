export interface Successor {
  id: string;
  userId: string;
  name: string;
  initials: string;
  relation: string;
  role: "primary" | "contingent";
  share: number;
  verified: boolean;
  createdAt: number;
  updatedAt: number;
}
