export type DocumentKind = "photo" | "document";

export interface Document {
  id: string;
  userId: string;
  propertyId: string;
  folderId?: string;
  name: string;
  kind: DocumentKind;
  mimeType?: string;
  extension?: string;
  sizeBytes?: number;
  storageId: string;
  thumbStorageId?: string;
  category?: string;
  uploadedBy?: string;
  uploadedAt: number;
}
