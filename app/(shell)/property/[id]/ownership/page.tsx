import { notFound } from "next/navigation";
import { PropertyOwnershipPage } from "../_components/PropertyOwnershipPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getOwnershipPageData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyByIdParam(id);
  if (!property) notFound();
  const ownershipData = await getOwnershipPageData(id, property);
  return <PropertyOwnershipPage property={property} {...ownershipData} />;
}
