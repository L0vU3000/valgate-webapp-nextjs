import { SettingsPage } from "./_components/SettingsPage";
import { getSettingsPageData } from "./queries";
import { getProfilePageData } from "../profile/queries";

export default async function Page() {
  const [data, profileData] = await Promise.all([
    getSettingsPageData(),
    getProfilePageData(),
  ]);
  return <SettingsPage data={data} profileData={profileData} />;
}
