import { z } from "zod";

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
  addressLine: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  yearBuilt: z.string().optional(),
  totalArea: z
    .string()
    .optional()
    .refine((s) => !s || /^\d+(\.\d+)?$/.test(s), {
      message: "Total area must be a number",
    }),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  parkingSpaces: z.string().optional(),
  storageUnit: z.string().optional(),
});

export const step3Schema = z.object({
  status: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.enum(["Rented", "Vacant", "Owner-Occupied"]).optional(),
  ),
  currentMarketValue: z
    .string()
    .optional()
    .refine((s) => !s || /^\d+$/.test(s), {
      message: "Market value must be a whole number (e.g. 150000)",
    }),
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
