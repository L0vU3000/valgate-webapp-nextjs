export interface EmergencyContact {
  id: string;
  userId: string;
  propertyId: string;
  name: string;
  phone: string;
  sub?: string;
  createdAt: number;
  updatedAt: number;
}
