import { notFound } from "next/navigation";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { propertyToFormDefaults } from "@/lib/property-form";
import { EditPropertyForm } from "./EditPropertyForm";

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
