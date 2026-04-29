export interface UserProfile {
  id: string;       // === userId
  userId: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  employeeId?: string;
  email?: string;
  phone?: string;
  officeLocation?: string;
  language?: string;
  timezone?: string;
  currency?: string;
  role?: string;
  memberSince?: number;
  lastLogin?: number;
  createdAt: number;
  updatedAt: number;
}
