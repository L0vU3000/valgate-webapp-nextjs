import { redirect } from "next/navigation";

// /pro/add-account — folded into the unified Add Client modal (Phase 1).
// Redirect kept so existing bookmarks, notification deep-links, and
// in-app links (Account Switcher, Dashboard) still resolve.
export default function Page() {
  redirect("/pro/clients?add=connect");
}
