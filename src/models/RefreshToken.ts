import { Schema, model, models, type Model, type Types } from "mongoose";

/* Rotating refresh tokens for participant sessions. The raw token lives only
   in the participant's httpOnly cookie; we store its SHA-256 hash. On refresh
   the current token is marked used and a new one issued (replacedBy chains the
   rotation, so reuse of an already-rotated token can be detected). */
export interface RefreshTokenDoc {
  _id: Types.ObjectId;
  tokenHash: string;
  participant: Types.ObjectId;
  expiresAt: Date;
  usedAt?: Date | null;
  replacedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<RefreshTokenDoc>(
  {
    tokenHash: { type: String, required: true, unique: true },
    participant: { type: Schema.Types.ObjectId, ref: "Participant", required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    replacedBy: { type: String, default: null },
  },
  { timestamps: true }
);

/* Mongo TTL cleanup once expired */
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<RefreshTokenDoc> =
  (models.RefreshToken as Model<RefreshTokenDoc>) ??
  model<RefreshTokenDoc>("RefreshToken", RefreshTokenSchema);
