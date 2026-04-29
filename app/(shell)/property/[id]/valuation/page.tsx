import { notFound } from "next/navigation";
import { PropertyValuationPage } from "../_components/PropertyValuationPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getValuationPageData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, valuationData] = await Promise.all([
    getPropertyByIdParam(id),
    getValuationPageData(id),
  ]);
  if (!property) notFound();
  return <PropertyValuationPage property={property} {...valuationData} />;
}
