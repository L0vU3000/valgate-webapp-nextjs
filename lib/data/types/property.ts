import { z } from "zod";
import { idSchema, userIdSchema, timestampSchema } from "./_common";
import type { ProgressDetails } from "./progress";

export const propertyStatusSchema = z.enum([
  "Rented",
  "Vacant",
  "For Sale",
  "Sold",
  "Archived",
  "Owner-Occupied",
]);
export type PropertyStatus = z.infer<typeof propertyStatusSchema>;

export const propertyTitleSchema = z.enum(["Hard title", "Soft title", "—"]);
export type PropertyTitle = z.infer<typeof propertyTitleSchema>;

export const propertyTypeChoiceSchema = z.enum([
  "residential",
  "commercial",
  "multi-unit",
  "retail",
  "land",
  "industrial",
  "construction",
  "other",
]);
export type PropertyTypeChoice = z.infer<typeof propertyTypeChoiceSchema>;

export const titleVariantSchema = z.enum(["hard", "soft", "none"]);
export type TitleVariant = z.infer<typeof titleVariantSchema>;

export const propertyUseSchema = z.enum(["investment", "personal", "holiday"]);
export type PropertyUse = z.infer<typeof propertyUseSchema>;

export const PropertyCoreSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  name: z.string().min(1),
  code: z.string().min(1),
  type: propertyTypeChoiceSchema,
  status: propertyStatusSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  isArchived: z.boolean().optional(),
  propertyUse: propertyUseSchema.optional(),
  rentalVerified: z.boolean().optional(),
  rentalVerifiedAt: timestampSchema.optional(),
  rentalEvidenceDocIds: z.array(idSchema).optional(),
  estateVerified: z.boolean().optional(),
  estateVerifiedAt: timestampSchema.optional(),
  estateEvidenceDocIds: z.array(idSchema).optional(),
});
export type PropertyCore = z.infer<typeof PropertyCoreSchema>;

export const PropertyLocationSchema = z.object({
  addressLine: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  province: z.string().min(1),
  locationVerified: z.boolean().optional(),
  locationVerifiedAt: timestampSchema.optional(),
  locationEvidenceDocIds: z.array(idSchema).optional(),
});
export type PropertyLocation = z.infer<typeof PropertyLocationSchema>;

export const PropertyFinanceSchema = z.object({
  purchasePrice: z.string().optional(),
  purchaseDate: z.number().int().nonnegative().optional(),
  currentMarketValue: z.number().nonnegative().optional(),
  outstandingMortgage: z.number().nonnegative().optional(),
  monthlyPayment: z.number().nonnegative().optional(),
  interestRate: z.number().nonnegative().optional(),
  annualPropertyTax: z.number().nonnegative().optional(),
  taxAssessmentValue: z.number().nonnegative().optional(),
  annualInsurance: z.number().nonnegative().optional(),
  ownershipStatus: z.string().optional(),
  buyNumeric: z.number().nonnegative(),
  financialsVerified: z.boolean().optional(),
  financialsVerifiedAt: timestampSchema.optional(),
  financialsEvidenceDocIds: z.array(idSchema).optional(),
});
export type PropertyFinance = z.infer<typeof PropertyFinanceSchema>;

export const PropertyMediaSchema = z.object({
  photoStorageIds: z.array(z.string()).optional(),
  documentStorageIds: z.array(z.string()).optional(),
  totalArea: z.string(),
  yearBuilt: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  parkingSpaces: z.string().optional(),
  storageUnit: z.string().optional(),
  title: propertyTitleSchema,
});
export type PropertyMedia = z.infer<typeof PropertyMediaSchema>;

export const PropertySchema = PropertyCoreSchema
  .merge(PropertyLocationSchema)
  .merge(PropertyFinanceSchema)
  .merge(PropertyMediaSchema);

export type Property = z.infer<typeof PropertySchema>;

export const PropertyListItemSchema = PropertySchema.pick({
  id: true,
  name: true,
  code: true,
  type: true,
  province: true,
  status: true,
  totalArea: true,
  title: true,
}).extend({
  buy: z.string(),
  buyNumeric: z.number(),
  isArchived: z.boolean().optional(),
  progress: z.number().int().min(0).max(100),
});

export type PropertyListItem = z.infer<typeof PropertyListItemSchema> & {
  progressDetails?: ProgressDetails;
};

export type { ProgressDetails };
