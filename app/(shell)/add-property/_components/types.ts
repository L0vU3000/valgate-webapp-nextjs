export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const stepLabels = [
  "Start",
  "Property Type",
  "Basic Information",
  "Financial Information",
  "Photos & Documents",
  "Review & Submit",
  "Success",
];

export type WizardStatus = "" | "Rented" | "Vacant" | "Owner-Occupied";

export interface FormData {
  method: "" | "photo" | "upload" | "manual";
  propertyType: string;
  propertyName: string;
  status: WizardStatus;
  confirmedCode: string;
  addressLine: string;
  addressLine2: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  mapCenter?: [number, number];
  yearBuilt: string;
  totalArea: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  storageUnit: string;
  purchasePrice: string;
  purchaseDate: string;
  currentMarketValue: string;
  ownershipStatus: string;
  outstandingMortgage: string;
  monthlyPayment: string;
  interestRate: string;
  annualPropertyTax: string;
  taxAssessmentValue: string;
  annualInsurance: string;
  photos: string[];
  documents: string[];
  // photos[]/documents[] are the display names that drive the Step-4 grid and the Step-5 review.
  // stagedPhotos[]/stagedDocuments[] hold the server-staged file references (one per name, kept
  // index-aligned), created by stageDraftFile when a file is added on Step 4. The real bytes live
  // in S3 as property_draft_files; previews/downloads use short-lived signed URLs (getDraftFileUrl),
  // never blob: URLs. All four arrays are rebuilt from the draft's files on resume, so none of them
  // are persisted into the draft form jsonb (they're stripped before save).
  stagedPhotos?: StagedFileRef[];
  stagedDocuments?: StagedFileRef[];
  photoFile?: File;
  uploadFile?: File;
  photoFileName?: string;
  uploadFileName?: string;
}

// A reference to a file staged server-side (a property_draft_files row). `pending` is true only
// in the brief window between the user adding the file and stageDraftFile confirming the row —
// it has no server id yet and shows an uploading state.
export type StagedFileRef = {
  id: string;                 // DRFF-xxxx once staged; a temporary client id while pending
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  pending?: boolean;
};

export const defaultForm: FormData = {
  method: "",
  propertyType: "",
  propertyName: "",
  status: "",
  confirmedCode: "",
  addressLine: "",
  addressLine2: "",
  city: "",
  province: "",
  zip: "",
  country: "",
  yearBuilt: "",
  totalArea: "",
  bedrooms: "",
  bathrooms: "",
  parkingSpaces: "",
  storageUnit: "",
  purchasePrice: "",
  purchaseDate: "",
  currentMarketValue: "",
  ownershipStatus: "",
  outstandingMortgage: "",
  monthlyPayment: "",
  interestRate: "",
  annualPropertyTax: "",
  taxAssessmentValue: "",
  annualInsurance: "",
  photos: [],
  documents: [],
};

export type DraftRecord = {
  id: string;
  title: string;
  form: FormData;
  step: Step;
  updatedAt: number;
};
