import { Schema, model, models, type Model, type Types } from "mongoose";

/* the kind of guest — drives badge styling and gate priority */
export const GUEST_TYPES = [
  "VIP",
  "SPEAKER",
  "SPONSOR",
  "MEDIA",
  "PARTNER",
  "PLUS_ONE",
  "GENERAL",
] as const;
export type GuestType = (typeof GUEST_TYPES)[number];

export interface GuestDoc {
  /** 1. id of the guest */
  _id: Types.ObjectId;
  /** 2. id of the event attending */
  event: Types.ObjectId;
  /** 3. name */
  name: string;
  /** 4. profile (picture — Cloudinary URL) */
  profile?: string | null;
  /** 5. email */
  email: string;
  /** 6. type of guest */
  guestType: GuestType;
  /** 7. ticket id */
  ticket?: Types.ObjectId | null;
  /** inviter — the participant who invited this guest (null for org-invited VIPs) */
  inviter?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const GuestSchema = new Schema<GuestDoc>(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    name: { type: String, required: true, trim: true },
    profile: { type: String, default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    guestType: { type: String, enum: GUEST_TYPES, default: "GENERAL" },
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", default: null },
    inviter: { type: Schema.Types.ObjectId, ref: "Participant", default: null },
  },
  { timestamps: true }
);

/* one guest record per email per event */
GuestSchema.index({ event: 1, email: 1 }, { unique: true });
/* a participant can only invite a single plus-one guest */
GuestSchema.index(
  { inviter: 1 },
  { unique: true, partialFilterExpression: { inviter: { $type: "objectId" } } }
);

export const Guest: Model<GuestDoc> =
  (models.Guest as Model<GuestDoc>) ?? model<GuestDoc>("Guest", GuestSchema);
