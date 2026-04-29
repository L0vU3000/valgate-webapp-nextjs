export interface Inspection {
  id: string;
  userId: string;
  propertyId: string;
  date: string;
  type: string;
  inspector: string;
  status: string;
  issues: number;
  createdAt: number;
  updatedAt: number;
}
