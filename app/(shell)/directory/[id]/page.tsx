import { notFound } from "next/navigation";
import { ProfessionalProfilePage } from "./_components/ProfessionalProfilePage";
import { getProfessionalProfileData } from "./queries";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProfessionalProfileData(id);
  if (!data) notFound();
  return <ProfessionalProfilePage data={data} />;
}
