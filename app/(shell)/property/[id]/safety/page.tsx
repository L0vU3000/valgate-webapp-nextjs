import { notFound } from "next/navigation";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { PropertySafetyPage } from "@/app/(shell)/property/[id]/_components/PropertySafetyPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyByIdParam(id);
  if (!property) notFound();

  return <PropertySafetyPage property={property} />;
}
