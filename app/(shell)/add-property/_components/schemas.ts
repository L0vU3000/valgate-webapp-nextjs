import { z } from "zod";

const numericString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "Must be a number");

export const step1Schema = z.object({
  propertyType: z.enum([
    "residential",
    "commercial",
    "multi-unit",
    "retail",
    "land",
    "industrial",
    "construction",
    "other",
  ], { message: "Please select a property type" }),
});

export const step2Schema = z.object({
  propertyName: z.string().min(1, "Please enter a property name"),
  addressLine: z.string().min(1, "Please enter an address"),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().min(1, "Please select a province"),
  zip: z.string().optional(),
  country: z.string().optional(),
  yearBuilt: z.string().optional(),
  totalArea: numericString.refine((s) => s.length > 0, {
    message: "Please enter a total area",
  }),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  parkingSpaces: z.string().optional(),
  storageUnit: z.string().optional(),
});

export const step3Schema = z.object({
  status: z.enum(["Rented", "Vacant", "Owner-Occupied"], {
    message: "Please choose a current status",
  }),
  currentMarketValue: z
    .string()
    .min(1, "Please enter an estimated market value")
    .regex(/^\d+$/, "Market value must be a whole-dollar amount"),
  purchasePrice: z.string().optional(),
  purchaseDate: z.string().optional(),
  ownershipStatus: z.string().optional(),
  outstandingMortgage: z.string().optional(),
  monthlyPayment: z.string().optional(),
  interestRate: z.string().optional(),
  annualPropertyTax: z.string().optional(),
  taxAssessmentValue: z.string().optional(),
  annualInsurance: z.string().optional(),
});

export const step4Schema = z.object({
  photos: z.array(z.string()).optional(),
  documents: z.array(z.string()).optional(),
  photoFileName: z.string().optional(),
  uploadFileName: z.string().optional(),
});

export const fullPropertySchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema);

export type FullPropertyInput = z.infer<typeof fullPropertySchema>;
