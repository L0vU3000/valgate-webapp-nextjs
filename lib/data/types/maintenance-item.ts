export type MaintenanceSeverity = "Emergency" | "Urgent" | "Standard";
export type MaintenanceStatus = "Open" | "InProgress" | "Resolved";

export interface MaintenanceItem {
  id: string;
  userId: string;
  propertyId: string;
  severity: MaintenanceSeverity;
  title: string;
  status: MaintenanceStatus;
  createdAt: number;
}
