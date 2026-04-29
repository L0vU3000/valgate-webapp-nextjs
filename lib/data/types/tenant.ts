export type TenantStatus = "Paid" | "Overdue" | "Pending";

export interface Tenant {
  id: string;
  userId: string;
  propertyId: string;
  name: string;
  unit: string;
  rent: number;
  status: TenantStatus;
  email?: string;
  phone?: string;
}
