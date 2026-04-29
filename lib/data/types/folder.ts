export interface Folder {
  id: string;
  userId: string;
  propertyId: string;
  parentFolderId?: string;
  name: string;
  createdAt: number;
}
