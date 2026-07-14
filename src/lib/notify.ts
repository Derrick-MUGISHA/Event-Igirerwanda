import { Notification, type NotificationKind, type NotificationSeverity } from "@/models";
import { publishNotification } from "./scanBus";
import type { Types } from "mongoose";

/* Persist a notification and push it to every connected admin in one call.
   Failures are swallowed — a notification must never break the action that
   triggered it. */
export async function notifyAdmins(input: {
  kind: NotificationKind;
  severity?: NotificationSeverity;
  title: string;
  body?: string;
  eventId?: Types.ObjectId | string | null;
}) {
  try {
    const doc = await Notification.create({
      kind: input.kind,
      severity: input.severity ?? "info",
      title: input.title,
      body: input.body ?? "",
      event: input.eventId ?? null,
    });
    publishNotification({
      id: doc._id.toString(),
      kind: doc.kind,
      severity: doc.severity,
      title: doc.title,
      body: doc.body,
      at: doc.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("notification failed", err);
  }
}
