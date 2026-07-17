import { Schema, model, models, type Model, type Types } from "mongoose";

export const SCAN_RESULTS = ["ACCEPTED", "ALREADY_USED", "INVALID", "REVOKED", "EXPIRED"] as const;
export type ScanResult = (typeof SCAN_RESULTS)[number];

export interface ScanLogDoc {
  _id: Types.ObjectId;
  ticket?: Types.ObjectId | null;
  scannedByAdmin?: Types.ObjectId | null;
  scannedByScanner?: Types.ObjectId | null;
  result: ScanResult;
  at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScanLogSchema = new Schema<ScanLogDoc>(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", default: null },
    scannedByAdmin: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    scannedByScanner: { type: Schema.Types.ObjectId, ref: "Scanner", default: null },
    result: { type: String, enum: SCAN_RESULTS, required: true },
    at: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

/* the dashboard aggregates ACCEPTED scans by time window — index the pair it
   filters and buckets on so those queries stay off a collection scan */
ScanLogSchema.index({ result: 1, createdAt: 1 });

export const ScanLog: Model<ScanLogDoc> =
  (models.ScanLog as Model<ScanLogDoc>) ?? model<ScanLogDoc>("ScanLog", ScanLogSchema);
