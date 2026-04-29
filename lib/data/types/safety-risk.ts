export interface SafetyRisk {
  id: string;
  userId: string;
  propertyId: string;
  severityLabel: string;
  title: string;
  desc: string;
  createdAt: number;
  updatedAt: number;
}
