import { Schema, model, models, type Model, type Types } from "mongoose";

export const SCAN_RESULTS = ["ACCEPTED", "ALREADY_USED", "INVALID", "REVOKED"] as const;
export type ScanResult = (typeof SCAN_RESULTS)[number];

export interface ScanLogDoc {
  _id: Types.ObjectId;
  ticket?: Types.ObjectId | null;
  scannedByAdmin?: Types.ObjectId | null;
  scannedByOrg?: Types.ObjectId | null;
  result: ScanResult;
  at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScanLogSchema = new Schema<ScanLogDoc>(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", default: null },
    scannedByAdmin: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    scannedByOrg: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    result: { type: String, enum: SCAN_RESULTS, required: true },
    at: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export const ScanLog: Model<ScanLogDoc> =
  (models.ScanLog as Model<ScanLogDoc>) ?? model<ScanLogDoc>("ScanLog", ScanLogSchema);
