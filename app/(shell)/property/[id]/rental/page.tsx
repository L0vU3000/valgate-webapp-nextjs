import { notFound } from "next/navigation";
import { PropertyRentalPage } from "../_components/PropertyRentalPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getRentalPageData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, rentalData] = await Promise.all([
    getPropertyByIdParam(id),
    getRentalPageData(id),
  ]);
  if (!property) notFound();
  return <PropertyRentalPage property={property} {...rentalData} />;
}
