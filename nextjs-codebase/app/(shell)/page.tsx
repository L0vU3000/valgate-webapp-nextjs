import { HomePage } from "./_components/HomePage";
import { getProperties } from "@/lib/data/properties";

export default async function Page() {
  const initialProperties = await getProperties();
  return <HomePage initialProperties={initialProperties} />;
}
