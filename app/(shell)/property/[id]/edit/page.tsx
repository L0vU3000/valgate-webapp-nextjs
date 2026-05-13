import { notFound } from "next/navigation";
import { getPropertyByIdParam } from "@/lib/data/properties";
import type { Property } from "@/lib/data/types/property";
import { EditPropertyForm } from "./EditPropertyForm";

const EDITABLE_STATUSES = ["Rented", "Vacant", "For Sale", "Sold"] as const;
type EditableStatus = (typeof EDITABLE_STATUSES)[number];

function toEditableStatus(status: Property["status"]): EditableStatus {
  if ((EDITABLE_STATUSES as readonly string[]).includes(status)) {
    return status as EditableStatus;
  }
  return "Vacant";
}

function propertyToFormDefaults(p: Property) {
  return {
    propertyType: p.type ?? "",
    status: toEditableStatus(p.status),
    propertyName: p.name ?? "",
    addressLine: p.addressLine ?? "",
    addressLine2: p.addressLine2 ?? "",
    city: p.city ?? "",
    province: p.province ?? "",
    zip: p.zip ?? "",
    country: p.country ?? "Cambodia",
    totalArea: p.totalArea ?? "",
    yearBuilt: p.yearBuilt ?? "",
    bedrooms: p.bedrooms ?? "",
    bathrooms: p.bathrooms ?? "",
    parkingSpaces: p.parkingSpaces ?? "",
    storageUnit: p.storageUnit ?? "",
    purchasePrice: p.purchasePrice ?? "",
    purchaseDate: p.purchaseDate
      ? new Date(p.purchaseDate).toISOString().slice(0, 10)
      : "",
    currentMarketValue: p.currentMarketValue?.toString() ?? "",
    outstandingMortgage: p.outstandingMortgage?.toString() ?? "",
    monthlyPayment: p.monthlyPayment?.toString() ?? "",
    interestRate: p.interestRate?.toString() ?? "",
    annualPropertyTax: p.annualPropertyTax?.toString() ?? "",
    taxAssessmentValue: p.taxAssessmentValue?.toString() ?? "",
    annualInsurance: p.annualInsurance?.toString() ?? "",
    ownershipStatus: p.ownershipStatus ?? "",
  };
}

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyByIdParam(id);
  if (!property) notFound();
  const defaults = propertyToFormDefaults(property);
  return <EditPropertyForm property={property} defaults={defaults} />;
}
