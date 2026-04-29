export type LeaseStage = "Approaching" | "Offered" | "Signed" | "Declined";

export interface Lease {
  id: string;
  userId: string;
  propertyId: string;
  tenantId?: string;
  unit: string;
  stage: LeaseStage;
  startDate: number;
  endDate: number;
  monthlyRent: number;
  termMonths: number;
  renewalStatus?: string;
}
