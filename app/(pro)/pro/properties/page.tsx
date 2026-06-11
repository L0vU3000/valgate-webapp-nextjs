import { PropertiesRegisterPage } from "./_components/PropertiesRegisterPage";
import { getProPropertiesData } from "../queries";

// /pro/properties — the cross-client Properties register.
//
// Server component: loads every property (mapped to the shared
// ProPropertyRow shape) plus the client list and book-level summary, and
// hands them to the filterable client-side table.

// "Updated 3d ago"-style relative times must use request time, not build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getProPropertiesData();
  return <PropertiesRegisterPage data={data} />;
}
