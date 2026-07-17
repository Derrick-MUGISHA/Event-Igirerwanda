import { Schema, model, models, type Model, type Types } from "mongoose";

export const NOTIFICATION_KINDS = [
  "CHECK_IN", // ticket accepted at the gate
  "SCAN_ALERT", // already-used / revoked / expired / invalid attempts
  "GUEST_ADDED", // an admin issued a guest ticket
  "SYSTEM",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_SEVERITIES = ["info", "success", "warning", "error"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

/* Real, persisted admin notifications: created by gate/guest activity,
   streamed live over SSE and listed in the header bell. Read state is
   global — the operations team shares one inbox. */
export interface NotificationDoc {
  _id: Types.ObjectId;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
  event?: Types.ObjectId | null;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDoc>(
  {
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    severity: { type: String, enum: NOTIFICATION_SEVERITIES, default: "info" },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    event: { type: Schema.Types.ObjectId, ref: "Event", default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ readAt: 1 });
/* Scan alerts carry attendee names/events — don't retain that PII forever.
   Mongo TTL sweeps notifications 90 days after creation. */
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Notification: Model<NotificationDoc> =
  (models.Notification as Model<NotificationDoc>) ??
  model<NotificationDoc>("Notification", NotificationSchema);
