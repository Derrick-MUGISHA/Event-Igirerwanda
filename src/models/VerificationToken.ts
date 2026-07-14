import { Schema, model, models, type Model, type Types } from "mongoose";

export const TOKEN_PURPOSES = ["LOGIN", "PLUS_ONE_INVITE"] as const;
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

export interface VerificationTokenDoc {
  _id: Types.ObjectId;
  tokenHash: string;
  purpose: TokenPurpose;
  email?: string;
  attendee: Types.ObjectId;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationTokenSchema = new Schema<VerificationTokenDoc>(
  {
    tokenHash: { type: String, required: true, unique: true },
    purpose: { type: String, enum: TOKEN_PURPOSES, required: true },
    email: { type: String, lowercase: true, trim: true },
    /* LOGIN: the attendee logging in; PLUS_ONE_INVITE: the inviting participant */
    attendee: { type: Schema.Types.ObjectId, ref: "Attendee", required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/* Mongo TTL cleanup once expired */
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationToken: Model<VerificationTokenDoc> =
  (models.VerificationToken as Model<VerificationTokenDoc>) ??
  model<VerificationTokenDoc>("VerificationToken", VerificationTokenSchema);
