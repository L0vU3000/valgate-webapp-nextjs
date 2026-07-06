import { redirect } from "next/navigation";

// The standalone profile page has been folded into the Account group of
// /settings. Keep this route as a permanent redirect so existing links and
// bookmarks land on the Profile section rather than 404-ing.
export default function Page() {
  redirect("/settings?section=profile");
}
