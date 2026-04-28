import { SettingsPage } from "./_components/SettingsPage";
import { getSettingsPageData } from "./queries";

export default async function Page() {
  const data = await getSettingsPageData();
  return <SettingsPage data={data} />;
}
