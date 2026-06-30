import type { NextRequest } from "next/server";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { handleBounce } from "@/lib/services/client-onboarding";

// Resend delivers bounce/delivery events via Svix-signed webhooks.
// Always return 2xx after handling so Resend does not retry endlessly.
export async function POST(req: NextRequest) {
  if (!env.RESEND_WEBHOOK_SECRET) {
    log.warn("resend.webhook.missing_secret");
    return new Response("webhook not configured", { status: 503 });
  }

  const payload = await req.text();

  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return new Response("missing svix headers", { status: 400 });
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    const resend = new Resend(env.RESEND_API_KEY ?? "re_unused");
    const verified = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });
    event = {
      type: verified.type,
      data: verified.data as unknown as Record<string, unknown>,
    };
  } catch (err) {
    log.warn("resend.webhook.bad_signature", {
      error: err instanceof Error ? err.name : "unknown",
    });
    return new Response("bad signature", { status: 400 });
  }

  if (event.type === "email.bounced") {
    const to = extractRecipientEmail(event.data);
    const bounceType =
      typeof event.data.bounce_type === "string" ? event.data.bounce_type : "unknown";

    if (to) {
      await handleBounce(to, bounceType);
    } else {
      log.warn("resend.webhook.bounce_missing_email", { eventType: event.type });
    }
  }

  return new Response("ok", { status: 200 });
}

function extractRecipientEmail(data: Record<string, unknown>): string | null {
  if (typeof data.to === "string") return data.to;
  if (Array.isArray(data.to) && typeof data.to[0] === "string") return data.to[0];
  return null;
}
