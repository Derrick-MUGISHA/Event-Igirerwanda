import { Schema, model, models, type Model } from "mongoose";

/* Atomic named counters — used to mint monotonically increasing, unique
   human-readable references (e.g. per-event ticket numbers) without races. */
export interface CounterDoc {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<CounterDoc>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter: Model<CounterDoc> =
  (models.Counter as Model<CounterDoc>) ?? model<CounterDoc>("Counter", CounterSchema);

/* returns the next value for a named sequence, creating it at 1 on first use */
export async function nextSequence(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}
