import { Schema, model, models, type Model, type Types } from "mongoose";
import { GENDERS, type Gender } from "./Participant";

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

/* how a plus-one relates to the participant who invited them — collected on
   the dashboard and shown back to the inviting participant */
export const RELATIONSHIPS = [
  "RELATIVE",
  "FRIEND",
  "COLLEAGUE",
  "PARTNER",
  "MENTOR",
  "OTHER",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

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
  /** gender — collected when a participant fills in their plus-one's details */
  gender?: Gender | null;
  /** relationship to the inviting participant (plus-ones only) */
  relationship?: Relationship | null;
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
    gender: { type: String, enum: [...GENDERS, null], default: null },
    relationship: { type: String, enum: [...RELATIONSHIPS, null], default: null },
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
