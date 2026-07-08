import { notFound } from "next/navigation";
import { getClientPortfolioData } from "@/app/(pro)/pro/queries";
import { AssetsTable } from "@/app/(pro)/pro/dashboard/_components/AssetsTable";

// Properties section of the manager's client workspace — the Dashboard's
// AssetsTable scoped to this one client. Manager cockpit view (not the client's
// owner view, which lives behind "View as client"). Reuses getClientPortfolioData.

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { clientId } = await params;
  const data = await getClientPortfolioData(clientId);
  if (!data) {
    notFound();
  }

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <AssetsTable properties={data.properties} />
      </div>
    </main>
  );
}
