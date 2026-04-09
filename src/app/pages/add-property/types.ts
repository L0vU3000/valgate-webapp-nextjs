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
  method: string;
  propertyType: string;
  propertyName: string;
  propertyId: string;
  addressLine: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
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
}

export const defaultForm: FormData = {
  method: "",
  propertyType: "",
  propertyName: "Sunset Villa",
  propertyId: "SR00015",
  addressLine: "#24, Street 337, Sangkat Boeung Kak",
  addressLine2: "",
  city: "Phnom Penh",
  state: "",
  zip: "",
  country: "Cambodia",
  yearBuilt: "2018",
  totalArea: "2,450",
  bedrooms: "3",
  bathrooms: "2",
  parkingSpaces: "2",
  storageUnit: "1",
  purchasePrice: "$250,000",
  purchaseDate: "Jan 15, 2024",
  currentMarketValue: "$275,000",
  ownershipStatus: "Financed",
  outstandingMortgage: "$180,000",
  monthlyPayment: "$1,234",
  interestRate: "4.5%",
  annualPropertyTax: "$3,200",
  taxAssessmentValue: "$240,000",
  annualInsurance: "$1,800",
  photos: ["123.jpg", "123.jpg", "123.jpg", "123.jpg", "123.jpg", "123.jpg", "123.jpg"],
  documents: ["Title_Deed_SR00015.pdf", "Property_Inspection_Report.pdf", "Purchase_Agreement_2024.pdf"],
};
