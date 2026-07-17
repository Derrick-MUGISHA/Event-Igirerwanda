import { Schema, model, models, type Model, type Types } from "mongoose";

/* One recorded health check for a single service. Written opportunistically
   whenever the status page polls /api/admin/health, and rolled up into the
   uptime bars. Auto-expires after ~95 days so the collection stays small. */
export interface HealthSampleDoc {
  _id: Types.ObjectId;
  service: string;
  ok: boolean;
  ms: number;
  at: Date;
}

const HealthSampleSchema = new Schema<HealthSampleDoc>({
  service: { type: String, required: true },
  ok: { type: Boolean, required: true },
  ms: { type: Number, default: 0 },
  at: { type: Date, default: () => new Date() },
});

/* index for per-service time-range rollups + TTL cleanup */
HealthSampleSchema.index({ service: 1, at: -1 });
HealthSampleSchema.index({ at: 1 }, { expireAfterSeconds: 95 * 24 * 60 * 60 });

export const HealthSample: Model<HealthSampleDoc> =
  (models.HealthSample as Model<HealthSampleDoc>) ??
  model<HealthSampleDoc>("HealthSample", HealthSampleSchema);
