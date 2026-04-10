import { notFound } from "next/navigation";
import { PropertyValuationPage } from "../_components/PropertyValuationPage";
import { getPropertyByIdParam } from "@/lib/data/properties";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyByIdParam(id);
  if (!property) notFound();
  return <PropertyValuationPage property={property} />;
}
