export type PaymentKind = "Rent" | "Fee" | "Deposit" | "Refund";
export type PaymentStatus = "Paid" | "Pending" | "Failed" | "Overdue";

export interface Payment {
  id: string;
  userId: string;
  propertyId: string;
  leaseId?: string;
  tenantId?: string;
  date: number;
  kind: PaymentKind;
  amount: number;
  method: string;
  status: PaymentStatus;
}
