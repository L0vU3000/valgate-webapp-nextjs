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
  // Display names (photos/documents) are the source of truth for the UI and persist in drafts.
  // photoFiles/documentFiles hold the actual blobs to upload to S3 on submit; they are appended
  // in lockstep with the names and stripped before a draft is persisted (blobs don't survive JSON).
  photoFiles?: File[];
  documentFiles?: File[];
  photoFile?: File;
  uploadFile?: File;
  photoFileName?: string;
  uploadFileName?: string;
}

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
