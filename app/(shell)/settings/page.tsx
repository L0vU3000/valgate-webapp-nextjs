import { headers } from "next/headers";
import { SettingsPage } from "./_components/SettingsPage";
import { getSettingsPageData } from "./queries";
import { getProfilePageData } from "../profile/queries";
import { getAppOrigin } from "@/lib/app-origin";

// The Valgate MCP endpoint users paste into Claude. It MUST be the exact origin the
// user is currently on (preview vs prod vs localhost), so we read it from the live
// request host rather than a build-time constant. `getAppOrigin()` is only a fallback
// for the rare case where the host header is missing.
async function getMcpUrl(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) {
    return `${getAppOrigin()}/mcp`;
  }
  // Behind Vercel/proxies the real scheme arrives in x-forwarded-proto. Locally it's
  // usually absent, so fall back to http for localhost and https everywhere else.
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}/mcp`;
}

export default async function Page() {
  const [data, profileData, mcpUrl] = await Promise.all([
    getSettingsPageData(),
    getProfilePageData(),
    getMcpUrl(),
  ]);
  return <SettingsPage data={data} mcpUrl={mcpUrl} profileData={profileData} />;
}
