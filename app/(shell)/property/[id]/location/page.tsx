import { notFound } from "next/navigation";
import { PropertyLocationPage } from "../_components/PropertyLocationPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getLocationPageData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, locationData] = await Promise.all([
    getPropertyByIdParam(id),
    getLocationPageData(id),
  ]);
  if (!property) notFound();
  return <PropertyLocationPage property={property} {...locationData} />;
}
