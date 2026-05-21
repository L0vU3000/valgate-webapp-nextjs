import { notFound } from "next/navigation";
import { PropertyRentalPage } from "../_components/PropertyRentalPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { computeProgress } from "@/lib/data/derivations/progress";
import { getProgressContext } from "@/lib/data/progress-context";
import { getRentalPageData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, rentalData, progressCtx] = await Promise.all([
    getPropertyByIdParam(id),
    getRentalPageData(id),
    getProgressContext(),
  ]);
  if (!property) notFound();
  const progress = computeProgress(property, progressCtx);
  return <PropertyRentalPage property={property} progress={progress} {...rentalData} />;
}
