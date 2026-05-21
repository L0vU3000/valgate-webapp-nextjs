import { notFound } from "next/navigation";
import { PropertyFinancialsPage } from "../_components/PropertyFinancialsPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getFinancialsPageData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, financialsData] = await Promise.all([
    getPropertyByIdParam(id),
    getFinancialsPageData(id),
  ]);
  if (!property) notFound();
  return <PropertyFinancialsPage property={property} {...financialsData} />;
}
