import { Schema, model, models, type Model, type Types } from "mongoose";

export interface OrganizationDoc {
  _id: Types.ObjectId;
  name: string;
  contactEmail: string;
  accessKeyHash: string;
  addedBy?: Types.ObjectId | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<OrganizationDoc>(
  {
    name: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    accessKeyHash: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Organization: Model<OrganizationDoc> =
  (models.Organization as Model<OrganizationDoc>) ??
  model<OrganizationDoc>("Organization", OrganizationSchema);
