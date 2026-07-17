import { Schema, model, models, type Model, type Types } from "mongoose";

/* single staff admin role — Mini Admin was removed */
export const ADMIN_ROLES = ["ADMIN"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AdminDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  createdBy?: Types.ObjectId | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<AdminDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ADMIN_ROLES, default: "ADMIN" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Admin: Model<AdminDoc> =
  (models.Admin as Model<AdminDoc>) ?? model<AdminDoc>("Admin", AdminSchema);
