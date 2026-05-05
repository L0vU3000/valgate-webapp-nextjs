export type TitleVariant = "hard" | "soft" | "none";

export type PropertyStatus =
  | "Rented"
  | "Vacant"
  | "For Sale"
  | "Sold"
  | "Archived";
export type PropertyTitle = "Hard title" | "Soft title" | "—";

export type PropertyTypeChoice =
  | "residential"
  | "commercial"
  | "multi-unit"
  | "retail"
  | "land"
  | "industrial"
  | "construction"
  | "other";

export interface PropertyCore {
  id: string;
  userId: string;
  name: string;
  code: string;
  type: PropertyTypeChoice;
  status: PropertyStatus;
  health: number;
  lat: number;
  lng: number;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
}

export interface PropertyLocation {
  addressLine?: string;
  addressLine2?: string;
  city?: string;
  zip?: string;
  country?: string;
  province: string;
}

export interface PropertyFinance {
  purchasePrice?: string;
  purchaseDate?: number;
  currentMarketValue?: number;
  outstandingMortgage?: number;
  monthlyPayment?: number;
  interestRate?: number;
  annualPropertyTax?: number;
  taxAssessmentValue?: number;
  annualInsurance?: number;
  ownershipStatus?: string;
  buyNumeric: number;
}

export interface PropertyMedia {
  photoStorageIds?: string[];
  documentStorageIds?: string[];
  totalArea: string;
  yearBuilt?: string;
  bedrooms?: string;
  bathrooms?: string;
  parkingSpaces?: string;
  storageUnit?: string;
  title: PropertyTitle;
}

export type Property = PropertyCore &
  PropertyLocation &
  PropertyFinance &
  PropertyMedia;

export type PropertyListItem = Pick<
  Property,
  | "id"
  | "name"
  | "code"
  | "type"
  | "province"
  | "status"
  | "health"
  | "totalArea"
  | "title"
> & { buy: string };
