import { ProfilePage } from "./_components/ProfilePage";
import { getProfilePageData } from "./queries";

export default async function Page() {
  const data = await getProfilePageData();
  return <ProfilePage data={data} />;
}
