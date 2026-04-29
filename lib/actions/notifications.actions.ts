"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/notifications";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Notification } from "@/lib/data/types/notification";
import type { ActionResult } from "./properties.actions";

export async function createNotification(
  data: db.NewNotification,
): Promise<ActionResult<Notification>> {
  const userId = getCurrentUserId();
  const notification = await db.create(userId, data);
  revalidateTag("notifications");
  return { ok: true, data: notification };
}

export async function updateNotification(
  id: string,
  patch: Partial<Notification>,
): Promise<ActionResult<Notification>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Notification not found" };
  revalidateTag("notifications");
  return { ok: true, data: updated };
}

export async function deleteNotification(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("notifications");
  return { ok: true, data: undefined };
}

export async function markRead(id: string): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.update(userId, id, { read: true } as Partial<Notification>);
  revalidateTag("notifications");
  return { ok: true, data: undefined };
}

export async function markAllRead(): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  const all = await db.list(userId);
  for (const n of all.filter((n) => !n.read)) {
    await db.update(userId, n.id, { read: true } as Partial<Notification>);
  }
  revalidateTag("notifications");
  return { ok: true, data: undefined };
}
