import { notFound } from "next/navigation";
import { PropertyOverviewPage } from "../_components/PropertyOverviewPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getOverviewPageData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, overviewData] = await Promise.all([
    getPropertyByIdParam(id),
    getOverviewPageData(id),
  ]);
  if (!property) notFound();
  return <PropertyOverviewPage property={property} {...overviewData} />;
}
