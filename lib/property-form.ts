import { z } from "zod";
import { step2Schema, step3Schema } from "@/app/_shared/add-property/schemas";
import type { Property } from "@/lib/data/types/property";

export const EDITABLE_STATUSES = ["Rented", "Vacant", "For Sale", "Sold"] as const;
export type EditableStatus = (typeof EDITABLE_STATUSES)[number];

export const PROPERTY_TYPES = [
  "residential",
  "commercial",
  "multi-unit",
  "retail",
  "land",
  "industrial",
  "construction",
  "other",
] as const;

export const OWNERSHIP_STATUSES = [
  "Owned outright",
  "Mortgaged",
  "Leasehold",
  "Co-owned",
  "Other",
] as const;

export const editPropertySchema = step2Schema
  .merge(step3Schema)
  .extend({
    propertyType: z
      .enum([
        "residential",
        "commercial",
        "multi-unit",
        "retail",
        "land",
        "industrial",
        "construction",
        "other",
        "",
      ])
      .optional(),
    status: z.enum(["Rented", "Vacant", "For Sale", "Sold"]).optional(),
  });

export type EditPropertyFormData = z.infer<typeof editPropertySchema>;

export const PROPERTY_PROFILE_STEPS = [
  {
    key: "details",
    title: "Property details",
    description: "Name, type, status, and physical attributes.",
    fields: [
      "propertyName",
      "propertyType",
      "status",
      "totalArea",
      "yearBuilt",
      "bedrooms",
      "bathrooms",
      "parkingSpaces",
      "storageUnit",
    ] as const,
  },
  {
    key: "address",
    title: "Address",
    description: "Where this property is located.",
    fields: [
      "addressLine",
      "addressLine2",
      "city",
      "province",
      "zip",
      "country",
    ] as const,
  },
  {
    key: "financial",
    title: "Financial profile",
    description: "Purchase, valuation, and ongoing costs.",
    fields: [
      "currentMarketValue",
      "purchasePrice",
      "purchaseDate",
      "outstandingMortgage",
      "monthlyPayment",
      "interestRate",
      "annualPropertyTax",
      "taxAssessmentValue",
      "annualInsurance",
      "ownershipStatus",
    ] as const,
  },
] as const;

function toEditableStatus(status: Property["status"]): EditableStatus {
  if ((EDITABLE_STATUSES as readonly string[]).includes(status)) {
    return status as EditableStatus;
  }
  return "Vacant";
}

export function propertyToFormDefaults(property: Property): EditPropertyFormData {
  return {
    propertyType: property.type ?? "",
    status: toEditableStatus(property.status),
    propertyName: property.name ?? "",
    addressLine: property.addressLine ?? "",
    addressLine2: property.addressLine2 ?? "",
    city: property.city ?? "",
    province: property.province ?? "",
    zip: property.zip ?? "",
    country: property.country ?? "Cambodia",
    totalArea: property.totalArea ?? "",
    yearBuilt: property.yearBuilt ?? "",
    bedrooms: property.bedrooms ?? "",
    bathrooms: property.bathrooms ?? "",
    parkingSpaces: property.parkingSpaces ?? "",
    storageUnit: property.storageUnit ?? "",
    purchasePrice: property.purchasePrice ?? "",
    purchaseDate: property.purchaseDate
      ? new Date(property.purchaseDate).toISOString().slice(0, 10)
      : "",
    currentMarketValue: property.currentMarketValue?.toString() ?? "",
    outstandingMortgage: property.outstandingMortgage?.toString() ?? "",
    monthlyPayment: property.monthlyPayment?.toString() ?? "",
    interestRate: property.interestRate?.toString() ?? "",
    annualPropertyTax: property.annualPropertyTax?.toString() ?? "",
    taxAssessmentValue: property.taxAssessmentValue?.toString() ?? "",
    annualInsurance: property.annualInsurance?.toString() ?? "",
    ownershipStatus: property.ownershipStatus ?? "",
  };
}
