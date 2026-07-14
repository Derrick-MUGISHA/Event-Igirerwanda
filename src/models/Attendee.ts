import { Schema, model, models, type Model, type Types } from "mongoose";

export const ATTENDEE_TYPES = ["PARTICIPANT", "PLUS_ONE", "GUEST"] as const;
export type AttendeeType = (typeof ATTENDEE_TYPES)[number];

export const COHORTS = ["FRONTEND", "BACKEND"] as const;
export type Cohort = (typeof COHORTS)[number];

export const GENDERS = ["FEMALE", "MALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

/* how a plus-one is connected to the participant who invited them */
export const RELATIONSHIPS = [
  "RELATIVE",
  "FRIEND",
  "COLLEAGUE",
  "PARTNER",
  "MENTOR",
  "OTHER",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

/* PENDING: seeded/created, email not yet verified
   VERIFIED: email confirmed via magic link
   COMPLETE: photo submitted, ticket issued */
export const ATTENDEE_STATUSES = ["PENDING", "VERIFIED", "COMPLETE"] as const;
export type AttendeeStatus = (typeof ATTENDEE_STATUSES)[number];

export interface AttendeeDoc {
  _id: Types.ObjectId;
  event: Types.ObjectId;
  type: AttendeeType;
  fullName: string;
  email: string;
  phone?: string;
  gender?: Gender | null;
  /** job title / role, printed on the business-card style ID */
  position?: string;
  /** for plus-ones: their connection to the inviting participant */
  relationship?: Relationship | null;
  photoUrl?: string;
  cohort?: Cohort | null;
  linkedParticipant?: Types.ObjectId | null;
  addedBy?: Types.ObjectId | null;
  emailVerifiedAt?: Date | null;
  status: AttendeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AttendeeSchema = new Schema<AttendeeDoc>(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    type: { type: String, enum: ATTENDEE_TYPES, required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    gender: { type: String, enum: [...GENDERS, null], default: null },
    position: { type: String, trim: true, default: "" },
    relationship: { type: String, enum: [...RELATIONSHIPS, null], default: null },
    photoUrl: { type: String },
    cohort: { type: String, enum: [...COHORTS, null], default: null },
    linkedParticipant: { type: Schema.Types.ObjectId, ref: "Attendee", default: null },
    addedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    emailVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ATTENDEE_STATUSES, default: "PENDING" },
  },
  { timestamps: true }
);

AttendeeSchema.index({ event: 1, email: 1 }, { unique: true });
/* one plus-one per participant */
AttendeeSchema.index(
  { linkedParticipant: 1 },
  { unique: true, partialFilterExpression: { linkedParticipant: { $type: "objectId" } } }
);

export const Attendee: Model<AttendeeDoc> =
  (models.Attendee as Model<AttendeeDoc>) ?? model<AttendeeDoc>("Attendee", AttendeeSchema);
