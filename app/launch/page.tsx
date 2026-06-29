import { redirect } from "next/navigation";
import { requireCtx } from "@/lib/auth/ctx";
import { getIsManager } from "@/lib/services/managers";

// /launch is the post-auth landing decider: managers go to the Pro cockpit,
// owners go to their portfolio map. This avoids baking role logic into the
// sign-in/up finalize callbacks, which can't read the DB.
//
// What could go wrong: requireCtx throws "unauthenticated" if the session
// cookie isn't present yet — in practice Clerk finalize() sets the cookie
// before redirecting here, so this is only reachable by authenticated users.
export default async function LaunchPage() {
  const ctx = await requireCtx();
  const isManager = await getIsManager(ctx);

  if (isManager) {
    redirect("/pro/dashboard");
  } else {
    redirect("/");
  }
}
