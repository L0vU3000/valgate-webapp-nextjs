export type TitleVariant = "hard" | "soft" | "none";

export type PropertyTypeCode = "Land" | "House" | "Building";
export type PropertyStatus = "Rented" | "Vacant";
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
  type: PropertyTypeCode;
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
  stateProv?: string;
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
  buy: string;
  buyNumeric: number;
}

export interface PropertyMedia {
  photoStorageIds?: string[];
  documentStorageIds?: string[];
  size: string;
  yearBuilt?: string;
  totalArea?: string;
  bedrooms?: string;
  bathrooms?: string;
  parkingSpaces?: string;
  storageUnit?: string;
  title: PropertyTitle;
  titleVariant: TitleVariant;
  propertyType?: PropertyTypeChoice;
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
  | "buy"
  | "health"
>;
