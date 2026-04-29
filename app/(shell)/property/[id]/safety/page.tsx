import { notFound } from "next/navigation";
import { PropertySafetyPage } from "../_components/PropertySafetyPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getSafetyPageData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, safetyData] = await Promise.all([
    getPropertyByIdParam(id),
    getSafetyPageData(id),
  ]);
  if (!property) notFound();
  return <PropertySafetyPage property={property} {...safetyData} />;
}
