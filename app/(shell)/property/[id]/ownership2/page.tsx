import { notFound } from "next/navigation";
import { PropertyOwnershipPage2 } from "../_components/PropertyOwnershipPage2";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getOwnershipPageData } from "../ownership/queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyByIdParam(id);
  if (!property) notFound();
  const ownershipData = await getOwnershipPageData(id, property);
  return <PropertyOwnershipPage2 property={property} {...ownershipData} />;
}
