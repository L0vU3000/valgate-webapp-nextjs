import { notFound } from "next/navigation";
import { PropertyShellProvider } from "@/components/property/PropertyShellContext";
import { getPropertyByIdParam } from "@/lib/data/properties";
import { computeProgressDetails } from "@/lib/data/derivations/progress";
import { getProgressContext } from "@/lib/data/progress-context";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, progressCtx] = await Promise.all([
    getPropertyByIdParam(id),
    getProgressContext(),
  ]);
  if (!property) notFound();

  const progressDetails = computeProgressDetails(property, progressCtx);

  return (
    <PropertyShellProvider property={property} progressDetails={progressDetails}>
      {children}
    </PropertyShellProvider>
  );
}
