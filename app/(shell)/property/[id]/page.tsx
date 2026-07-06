import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orgId?: string }>;
};

export default async function PropertyIndexPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { orgId } = await searchParams;
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
  redirect(`/property/${id}/overview${query}`);
}
