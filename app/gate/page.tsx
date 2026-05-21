import { GatePage } from "./_components/GatePage";
import { sanitizeRedirectPath } from "@/lib/site-gate";

type GatePageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function Page({ searchParams }: GatePageProps) {
  const { from } = await searchParams;
  return <GatePage from={sanitizeRedirectPath(from)} />;
}
