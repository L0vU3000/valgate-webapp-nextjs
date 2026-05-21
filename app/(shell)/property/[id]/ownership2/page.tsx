import { notFound } from "next/navigation";
<<<<<<<< HEAD:app/(shell)/property/[id]/location/page.tsx
import { PropertyLocationPage } from "../_components/PropertyLocationPage";
========
import { PropertyOwnershipPage2 } from "../_components/PropertyOwnershipPage2";
>>>>>>>> valgate-local-db:app/(shell)/property/[id]/ownership2/page.tsx
import { getPropertyByIdParam } from "@/lib/data/properties";
import { getOwnershipPageData } from "../ownership/queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyByIdParam(id);
  if (!property) notFound();
<<<<<<<< HEAD:app/(shell)/property/[id]/location/page.tsx
  return <PropertyLocationPage property={property} />;
========
  const ownershipData = await getOwnershipPageData(id, property);
  return <PropertyOwnershipPage2 property={property} {...ownershipData} />;
>>>>>>>> valgate-local-db:app/(shell)/property/[id]/ownership2/page.tsx
}
