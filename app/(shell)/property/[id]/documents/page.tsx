import { notFound } from "next/navigation";
import { PropertyDocumentsPage } from "../_components/PropertyDocumentsPage";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getDocumentsPageData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, documentsData] = await Promise.all([
    getPropertyByIdParam(id),
    getDocumentsPageData(id),
  ]);
  if (!property) notFound();
  return <PropertyDocumentsPage property={property} {...documentsData} />;
}
