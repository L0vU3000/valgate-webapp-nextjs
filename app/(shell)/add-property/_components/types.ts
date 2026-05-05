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

export interface FormData {
  method: "" | "photo" | "upload" | "manual";
  propertyType: string;
  propertyName: string;
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
  photoFile?: File;
  uploadFile?: File;
  photoFileName?: string;
  uploadFileName?: string;
}

export const defaultForm: FormData = {
  method: "",
  propertyType: "",
  propertyName: "",
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
