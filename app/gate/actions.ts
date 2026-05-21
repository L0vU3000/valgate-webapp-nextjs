"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SITE_ACCESS_COOKIE_NAME,
  deriveSiteAccessToken,
  getSiteAccessCookieOptions,
  isSiteGateEnabled,
  sanitizeRedirectPath,
} from "@/lib/site-gate";

export type GateFormState = {
  error?: string;
};

export async function verifySitePassword(
  _prevState: GateFormState,
  formData: FormData,
): Promise<GateFormState> {
  const password = formData.get("password");
  const from = sanitizeRedirectPath(String(formData.get("from") ?? "/"));

  if (!isSiteGateEnabled()) {
    redirect(from);
  }

  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    redirect(from);
  }

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Password is required" };
  }

  if (password !== sitePassword) {
    return { error: "Incorrect password" };
  }

  const token = await deriveSiteAccessToken(sitePassword);
  const cookieStore = await cookies();
  cookieStore.set(SITE_ACCESS_COOKIE_NAME, token, getSiteAccessCookieOptions());

  redirect(from);
}
