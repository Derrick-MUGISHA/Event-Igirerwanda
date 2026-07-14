import { Schema, model, models, type Model, type Types } from "mongoose";

export const TICKET_STATUSES = ["VALID", "USED", "REVOKED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface TicketDoc {
  _id: Types.ObjectId;
  code: string;
  event: Types.ObjectId;
  attendee: Types.ObjectId;
  status: TicketStatus;
  issuedAt: Date;
  scannedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<TicketDoc>(
  {
    code: { type: String, required: true, unique: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    attendee: { type: Schema.Types.ObjectId, ref: "Attendee", required: true, unique: true },
    status: { type: String, enum: TICKET_STATUSES, default: "VALID" },
    issuedAt: { type: Date, default: () => new Date() },
    scannedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Ticket: Model<TicketDoc> =
  (models.Ticket as Model<TicketDoc>) ?? model<TicketDoc>("Ticket", TicketSchema);
